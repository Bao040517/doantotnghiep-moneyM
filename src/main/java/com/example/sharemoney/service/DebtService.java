package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.RemindDebtRequest;
import com.example.sharemoney.dto.request.VietQrRequest;
import com.example.sharemoney.dto.response.DebtSummaryResponse;
import com.example.sharemoney.dto.response.DebtSummaryResponse.MemberBalance;
import com.example.sharemoney.dto.response.DebtSummaryResponse.SettlementTransaction;
import com.example.sharemoney.dto.response.UserDebtSummaryResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.ExpenseSplit;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.ExpenseSplitRepository;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.GroupRepository;
import com.example.sharemoney.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DebtService {

    private final ExpenseSplitRepository expenseSplitRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final VietQrService vietQrService;
    private final NotificationService notificationService;
    private final com.example.sharemoney.repository.ExpenseRepository expenseRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final com.example.sharemoney.repository.PaymentRepository paymentRepository;

    // ─────────────────────────────────────────────────────────────
    // Entry point: tính toán nợ + chạy Greedy cho 1 nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public DebtSummaryResponse calculateGroupDebts(UUID groupId, UUID userId) {
        groupRepository
                .findById(groupId)
                .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        // Bước 1: Xây dựng map userId → User (cho tất cả thành viên)
        Map<UUID, User> userMap = new HashMap<>();
        groupMemberRepository
                .findByGroup_Id(groupId)
                .forEach(gm -> userMap.put(gm.getUser().getId(), gm.getUser()));

        // Bước 2: Lấy tất cả splits CHƯA trả trong nhóm
        List<ExpenseSplit> unsettledSplits =
                expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId);

        // Bước 3: Tính số dư ròng (net balance) mỗi thành viên
        Map<UUID, BigDecimal> balances = calculateNetBalances(unsettledSplits, userMap);

        // Bước 4: Chạy thuật toán Greedy rút gọn nợ
        List<SettlementTransaction> transactions = greedySettle(balances, userMap);

        // Bước 5: Build response
        List<MemberBalance> memberBalances =
                balances.entrySet().stream()
                        .map(
                                e ->
                                        MemberBalance.builder()
                                                .user(toUserSummary(userMap.get(e.getKey())))
                                                .balance(e.getValue())
                                                .build())
                        .toList();

        return DebtSummaryResponse.builder()
                .groupId(groupId)
                .memberBalances(memberBalances)
                .transactions(transactions)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Bước 3: Tính số dư ròng từ danh sách splits
    //
    // Với mỗi split chưa trả:
    //   split.payer  → +amountOwed  (người này đang bị nợ)
    //   split.user   → -amountOwed  (người này đang nợ)
    // ─────────────────────────────────────────────────────────────
    private Map<UUID, BigDecimal> calculateNetBalances(
            List<ExpenseSplit> splits, Map<UUID, User> userMap) {

        Map<UUID, BigDecimal> balances = new HashMap<>();
        // Khởi tạo tất cả thành viên với balance = 0
        userMap.keySet().forEach(uid -> balances.put(uid, BigDecimal.ZERO));

        for (ExpenseSplit split : splits) {
            UUID payerId = split.getExpense().getPayer().getId();
            UUID debtorId = split.getUser().getId();
            BigDecimal amount = split.getAmountOwed();

            // Payer được cộng (creditor)
            balances.merge(payerId, amount, BigDecimal::add);
            // Debtor bị trừ (debtor)
            balances.merge(debtorId, amount.negate(), BigDecimal::add);
        }

        return balances;
    }

    // ─────────────────────────────────────────────────────────────
    // Bước 4: Thuật toán Greedy rút gọn nợ chéo
    //
    // Ý tưởng:
    //   - Lấy người nợ nhiều nhất (max debtor) và người được nợ nhiều nhất (max creditor)
    //   - Tạo 1 giao dịch: debtor → creditor với amount = min(|debt|, credit)
    //   - Cập nhật balance, lặp lại đến khi hết nợ
    //
    // Ví dụ:
    //   A=-100k, B=+50k, C=+50k
    //   → A trả B 50k, A trả C 50k  (2 giao dịch)
    //
    //   A=-100k, B=-50k, C=+150k
    //   → A trả C 100k, B trả C 50k  (2 giao dịch thay vì 3)
    // ─────────────────────────────────────────────────────────────
    private List<SettlementTransaction> greedySettle(
            Map<UUID, BigDecimal> balanceMap, Map<UUID, User> userMap) {

        // Dùng mutable copy để không làm ảnh hưởng map gốc
        Map<UUID, BigDecimal> remaining = new HashMap<>(balanceMap);
        List<SettlementTransaction> result = new ArrayList<>();

        // Ngưỡng epsilon để bỏ qua sai số làm tròn (< 1 đồng)
        BigDecimal epsilon = new BigDecimal("0.01");

        while (true) {
            // Tìm max creditor và max debtor trong mỗi vòng lặp
            UUID maxCreditorId = null;
            UUID maxDebtorId = null;
            BigDecimal maxCredit = BigDecimal.ZERO;
            BigDecimal maxDebt = BigDecimal.ZERO;

            for (Map.Entry<UUID, BigDecimal> entry : remaining.entrySet()) {
                BigDecimal bal = entry.getValue();
                if (bal.compareTo(maxCredit) > 0) {
                    maxCredit = bal;
                    maxCreditorId = entry.getKey();
                }
                if (bal.compareTo(maxDebt) < 0) {
                    maxDebt = bal;
                    maxDebtorId = entry.getKey();
                }
            }

            // Không còn nợ đáng kể → dừng
            if (maxCreditorId == null || maxDebtorId == null) break;
            if (maxCredit.compareTo(epsilon) < 0) break;

            // Số tiền giao dịch = min(credit, |debt|)
            BigDecimal payment = maxCredit.min(maxDebt.negate());

            result.add(
                    SettlementTransaction.builder()
                            .from(toUserSummary(userMap.get(maxDebtorId)))
                            .to(toUserSummary(userMap.get(maxCreditorId)))
                            .amount(payment.setScale(0, java.math.RoundingMode.HALF_UP))
                            .build());

            // Cập nhật balance
            remaining.put(maxCreditorId, remaining.get(maxCreditorId).subtract(payment));
            remaining.put(maxDebtorId, remaining.get(maxDebtorId).add(payment));

            // Xoá những người đã hòa vốn (|balance| < epsilon)
            remaining.entrySet().removeIf(e -> e.getValue().abs().compareTo(epsilon) < 0);
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Gửi nhắc nợ tự động (Tích hợp QR, STOMP, và Email)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public void remindDebt(UUID groupId, RemindDebtRequest request, UUID creditorId) {
        User creditor =
                userRepository
                        .findById(creditorId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        User debtor =
                userRepository
                        .findById(request.getDebtorId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, creditorId)
                || !groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, debtor.getId())) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        // 1. Tạo Quick Link VietQR (người nhận là creditor)
        VietQrRequest qrReq = new VietQrRequest();
        qrReq.setReceiverId(creditorId);
        qrReq.setAmount(request.getAmount());
        qrReq.setDescription("ShareMoney Thanh toan no nhom");
        String qrUrl = vietQrService.generateQrLink(qrReq).getQrUrl();

        // Lấy số tiền format đẹp
        java.text.NumberFormat formatter =
                java.text.NumberFormat.getCurrencyInstance(
                        java.util.Locale.forLanguageTag("vi-VN"));
        String amountString = formatter.format(request.getAmount());

        // 2. Bắn Notification (WebSocket)
        String message = request.getMessage();
        if (message == null || message.trim().isEmpty()) {
            message = String.format("%s vừa nhắc bạn trả %s.", creditor.getName(), amountString);
        }
        notificationService.sendNotification(debtor.getId(), message, "REMIND_DEBT");
    }

    // ─────────────────────────────────────────────────────────────
    // Gửi thông báo "Đã chuyển tiền" cho chủ nợ duyệt
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void notifyPayment(
            UUID groupId,
            UUID debtorId,
            com.example.sharemoney.dto.request.SettleDebtRequest request) {
        User debtor =
                userRepository
                        .findById(debtorId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        User creditor =
                userRepository
                        .findById(request.getToUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Lưu vào cơ sở dữ liệu thay vì in-memory
        com.example.sharemoney.entity.Payment payment =
                paymentRepository
                        .findByGroup_IdAndPayer_IdAndReceiver_IdAndStatus(
                                groupId, debtorId, creditor.getId(), "pending")
                        .orElseGet(
                                () ->
                                        com.example.sharemoney.entity.Payment.builder()
                                                .group(
                                                        groupRepository
                                                                .findById(groupId)
                                                                .orElseThrow(
                                                                        () ->
                                                                                new AppException(
                                                                                        ErrorCode
                                                                                                .GROUP_NOT_FOUND)))
                                                .payer(debtor)
                                                .receiver(creditor)
                                                .status("pending")
                                                .build());
        payment.setAmount(request.getAmount());
        paymentRepository.save(payment);

        java.text.NumberFormat formatter =
                java.text.NumberFormat.getCurrencyInstance(
                        java.util.Locale.forLanguageTag("vi-VN"));
        String amountString = formatter.format(request.getAmount());

        String message =
                String.format(
                        "🔔 %s vừa báo đã chuyển %s cho bạn. Hãy vào nhóm xác nhận nhé!",
                        debtor.getName(), amountString);
        notificationService.sendNotification(creditor.getId(), message, "PAYMENT_SENT");
    }

    // ─────────────────────────────────────────────────────────────
    // Chủ nợ xác nhận thanh toán (Tạo khoản chi đối trừ & STOMP "Ting ting")
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void approveSettle(
            UUID groupId,
            UUID creditorId,
            com.example.sharemoney.dto.request.ApproveSettleRequest request) {
        User creditor =
                userRepository
                        .findById(creditorId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        User debtor =
                userRepository
                        .findById(request.getDebtorId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, debtor.getId())
                || !groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, creditor.getId())) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        com.example.sharemoney.entity.Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        // Tạo 1 Expense đặc biệt để đối trừ nợ (Category = "SETTLEMENT")
        com.example.sharemoney.entity.Expense settlement =
                com.example.sharemoney.entity.Expense.builder()
                        .group(group)
                        .payer(debtor)
                        .title("Thanh toán nợ cho " + creditor.getName())
                        .amount(request.getAmount())
                        .category("SETTLEMENT") // Danh mục đặc biệt
                        .build();

        // Chỉ creditor nợ lại debtor số tiền này (để triệt tiêu nợ cũ), isSettled = false để Greedy
        // tự bắt lấy
        ExpenseSplit split =
                ExpenseSplit.builder()
                        .expense(settlement)
                        .user(creditor)
                        .amountOwed(request.getAmount())
                        .isSettled(false)
                        .build();

        settlement.getSplits().add(split);
        expenseRepository.save(settlement);

        // Publish event for PFM
        eventPublisher.publishEvent(
                new com.example.sharemoney.event.DebtSettledEvent(
                        settlement.getId(), debtor.getId(), creditor.getId(), request.getAmount()));

        // Lấy số tiền format đẹp
        java.text.NumberFormat formatter =
                java.text.NumberFormat.getCurrencyInstance(
                        java.util.Locale.forLanguageTag("vi-VN"));
        String amountString = formatter.format(request.getAmount());

        // Đánh dấu pending payment thành completed nếu có
        paymentRepository
                .findByGroup_IdAndPayer_IdAndReceiver_IdAndStatus(
                        groupId, debtor.getId(), creditor.getId(), "pending")
                .ifPresent(
                        p -> {
                            p.setStatus("completed");
                            paymentRepository.save(p);
                        });

        // Bắn Notification (WebSocket) cho người trả
        String message =
                String.format(
                        "🎉 %s đã xác nhận nhận được %s từ bạn!", creditor.getName(), amountString);
        notificationService.sendNotification(debtor.getId(), message, "PAYMENT_RECEIVED");

        // ==========================
        // No consolidation needed. The creation of the SETTLEMENT expense above
        // naturally balances the ledger and greedy algorithm will automatically
        // recalculate the net debt.
        // ==========================
    }

    public List<String> getPendingDebtors(UUID groupId, UUID creditorId) {
        return paymentRepository
                .findByGroup_IdAndReceiver_IdAndStatus(groupId, creditorId, "pending")
                .stream()
                .map(p -> p.getPayer().getId().toString())
                .toList();
    }

    public List<String> getPendingSent(UUID groupId, UUID debtorId) {
        return paymentRepository
                .findByGroup_IdAndPayer_IdAndStatus(groupId, debtorId, "pending")
                .stream()
                .map(p -> p.getReceiver().getId().toString())
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Tính tổng nợ/owed xuyên suốt TẤT CẢ nhóm của user
    // Dùng cho endpoint GET /api/groups/debts/summary (Safe-to-Spend)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public UserDebtSummaryResponse getUserDebtSummary(UUID userId) {
        // Lấy tất cả các nhóm user đang tham gia
        List<com.example.sharemoney.entity.GroupMember> memberships =
                groupMemberRepository.findByUser_Id(userId);

        BigDecimal totalOwed = BigDecimal.ZERO; // người khác nợ user
        BigDecimal totalOwing = BigDecimal.ZERO; // user nợ người khác
        List<UserDebtSummaryResponse.DebtDetail> details = new ArrayList<>();

        for (com.example.sharemoney.entity.GroupMember membership : memberships) {
            UUID groupId = membership.getGroup().getId();
            String groupName = membership.getGroup().getName();

            // Xây dựng userMap cho nhóm này
            Map<UUID, User> userMap = new HashMap<>();
            groupMemberRepository
                    .findByGroup_Id(groupId)
                    .forEach(gm -> userMap.put(gm.getUser().getId(), gm.getUser()));

            // Lấy tất cả splits chưa thanh toán trong nhóm
            List<ExpenseSplit> unsettledSplits =
                    expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId);

            // Tính số dư ròng
            Map<UUID, BigDecimal> balances = calculateNetBalances(unsettledSplits, userMap);

            // Chạy Greedy để ra danh sách giao dịch tối giản
            List<SettlementTransaction> settlements = greedySettle(balances, userMap);

            // Lọc ra các giao dịch liên quan đến user hiện tại
            for (SettlementTransaction tx : settlements) {
                boolean userIsDebtor = tx.getFrom() != null && userId.equals(tx.getFrom().getId());
                boolean userIsCreditor = tx.getTo() != null && userId.equals(tx.getTo().getId());

                if (userIsDebtor) {
                    totalOwing = totalOwing.add(tx.getAmount());
                    details.add(
                            UserDebtSummaryResponse.DebtDetail.builder()
                                    .groupId(groupId)
                                    .groupName(groupName)
                                    .counterparty(tx.getTo())
                                    .amount(tx.getAmount())
                                    .type("OWING")
                                    .build());
                }
                if (userIsCreditor) {
                    totalOwed = totalOwed.add(tx.getAmount());
                    details.add(
                            UserDebtSummaryResponse.DebtDetail.builder()
                                    .groupId(groupId)
                                    .groupName(groupName)
                                    .counterparty(tx.getFrom())
                                    .amount(tx.getAmount())
                                    .type("OWED")
                                    .build());
                }
            }
        }

        return UserDebtSummaryResponse.builder()
                .totalOwed(totalOwed)
                .totalOwing(totalOwing)
                .details(details)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────
    private UserSummaryResponse toUserSummary(User user) {
        return UserMapper.toUserSummary(user);
    }
}
