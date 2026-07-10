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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {

    private final SavingsGoalRepository savingsGoalRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> getUserSavingsGoals(UUID userId) {
        return savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SavingsGoalResponse createSavingsGoal(UUID userId, SavingsGoalRequest request) {
        User user = userRepository.findById(userId)
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
    public SavingsGoalResponse fundSavingsGoal(UUID userId, UUID goalId, FundSavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND); // Avoid exposing info
        }

        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (wallets.isEmpty()) {
            throw new AppException(ErrorCode.WALLET_NOT_FOUND);
        }
        Wallet wallet = wallets.get(0); // Assuming one default wallet

        BigDecimal fundAmount = request.getAmount();

        if (wallet.getBalance().compareTo(fundAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
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
        Category savingsCategory = categoryService.getOrCreateCategory(userId, "Mục tiêu tiết kiệm", TransactionType.EXPENSE, "🎯");

        Transaction transaction = Transaction.builder()
                .wallet(wallet)
                .amount(fundAmount)
                .type(TransactionType.EXPENSE)
                .category(savingsCategory)
                .note("Nạp tiền vào mục tiêu: " + goal.getName())
                .excludeFromBudget(true)
                .build();
        
        transactionRepository.save(transaction);

        return toResponse(goal);
    }

    @Transactional
    public SavingsGoalResponse updateSavingsGoal(UUID userId, UUID goalId, SavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
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
    public SavingsGoalResponse withdrawSavingsGoal(UUID userId, UUID goalId, WithdrawSavingsGoalRequest request) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND);
        }

        BigDecimal withdrawAmount = request.getAmount();

        if (goal.getCurrentAmount().compareTo(withdrawAmount) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_SAVINGS_BALANCE);
        }

        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (wallets.isEmpty()) {
            throw new AppException(ErrorCode.WALLET_NOT_FOUND);
        }
        Wallet wallet = wallets.get(0);

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
        Category savingsIncomeCategory = categoryService.getOrCreateCategory(userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

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

    @Transactional
    public void deleteSavingsGoal(UUID userId, UUID goalId) {
        SavingsGoal goal = savingsGoalRepository.findById(goalId)
                .orElseThrow(() -> new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND));

        if (!goal.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.SAVINGS_GOAL_NOT_FOUND);
        }

        // If goal had money, should we refund it to wallet?
        if (goal.getCurrentAmount().compareTo(BigDecimal.ZERO) > 0) {
            List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
            if (!wallets.isEmpty()) {
                Wallet wallet = wallets.get(0);
                wallet.setBalance(wallet.getBalance().add(goal.getCurrentAmount()));
                walletRepository.save(wallet);
                
                // We might also want to create an INCOME transaction to log the refund
                Category savingsIncomeCategory = categoryService.getOrCreateCategory(userId, "Hoàn tiền tiết kiệm", TransactionType.INCOME, "🏦");

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
}
