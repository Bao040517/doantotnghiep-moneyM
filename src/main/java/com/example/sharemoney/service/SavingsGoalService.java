package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.FundSavingsGoalRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.request.WithdrawSavingsGoalRequest;
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
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        SavingsGoal goal =
                SavingsGoal.builder()
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
        SavingsGoal goal =
                savingsGoalRepository
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

        // Tính toán Tiền nhàn rỗi (Safe to Spend) hiện tại để kiểm tra cảnh báo tiết kiệm quá mức
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
        if (walletBalance == null) walletBalance = BigDecimal.ZERO;
        BigDecimal totalOwing = debtService.getUserDebtSummary(userId).getTotalOwing();
        if (totalOwing == null) totalOwing = BigDecimal.ZERO;

        BigDecimal idleMoney = walletBalance.subtract(unpaidBudgets).subtract(totalOwing);
        if (idleMoney.compareTo(BigDecimal.ZERO) < 0) idleMoney = BigDecimal.ZERO;

        String warningMessage = null;
        if (fundAmount.compareTo(idleMoney) > 0) {
            warningMessage = String.format(
                "⚠️ Cảnh báo Tiết kiệm Quá mức: Khoản nạp %,.0fđ vào quỹ '%s' đã ăn lấn vào Quỹ dự trữ & Ngân sách bắt buộc của bạn (Tiền nhàn rỗi khả dụng chỉ còn %,.0fđ)!",
                fundAmount.doubleValue(), goal.getName(), idleMoney.doubleValue()
            );
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
        Category savingsCategory =
                categoryService.getOrCreateCategory(
                        userId, "Mục tiêu tiết kiệm", TransactionType.EXPENSE, "🎯");

        Transaction transaction =
                Transaction.builder()
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
        SavingsGoal goal =
                savingsGoalRepository
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
        SavingsGoal goal =
                savingsGoalRepository
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
        Category savingsIncomeCategory =
                categoryService.getOrCreateCategory(
                        userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

        Transaction transaction =
                Transaction.builder()
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

    @Transactional
    public void deleteSavingsGoal(UUID userId, UUID goalId) {
        SavingsGoal goal =
                savingsGoalRepository
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
                Category savingsIncomeCategory =
                        categoryService.getOrCreateCategory(
                                userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

                Transaction refundTx =
                        Transaction.builder()
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
            Wallet wallet =
                    walletRepository
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
}
