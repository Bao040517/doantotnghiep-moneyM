package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.SavePayeeRequest;
import com.example.sharemoney.dto.response.PayeeResponse;
import com.example.sharemoney.entity.GroupMember;
import com.example.sharemoney.entity.Payee;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.PayeeRepository;
import com.example.sharemoney.repository.UserRepository;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PayeeService {

    private final PayeeRepository payeeRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    // ─────────────────────────────────────────────────────────────
    // 1. Lấy danh sách đã lưu (sắp xếp mới nhất trước)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PayeeResponse> getPayees(UUID userId) {
        return payeeRepository
                .findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(p -> toResponse(p, "saved"))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Danh sách gợi ý thông minh: Saved + Bạn bè trong nhóm
    //    Dedup theo bankAccount — tránh hiển thị trùng
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<PayeeResponse> getSuggestions(UUID userId) {
        Map<String, PayeeResponse> resultMap = new LinkedHashMap<>();

        // Nguồn 1: Danh bạ đã lưu (ưu tiên cao hơn)
        payeeRepository
                .findByUser_IdOrderByCreatedAtDesc(userId)
                .forEach(p -> {
                    if (p.getBankAccount() != null) {
                        resultMap.put(p.getBankAccount(), toResponse(p, "saved"));
                    }
                });

        // Nguồn 2: Bạn bè trong nhóm có STK ngân hàng (chỉ thêm nếu chưa có trong Nguồn 1)
        List<GroupMember> myGroups = groupMemberRepository.findByUser_Id(userId);
        Set<UUID> processedGroupIds = new HashSet<>();

        for (GroupMember myMembership : myGroups) {
            UUID groupId = myMembership.getGroup().getId();
            if (processedGroupIds.contains(groupId)) continue;
            processedGroupIds.add(groupId);

            List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
            for (GroupMember member : members) {
                User u = member.getUser();
                // Bỏ qua chính mình và những người không có STK
                if (u.getId().equals(userId) || u.getBankAccountNo() == null
                        || u.getBankAccountNo().isBlank()) {
                    continue;
                }
                // Chỉ thêm nếu STK chưa có trong Nguồn 1
                resultMap.putIfAbsent(
                        u.getBankAccountNo(),
                        PayeeResponse.builder()
                                .id(null) // Không có id trong payees table
                                .name(u.getName())
                                .bankBin(u.getBankBin())
                                .bankAccount(u.getBankAccountNo())
                                .accountName(null)
                                .source("group_member")
                                .build());
            }
        }

        return new ArrayList<>(resultMap.values());
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Upsert người nhận (tránh duplicate theo bankAccount)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public PayeeResponse saveOrUpdate(UUID userId, SavePayeeRequest req) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Upsert: nếu STK đã tồn tại → cập nhật tên/ngân hàng; nếu chưa → tạo mới
        Payee payee = payeeRepository
                .findByUser_IdAndBankAccount(userId, req.getBankAccount().trim())
                .orElse(Payee.builder().user(user).bankAccount(req.getBankAccount().trim()).build());

        payee.setName(req.getName().trim());
        payee.setBankBin(req.getBankBin() != null ? req.getBankBin().trim() : null);
        payee.setBankName(req.getBankName() != null ? req.getBankName().trim() : null);
        payee.setAccountName(req.getAccountName() != null ? req.getAccountName().trim() : null);
        payee.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);

        Payee saved = payeeRepository.save(payee);
        return toResponse(saved, "saved");
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Xóa người nhận (kiểm tra quyền sở hữu)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void delete(UUID userId, UUID payeeId) {
        Payee payee = payeeRepository
                .findById(payeeId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYEE_NOT_FOUND));
        if (!payee.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        payeeRepository.delete(payee);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: Map entity → DTO
    // ─────────────────────────────────────────────────────────────
    private PayeeResponse toResponse(Payee p, String source) {
        return PayeeResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .bankBin(p.getBankBin())
                .bankName(p.getBankName())
                .bankAccount(p.getBankAccount())
                .accountName(p.getAccountName())
                .phone(p.getPhone())
                .createdAt(p.getCreatedAt())
                .source(source)
                .build();
    }
}
