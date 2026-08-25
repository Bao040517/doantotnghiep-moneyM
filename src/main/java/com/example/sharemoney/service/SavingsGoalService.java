package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.FundSavingsGoalRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.request.WithdrawSavingsGoalRequest;
import com.example.sharemoney.dto.response.AutoAllocateResponse;
import com.example.sharemoney.dto.response.AutoAllocateStatusResponse;
import com.example.sharemoney.dto.response.SavingsGoalResponse;
import com.example.sharemoney.entity.*;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {

    private final SavingsGoalRepository savingsGoalRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryService categoryService;
    private final NotificationService notificationService;
    private final BudgetService budgetService;
    private final DebtService debtService;

    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> getUserSavingsGoals(UUID userId) {
        return savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SavingsGoalResponse createSavingsGoal(UUID userId, SavingsGoalRequest request) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        SavingsGoal goal = SavingsGoal.builder()
                .user(user)
                .name(request.getName())
                .targetAmount(request.getTargetAmount())
                .deadlineDate(request.getDeadlineDate())
                .build();

        return toResponse(savingsGoalRepository.save(goal));
    }

    @Transactional
    public SavingsGoalResponse fundSavingsGoal(
            UUID userId, UUID goalId, FundSavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository
                .findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND); // Avoid exposing info
        }

        BigDecimal fundAmount = request.getAmount();
        Wallet wallet = getWalletForSavings(userId, request.getWalletId(), fundAmount);

        if (wallet.getBalance().compareTo(fundAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
        }

        // Tính toán Tiền nhàn rỗi (Safe to Spend) hiện tại để kiểm tra cảnh báo tiết
        // kiệm quá mức
        java.time.LocalDate today = java.time.LocalDate.now();
        var currentBudgets = budgetService.getBudgetSummary(userId, today.getYear(), today.getMonthValue());
        BigDecimal unpaidBudgets = BigDecimal.ZERO;
        for (var b : currentBudgets) {
            BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                unpaidBudgets = unpaidBudgets.add(remaining);
            }
        }
        BigDecimal walletBalance = walletRepository.sumBalanceByUserId(userId);
        if (walletBalance == null)
            walletBalance = BigDecimal.ZERO;
        BigDecimal totalOwing = debtService.getUserDebtSummary(userId).getTotalOwing();
        if (totalOwing == null)
            totalOwing = BigDecimal.ZERO;

        BigDecimal idleMoney = walletBalance.subtract(unpaidBudgets).subtract(totalOwing);
        if (idleMoney.compareTo(BigDecimal.ZERO) < 0)
            idleMoney = BigDecimal.ZERO;

        String warningMessage = null;
        if (fundAmount.compareTo(idleMoney) > 0) {
            warningMessage = String.format(
                    "⚠️ Cảnh báo Tiết kiệm Quá mức: Khoản nạp %,.0fđ vào quỹ '%s' đã ăn lấn vào Quỹ dự trữ & Ngân sách bắt buộc của bạn (Tiền nhàn rỗi khả dụng chỉ còn %,.0fđ)!",
                    fundAmount.doubleValue(), goal.getName(), idleMoney.doubleValue());
            notificationService.sendNotification(userId, warningMessage, "WARNING");
        }

        // 1. Deduct from wallet
        wallet.setBalance(wallet.getBalance().subtract(fundAmount));
        walletRepository.save(wallet);

        // 2. Add to SavingsGoal
        goal.setCurrentAmount(goal.getCurrentAmount().add(fundAmount));
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus(SavingsGoalStatus.COMPLETED);
        }
        savingsGoalRepository.save(goal);

        // 3. Create Transaction
        Category savingsCategory = categoryService.getOrCreateCategory(
                userId, "Mục tiêu tiết kiệm", TransactionType.EXPENSE, "🎯");

        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .amount(fundAmount)
                .type(TransactionType.EXPENSE)
                .category(savingsCategory)
                .note("Nạp tiền vào mục tiêu: " + goal.getName())
                .excludeFromBudget(true)
                .build();

        transactionRepository.save(transaction);

        SavingsGoalResponse response = toResponse(goal);
        response.setWarningMessage(warningMessage);
        return response;
    }

    @Transactional
    public SavingsGoalResponse updateSavingsGoal(
            UUID userId, UUID goalId, SavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository
                .findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND);
        }

        goal.setName(request.getName());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setDeadlineDate(request.getDeadlineDate());

        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus(SavingsGoalStatus.COMPLETED);
        } else {
            goal.setStatus(SavingsGoalStatus.IN_PROGRESS);
        }

        return toResponse(savingsGoalRepository.save(goal));
    }

    @Transactional
    public SavingsGoalResponse withdrawSavingsGoal(
            UUID userId, UUID goalId, WithdrawSavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository
                .findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND);
        }

        BigDecimal withdrawAmount = request.getAmount();

        if (goal.getCurrentAmount().compareTo(withdrawAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_SAVINGS_BALANCE);
        }

        Wallet wallet = getWalletForSavings(userId, request.getWalletId(), null);

        // 1. Add to wallet
        wallet.setBalance(wallet.getBalance().add(withdrawAmount));
        walletRepository.save(wallet);

        // 2. Deduct from SavingsGoal
        goal.setCurrentAmount(goal.getCurrentAmount().subtract(withdrawAmount));
        if (goal.getCurrentAmount().compareTo(goal.getTargetAmount()) < 0) {
            goal.setStatus(SavingsGoalStatus.IN_PROGRESS);
        }
        savingsGoalRepository.save(goal);

        // 3. Create Transaction
        Category savingsIncomeCategory = categoryService.getOrCreateCategory(
                userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .amount(withdrawAmount)
                .type(TransactionType.INCOME)
                .category(savingsIncomeCategory)
                .note("Rút tiền từ mục tiêu: " + goal.getName())
                .excludeFromBudget(true)
                .build();

        transactionRepository.save(transaction);

        return toResponse(goal);
    }

    /**
     * Tự động phân bổ tiền nhàn rỗi (idle money) vào các mục tiêu tiết kiệm đang
     * hoạt động,
     * theo tỷ lệ (remaining / totalRemaining) cho mỗi goal.
     * Tuân thủ nguyên tắc tài chính: KHÔNG được lấn vào quỹ dự trữ cho ngân sách &
     * nợ phải trả.
     */
    @Transactional
    public AutoAllocateResponse autoAllocateSavingsGoals(UUID userId) {
        java.time.LocalDate today = java.time.LocalDate.now();

        // 0. Kiểm tra ràng buộc mỗi tháng chỉ phân bổ tiết kiệm tự động 1 lần duy nhất
        boolean alreadyAllocated = transactionRepository.existsAutoAllocationInMonth(
                userId, today.getYear(), today.getMonthValue());
        if (alreadyAllocated) {
            throw new AppException(ErrorCode.SAVINGS_ALREADY_ALLOCATED_THIS_MONTH);
        }

        // 1. Tính toán quỹ dự trữ bắt buộc (required reserve = unpaid budgets + debt owing)
        var currentBudgets = budgetService.getBudgetSummary(userId, today.getYear(), today.getMonthValue());
        BigDecimal unpaidBudgets = BigDecimal.ZERO;
        for (var b : currentBudgets) {
            BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                unpaidBudgets = unpaidBudgets.add(remaining);
            }
        }
        BigDecimal totalOwing = debtService.getUserDebtSummary(userId).getTotalOwing();
        if (totalOwing == null)
            totalOwing = BigDecimal.ZERO;
        BigDecimal requiredReserve = unpaidBudgets.add(totalOwing);

        // 2. Tổng số dư ví
        BigDecimal walletBalance = walletRepository.sumBalanceByUserId(userId);
        if (walletBalance == null)
            walletBalance = BigDecimal.ZERO;

        // 3. Tiền nhàn rỗi khả dụng = walletBalance - requiredReserve
        BigDecimal idleMoney = walletBalance.subtract(requiredReserve);
        if (idleMoney.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.SAFETY_RESERVE_VIOLATION);
        }

        // 4. Lấy các mục tiêu tiết kiệm chưa hoàn thành
        List<SavingsGoal> activeGoals = savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(g -> g.getStatus() == null || g.getStatus() != SavingsGoalStatus.COMPLETED)
                .filter(g -> g.getCurrentAmount() != null && g.getTargetAmount() != null
                        && g.getCurrentAmount().compareTo(g.getTargetAmount()) < 0)
                .collect(Collectors.toList());

        if (activeGoals.isEmpty()) {
            return AutoAllocateResponse.builder()
                    .totalAllocated(BigDecimal.ZERO)
                    .allocatedTotal(BigDecimal.ZERO)
                    .safeToSpendRemaining(idleMoney)
                    .remainingSafeBalance(idleMoney)
                    .requiredReserve(requiredReserve)
                    .allocatedGoals(Collections.emptyList())
                    .message("Không có mục tiêu tiết kiệm nào đang hoạt động hoặc các mục tiêu đã hoàn thành 100%.")
                    .build();
        }

        // 5. Tính tổng số tiền còn thiếu của tất cả goals
        BigDecimal totalRemaining = BigDecimal.ZERO;
        for (SavingsGoal g : activeGoals) {
            totalRemaining = totalRemaining.add(g.getTargetAmount().subtract(g.getCurrentAmount()));
        }

        if (totalRemaining.compareTo(BigDecimal.ZERO) <= 0) {
            return AutoAllocateResponse.builder()
                    .totalAllocated(BigDecimal.ZERO)
                    .allocatedTotal(BigDecimal.ZERO)
                    .safeToSpendRemaining(idleMoney)
                    .remainingSafeBalance(idleMoney)
                    .requiredReserve(requiredReserve)
                    .allocatedGoals(Collections.emptyList())
                    .message("Tất cả mục tiêu tiết kiệm đã đạt 100% hạn mức.")
                    .build();
        }

        // 6. Lấy danh sách ví khả dụng (không phải nợ) có số dư > 0
        List<Wallet> userWallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (userWallets == null || userWallets.isEmpty()) {
            userWallets = walletRepository.findByUser_Id(userId);
        }
        List<Wallet> availableWallets = userWallets == null ? Collections.emptyList()
                : userWallets
                        .stream()
                        .filter(w -> !w.isLiability() && w.getBalance() != null
                                && w.getBalance().compareTo(BigDecimal.ZERO) > 0)
                        .sorted((w1, w2) -> w2.getBalance().compareTo(w1.getBalance()))
                        .collect(Collectors.toList());

        if (availableWallets.isEmpty()) {
            return AutoAllocateResponse.builder()
                    .totalAllocated(BigDecimal.ZERO)
                    .allocatedTotal(BigDecimal.ZERO)
                    .safeToSpendRemaining(idleMoney)
                    .remainingSafeBalance(idleMoney)
                    .requiredReserve(requiredReserve)
                    .allocatedGoals(Collections.emptyList())
                    .message("Không tìm thấy ví khả dụng nào có số dư để thực hiện trích tiền.")
                    .build();
        }

        BigDecimal totalAvailableWalletBalance = availableWallets.stream()
                .map(Wallet::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Quy tắc vàng Cố vấn tài chính: Chỉ trích tối đa 50% tiền nhàn rỗi (idleMoney * 0.5) để giữ lại 50% đệm an toàn linh hoạt
        BigDecimal idleMoney50Percent = idleMoney.multiply(BigDecimal.valueOf(0.5)).setScale(0, java.math.RoundingMode.HALF_UP);
        BigDecimal allocatableMoney = idleMoney50Percent.min(totalAvailableWalletBalance);
        if (allocatableMoney.compareTo(BigDecimal.ZERO) <= 0) {
            return AutoAllocateResponse.builder()
                    .totalAllocated(BigDecimal.ZERO)
                    .allocatedTotal(BigDecimal.ZERO)
                    .safeToSpendRemaining(idleMoney)
                    .remainingSafeBalance(idleMoney)
                    .requiredReserve(requiredReserve)
                    .allocatedGoals(Collections.emptyList())
                    .message("Số dư ví khả dụng hiện tại không đủ để trích nạp thêm.")
                    .build();
        }

        BigDecimal totalAllocated = BigDecimal.ZERO;
        List<AutoAllocateResponse.AllocatedGoalDetail> details = new java.util.ArrayList<>();

        Category savingsCategory = categoryService.getOrCreateCategory(
                userId, "Mục tiêu tiết kiệm", TransactionType.EXPENSE, "🎯");

        for (SavingsGoal g : activeGoals) {
            BigDecimal goalRemaining = g.getTargetAmount().subtract(g.getCurrentAmount());
            if (goalRemaining.compareTo(BigDecimal.ZERO) <= 0)
                continue;

            // Tỷ lệ phân bổ = goalRemaining / totalRemaining * allocatableMoney
            BigDecimal targetAllocation = goalRemaining.multiply(allocatableMoney)
                    .divide(totalRemaining, 0, java.math.RoundingMode.FLOOR);

            if (targetAllocation.compareTo(goalRemaining) > 0) {
                targetAllocation = goalRemaining;
            }
            if (targetAllocation.compareTo(BigDecimal.ZERO) <= 0 && allocatableMoney.compareTo(BigDecimal.ZERO) > 0) {
                targetAllocation = allocatableMoney.min(goalRemaining).min(new BigDecimal("50000"));
            }
            if (targetAllocation.compareTo(BigDecimal.ZERO) <= 0)
                continue;

            // Trích lũy tiến từ các ví khả dụng
            BigDecimal remainingToFund = targetAllocation;
            for (Wallet w : availableWallets) {
                if (remainingToFund.compareTo(BigDecimal.ZERO) <= 0)
                    break;
                if (w.getBalance().compareTo(BigDecimal.ZERO) <= 0)
                    continue;

                BigDecimal fundFromWallet = w.getBalance().min(remainingToFund);
                w.setBalance(w.getBalance().subtract(fundFromWallet));
                remainingToFund = remainingToFund.subtract(fundFromWallet);

                Transaction tx = Transaction.builder()
                        .wallet(w)
                        .amount(fundFromWallet)
                        .type(TransactionType.EXPENSE)
                        .category(savingsCategory)
                        .note("Tự động phân bổ vào mục tiêu: " + g.getName())
                        .excludeFromBudget(true)
                        .build();
                transactionRepository.save(tx);
            }

            BigDecimal actualFunded = targetAllocation.subtract(remainingToFund);
            if (actualFunded.compareTo(BigDecimal.ZERO) > 0) {
                g.setCurrentAmount(g.getCurrentAmount().add(actualFunded));
                boolean completed = g.getCurrentAmount().compareTo(g.getTargetAmount()) >= 0;
                if (completed) {
                    g.setStatus(SavingsGoalStatus.COMPLETED);
                }
                savingsGoalRepository.save(g);
                totalAllocated = totalAllocated.add(actualFunded);

                details.add(AutoAllocateResponse.AllocatedGoalDetail.builder()
                        .goalId(g.getId().toString())
                        .goalName(g.getName())
                        .allocatedAmount(actualFunded)
                        .newCurrentAmount(g.getCurrentAmount())
                        .targetAmount(g.getTargetAmount())
                        .isCompleted(completed)
                        .build());
            }
        }

        walletRepository.saveAll(availableWallets);

        BigDecimal remainingSafe = idleMoney.subtract(totalAllocated);
        return AutoAllocateResponse.builder()
                .totalAllocated(totalAllocated)
                .allocatedTotal(totalAllocated)
                .safeToSpendRemaining(remainingSafe)
                .remainingSafeBalance(remainingSafe)
                .requiredReserve(requiredReserve)
                .allocatedGoals(details)
                .message(String.format("Đã tự động phân bổ %,.0fđ vào %d mục tiêu tiết kiệm.",
                        totalAllocated.doubleValue(), details.size()))
                .build();
    }

    @Transactional
    public void deleteSavingsGoal(UUID userId, UUID goalId) {
        SavingsGoal goal = savingsGoalRepository
                .findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND);
        }

        // If goal had money, should we refund it to wallet?
        if (goal.getCurrentAmount().compareTo(BigDecimal.ZERO) > 0) {
            Wallet wallet = getWalletForSavings(userId, null, null);
            if (wallet != null) {
                wallet.setBalance(wallet.getBalance().add(goal.getCurrentAmount()));
                walletRepository.save(wallet);

                // We might also want to create an INCOME transaction to log the refund
                Category savingsIncomeCategory = categoryService.getOrCreateCategory(
                        userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

                Transaction refundTx = Transaction.builder()
                        .wallet(wallet)
                        .amount(goal.getCurrentAmount())
                        .type(TransactionType.INCOME)
                        .category(savingsIncomeCategory)
                        .note("Hoàn tiền từ mục tiêu đã xóa: " + goal.getName())
                        .excludeFromBudget(true)
                        .build();
                transactionRepository.save(refundTx);
            }
        }

        savingsGoalRepository.delete(goal);
    }

    private SavingsGoalResponse toResponse(SavingsGoal goal) {
        return SavingsGoalResponse.builder()
                .id(goal.getId())
                .name(goal.getName())
                .targetAmount(goal.getTargetAmount())
                .currentAmount(goal.getCurrentAmount())
                .deadlineDate(goal.getDeadlineDate())
                .status(goal.getStatus())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();
    }

    private Wallet getWalletForSavings(
            UUID userId, UUID requestedWalletId, BigDecimal requiredBalance) {
        if (requestedWalletId != null) {
            Wallet wallet = walletRepository
                    .findById(requestedWalletId)
                    .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));
            if (!wallet.getUser().getId().equals(userId) || wallet.isLiability()) {
                throw new AppException(ErrorCode.WALLET_NOT_FOUND);
            }
            return wallet;
        }

        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (wallets.isEmpty()) {
            throw new AppException(ErrorCode.WALLET_NOT_FOUND);
        }

        if (requiredBalance != null) {
            return wallets.stream()
                    .filter(w -> w.getBalance().compareTo(requiredBalance) >= 0)
                    .findFirst()
                    .orElse(wallets.get(0));
        }
        return wallets.get(0);
    }

    public AutoAllocateStatusResponse getAutoAllocateStatus(UUID userId) {
        java.time.LocalDate today = java.time.LocalDate.now();
        boolean alreadyAllocated = transactionRepository.existsAutoAllocationInMonth(
                userId, today.getYear(), today.getMonthValue());
        return AutoAllocateStatusResponse.builder()
                .hasAllocatedThisMonth(alreadyAllocated)
                .month(today.getMonthValue())
                .year(today.getYear())
                .message(alreadyAllocated
                        ? String.format("Bạn đã thực hiện phân bổ tiết kiệm cho Tháng %d/%d (Tối đa 1 lần/tháng).", today.getMonthValue(), today.getYear())
                        : "Chưa phân bổ tiết kiệm trong tháng này.")
                .build();
    }
}
