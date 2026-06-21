package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.CreateExpenseRequest;
import com.example.sharemoney.dto.request.UpdateExpenseRequest;
import com.example.sharemoney.dto.response.ExpenseDetailResponse;
import com.example.sharemoney.dto.response.ExpenseResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.Expense;
import com.example.sharemoney.entity.ExpenseSplit;
import com.example.sharemoney.entity.Group;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.ExpenseRepository;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.GroupRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.entity.Transaction;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // ─────────────────────────────────────────────────────────────
    // Tạo khoản chi + tự động chia tiền (equal split)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public ExpenseDetailResponse createExpense(UUID groupId, CreateExpenseRequest req, UUID requestUserId) {
        Group group = groupRepository
                .findById(groupId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        // Validate: người gọi phải là thành viên nhóm
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, requestUserId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        User payer = userRepository
                .findById(req.getPaidBy())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Validate: payer phải là thành viên nhóm
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, payer.getId())) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        // Tự động phân bổ cho tất cả thành viên nếu mảng rỗng
        List<UUID> targetSplitUserIds = req.getSplitUserIds();
        if (targetSplitUserIds == null || targetSplitUserIds.isEmpty()) {
            targetSplitUserIds = groupMemberRepository.findByGroup_Id(groupId).stream()
                    .map(gm -> gm.getUser().getId())
                    .filter(id -> !id.equals(payer.getId()))
                    .collect(java.util.stream.Collectors.toList());
        }

        // Validate: tất cả splitUserIds phải là thành viên nhóm
        List<User> splitUsers = resolveMembersInGroup(targetSplitUserIds, groupId);

        // Tạo Expense
        Expense expense = Expense.builder()
                .group(group)
                .payer(payer)
                .title(req.getTitle())
                .amount(req.getAmount())
                .category(req.getCategory())
                .build();

        // Tính splits và gắn vào expense
        List<ExpenseSplit> splits = calculateSplits(expense, splitUsers, req.getAmount());
        expense.getSplits().addAll(splits);

        expenseRepository.save(expense); // cascade saves splits

        // Xử lý liên kết với Transaction có sẵn (Logic 2)
        if (req.getLinkedTransactionId() != null) {
            Transaction tx = transactionRepository.findById(req.getLinkedTransactionId())
                    .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
            // Kiểm tra bảo mật
            if (!tx.getWallet().getUser().getId().equals(payer.getId())) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            tx.setLinkedExpenseId(expense.getId());
            transactionRepository.save(tx);
        } else {
            // Chỉ publish event cho PFM nếu KHÔNG phải khoản chi liên kết
            eventPublisher.publishEvent(new com.example.sharemoney.event.ExpenseCreatedEvent(
                    expense.getId(), payer.getId(), req.getAmount(), req.getTitle(), req.getCategory()));
        }

        return toDetailResponse(expense);
    }

    // ─────────────────────────────────────────────────────────────
    // Danh sách khoản chi của nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<ExpenseResponse> getGroupExpenses(UUID groupId, UUID userId) {
        groupRepository
                .findById(groupId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        List<Expense> expenses = new ArrayList<>(expenseRepository.findByGroup_IdOrderByCreatedAtDesc(groupId));
        expenses.sort((e1, e2) -> {
            java.time.LocalDateTime t1 = e1.getCreatedAt() != null ? e1.getCreatedAt() : java.time.LocalDateTime.MIN;
            java.time.LocalDateTime t2 = e2.getCreatedAt() != null ? e2.getCreatedAt() : java.time.LocalDateTime.MIN;
            return t2.compareTo(t1);
        });

        return expenses.stream()
                .map(this::toListResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Export khoản chi ra CSV
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public byte[] exportGroupExpensesToCsv(UUID groupId, UUID userId) {
        groupRepository
                .findById(groupId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        List<Expense> expenses = new ArrayList<>(expenseRepository.findByGroup_IdOrderByCreatedAtDesc(groupId));
        expenses.sort((e1, e2) -> {
            java.time.LocalDateTime t1 = e1.getCreatedAt() != null ? e1.getCreatedAt() : java.time.LocalDateTime.MIN;
            java.time.LocalDateTime t2 = e2.getCreatedAt() != null ? e2.getCreatedAt() : java.time.LocalDateTime.MIN;
            return t2.compareTo(t1);
        });

        StringBuilder sb = new StringBuilder();
        // Thêm UTF-8 BOM để Excel có thể đọc tiếng Việt đúng cách
        sb.append('\ufeff');
        sb.append("ID,Ngày tạo,Danh mục,Tiêu đề,Người trả,Số tiền\n");

        for (Expense e : expenses) {
            sb.append(e.getId()).append(",");
            sb.append(e.getCreatedAt() != null ? e.getCreatedAt().toString() : "").append(",");
            sb.append("\"").append((e.getCategory() != null ? e.getCategory() : "").replace("\"", "\"\""))
                    .append("\",");
            sb.append("\"").append((e.getTitle() != null ? e.getTitle() : "").replace("\"", "\"\"")).append("\",");
            sb.append("\"")
                    .append((e.getPayer() != null && e.getPayer().getName() != null ? e.getPayer().getName() : "")
                            .replace("\"", "\"\""))
                    .append("\",");
            sb.append(e.getAmount() != null ? e.getAmount().toString() : "0").append("\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ─────────────────────────────────────────────────────────────
    // Chi tiết 1 khoản chi
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public ExpenseDetailResponse getExpenseDetail(UUID groupId, UUID expenseId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        Expense expense = expenseRepository
                .findById(expenseId)
                .orElseThrow(() -> new AppException(ErrorCode.EXPENSE_NOT_FOUND));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new AppException(ErrorCode.EXPENSE_NOT_FOUND);
        }

        return toDetailResponse(expense);
    }

    // ─────────────────────────────────────────────────────────────
    // Cập nhật khoản chi: xoá splits cũ → tạo lại
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public ExpenseDetailResponse updateExpense(
            UUID groupId, UUID expenseId, UpdateExpenseRequest req, UUID requestUserId) {
        Expense expense = expenseRepository
                .findById(expenseId)
                .orElseThrow(() -> new AppException(ErrorCode.EXPENSE_NOT_FOUND));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new AppException(ErrorCode.EXPENSE_NOT_FOUND);
        }

        boolean hasSettled = expense.getSplits().stream().anyMatch(ExpenseSplit::isSettled);
        if (hasSettled) {
            throw new AppException(ErrorCode.EXPENSE_ALREADY_SETTLED);
        }

        if ("SETTLEMENT".equals(expense.getCategory()) || "CONSOLIDATION".equals(expense.getCategory())) {
            throw new AppException(ErrorCode.CANNOT_MODIFY_SYSTEM_EXPENSE);
        }

        // Chỉ người tạo (payer) mới được sửa
        if (!expense.getPayer().getId().equals(requestUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        User newPayer = userRepository
                .findById(req.getPaidBy())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, newPayer.getId())) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        List<UUID> targetSplitUserIds = req.getSplitUserIds();
        if (targetSplitUserIds == null || targetSplitUserIds.isEmpty()) {
            targetSplitUserIds = groupMemberRepository.findByGroup_Id(groupId).stream()
                    .map(gm -> gm.getUser().getId())
                    .filter(id -> !id.equals(newPayer.getId()))
                    .collect(java.util.stream.Collectors.toList());
        }
        List<User> splitUsers = resolveMembersInGroup(targetSplitUserIds, groupId);

        // Cập nhật fields
        expense.setTitle(req.getTitle());
        expense.setAmount(req.getAmount());
        expense.setCategory(req.getCategory());
        expense.setPayer(newPayer);

        // Xoá splits cũ (orphanRemoval = true sẽ DELETE trong DB)
        expense.getSplits().clear();

        // Tạo splits mới
        List<ExpenseSplit> newSplits = calculateSplits(expense, splitUsers, req.getAmount());
        expense.getSplits().addAll(newSplits);

        expenseRepository.save(expense);

        // Chỉ publish event nếu KHÔNG có transaction nào linked với expense này
        // (tránh double-counting trong PFM khi transaction đã được ghi nhận riêng)
        List<Transaction> linkedTransactions = transactionRepository.findByLinkedExpenseId(expense.getId());
        if (linkedTransactions.isEmpty()) {
            eventPublisher.publishEvent(new com.example.sharemoney.event.ExpenseUpdatedEvent(
                    expense.getId(), newPayer.getId(), req.getAmount(), req.getTitle(), req.getCategory()));
        }

        return toDetailResponse(expense);
    }

    // ─────────────────────────────────────────────────────────────
    // Xoá khoản chi (cascade xoá splits)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void deleteExpense(UUID groupId, UUID expenseId, UUID userId) {
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        Expense expense = expenseRepository
                .findById(expenseId)
                .orElseThrow(() -> new AppException(ErrorCode.EXPENSE_NOT_FOUND));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new AppException(ErrorCode.EXPENSE_NOT_FOUND);
        }

        boolean hasSettled = expense.getSplits().stream().anyMatch(ExpenseSplit::isSettled);
        if (hasSettled) {
            throw new AppException(ErrorCode.EXPENSE_ALREADY_SETTLED);
        }

        if ("SETTLEMENT".equals(expense.getCategory()) || "CONSOLIDATION".equals(expense.getCategory())) {
            throw new AppException(ErrorCode.CANNOT_MODIFY_SYSTEM_EXPENSE);
        }

        // Chỉ người tạo (payer) mới được xóa
        if (!expense.getPayer().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        expenseRepository.delete(expense); // CascadeType.ALL xoá splits tự động

        eventPublisher.publishEvent(new com.example.sharemoney.event.ExpenseDeletedEvent(expenseId));
    }

    // ─────────────────────────────────────────────────────────────
    // Private: Thuật toán chia tiền đều — phần dư (+1) vào người đầu tiên
    // ─────────────────────────────────────────────────────────────
    private List<ExpenseSplit> calculateSplits(
            Expense expense, List<User> splitUsers, BigDecimal total) {
        int count = splitUsers.size();
        BigDecimal base = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.FLOOR);
        BigDecimal remainder = total.subtract(base.multiply(BigDecimal.valueOf(count)));

        List<ExpenseSplit> splits = new ArrayList<>();
        for (int i = 0; i < splitUsers.size(); i++) {
            BigDecimal owedAmount = (i == 0) ? base.add(remainder) : base;
            splits.add(
                    ExpenseSplit.builder()
                            .expense(expense)
                            .user(splitUsers.get(i))
                            .amountOwed(owedAmount)
                            .isSettled(false)
                            .build());
        }
        return splits;
    }

    // ─────────────────────────────────────────────────────────────
    // Private: Resolve + validate danh sách user phải là thành viên nhóm
    // ─────────────────────────────────────────────────────────────
    private List<User> resolveMembersInGroup(List<UUID> userIds, UUID groupId) {
        List<User> users = new ArrayList<>();
        for (UUID uid : userIds) {
            if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, uid)) {
                throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
            }
            users.add(
                    userRepository
                            .findById(uid)
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));
        }
        return users;
    }

    // ─────────────────────────────────────────────────────────────
    // Private: Mapping helpers
    // ─────────────────────────────────────────────────────────────
    private ExpenseResponse toListResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .title(expense.getTitle())
                .amount(expense.getAmount())
                .category(expense.getCategory())
                .payer(toUserSummary(expense.getPayer()))
                .splitCount(expense.getSplits().size())
                .createdAt(expense.getCreatedAt())
                .build();
    }

    private ExpenseDetailResponse toDetailResponse(Expense expense) {
        List<ExpenseDetailResponse.SplitResponse> splitResponses = expense.getSplits().stream()
                .map(
                        s -> ExpenseDetailResponse.SplitResponse.builder()
                                .id(s.getId())
                                .user(toUserSummary(s.getUser()))
                                .amountOwed(s.getAmountOwed())
                                .isSettled(s.isSettled())
                                .build())
                .toList();

        return ExpenseDetailResponse.builder()
                .id(expense.getId())
                .title(expense.getTitle())
                .amount(expense.getAmount())
                .category(expense.getCategory())
                .payer(toUserSummary(expense.getPayer()))
                .splits(splitResponses)
                .createdAt(expense.getCreatedAt())
                .build();
    }

    private UserSummaryResponse toUserSummary(User user) {
        return UserMapper.toUserSummary(user);
    }
}
