package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.SetBudgetRequest;
import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.entity.Budget;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.entity.SavingsGoal;
import com.example.sharemoney.entity.SavingsGoalStatus;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.dto.response.SafeToSpendResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final SavingsGoalRepository savingsGoalRepository;

    // ─────────────────────────────────────────────────────────────
    // Tạo hoặc cập nhật ngân sách (upsert)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public BudgetSummaryResponse setBudget(UUID userId, SetBudgetRequest req) {
        LocalDate now = LocalDate.now();
        int month = req.getMonth() == 0 ? now.getMonthValue() : req.getMonth();
        int year  = req.getYear()  == 0 ? now.getYear()       : req.getYear();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Category category = categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));



        Budget budget;
        if (req.getId() != null) {
            budget = budgetRepository.findById(req.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.BUDGET_NOT_FOUND));
            if (!budget.getUser().getId().equals(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            // Update category and month/year just in case
            budget.setCategory(category);
            budget.setMonth(month);
            budget.setYear(year);
        } else {
            budget = Budget.builder().user(user).category(category).month(month).year(year).build();
        }

        budget.setLimitAmount(req.getLimitAmount());
        budget.setName(req.getName());

        try {
            budget.setType(com.example.sharemoney.entity.BudgetType.valueOf(req.getType().toUpperCase()));
        } catch (Exception e) {
            budget.setType(com.example.sharemoney.entity.BudgetType.FLEXIBLE);
        }
        budget.setRecurring(req.isRecurring());
        budget.setDueDayOfMonth(req.getDueDayOfMonth());
        budget.setIsMandatory(req.isMandatory());
        budget.setPayeeBankBin(req.getPayeeBankBin());
        budget.setPayeeBankAccount(req.getPayeeBankAccount());
        budget.setPayeeAccountName(req.getPayeeAccountName());
        budgetRepository.save(budget);

        // Tính số đã chi thực tế để trả về response
        BigDecimal spent;
        if (budget.getType() == com.example.sharemoney.entity.BudgetType.FLEXIBLE) {
            spent = transactionRepository.sumExpenseByCategoryAndMonth(userId, budget.getCategory().getId(), year, month);
        } else {
            spent = transactionRepository.sumExpenseByLinkedBudgetIdAndMonth(budget.getId(), year, month);
        }
        if (spent == null) spent = BigDecimal.ZERO;

        return toSummaryResponse(budget, spent);
    }

    // ─────────────────────────────────────────────────────────────
    // Lấy toàn bộ ngân sách tháng kèm số đã chi thực tế
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public List<BudgetSummaryResponse> getBudgetSummary(UUID userId, int year, int month) {
        LocalDate now = LocalDate.now();
        int m = month == 0 ? now.getMonthValue() : month;
        int y = year  == 0 ? now.getYear()       : year;

        int prevMonth = m == 1 ? 12 : m - 1;
        int prevYear = m == 1 ? y - 1 : y;

        List<Budget> prevBudgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, prevMonth, prevYear);
        List<Budget> currentBudgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, m, y);

        for (Budget prev : prevBudgets) {
            if (prev.isRecurring()) {
                boolean exists = currentBudgets.stream()
                        .anyMatch(c -> c.getCategory().getId().equals(prev.getCategory().getId())
                                && java.util.Objects.equals(c.getName(), prev.getName()));
                if (!exists) {
                    Budget newBudget = Budget.builder()
                            .user(prev.getUser())
                            .category(prev.getCategory())
                            .month(m)
                            .year(y)
                            .limitAmount(prev.getLimitAmount())
                            .name(prev.getName())

                            .type(prev.getType())
                            .isRecurring(prev.isRecurring())
                            .dueDayOfMonth(prev.getDueDayOfMonth())
                            .isMandatory(prev.getIsMandatory() != null ? prev.getIsMandatory() : false)
                            .payeeBankBin(prev.getPayeeBankBin())
                            .payeeBankAccount(prev.getPayeeBankAccount())
                            .payeeAccountName(prev.getPayeeAccountName())
                            .build();



                    try {
                        budgetRepository.saveAndFlush(newBudget);
                        currentBudgets.add(newBudget);
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        // Bỏ qua lỗi trùng lặp do race condition (luồng khác đã insert trước)
                    }
                }
            }
        }

        return currentBudgets
                .stream()
                .map(b -> {
                    BigDecimal spent;
                    if (b.getType() == com.example.sharemoney.entity.BudgetType.FLEXIBLE) {
                        spent = transactionRepository.sumExpenseByCategoryAndMonth(userId, b.getCategory().getId(), y, m);
                    } else {
                        spent = transactionRepository.sumExpenseByLinkedBudgetIdAndMonth(b.getId(), y, m);
                    }
                    if (spent == null) spent = BigDecimal.ZERO;
                    return toSummaryResponse(b, spent);
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // Xóa ngân sách
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void deleteBudget(UUID userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new AppException(ErrorCode.BUDGET_NOT_FOUND));
        if (!budget.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        budgetRepository.delete(budget);
    }

    // ─────────────────────────────────────────────────────────────
    // Toggle Bắt buộc chi
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void toggleMandatory(UUID userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new AppException(ErrorCode.BUDGET_NOT_FOUND));
        if (!budget.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        boolean currentVal = budget.getIsMandatory() != null ? budget.getIsMandatory() : false;
        budget.setIsMandatory(!currentVal);
        budgetRepository.save(budget);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: tính % và status
    // ─────────────────────────────────────────────────────────────
    private BudgetSummaryResponse toSummaryResponse(Budget budget, BigDecimal spent) {
        if (spent == null) spent = BigDecimal.ZERO;

        BigDecimal totalLimit = budget.getLimitAmount();

        int percentage = totalLimit.compareTo(BigDecimal.ZERO) <= 0
                ? (spent.compareTo(BigDecimal.ZERO) > 0 ? 100 : 0)
                : spent.multiply(BigDecimal.valueOf(100))
                       .divide(totalLimit, 0, java.math.RoundingMode.HALF_UP)
                       .intValue();

        String status;
        if (percentage >= 100)     status = "OVER";
        else if (percentage >= 80) status = "WARNING";
        else                       status = "OK";

        BigDecimal available = totalLimit.subtract(spent);

        return BudgetSummaryResponse.builder()
                .budgetId(budget.getId())
                .name(budget.getName())
                .categoryId(budget.getCategory().getId())
                .categoryName(budget.getCategory().getName())
                .categoryIcon(budget.getCategory().getIconName())
                .limitAmount(budget.getLimitAmount())
                .spentAmount(spent)
                .percentage(percentage)
                .status(status)

                .availableAmount(available)
                .type(budget.getType().name())
                .isRecurring(budget.isRecurring())
                .dueDayOfMonth(budget.getDueDayOfMonth())
                .isMandatory(budget.getIsMandatory() != null ? budget.getIsMandatory() : false)
                .payeeBankBin(budget.getPayeeBankBin())
                .payeeBankAccount(budget.getPayeeBankAccount())
                .payeeAccountName(budget.getPayeeAccountName())
                .build();
    }

    @Transactional(readOnly = true)
    public SafeToSpendResponse getSafeToSpend(UUID userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime startOfMonth = ym.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = ym.atEndOfMonth().atTime(23, 59, 59, 999999999);

        // 1. Total Income
        BigDecimal totalIncome = transactionRepository.sumByTypeAndPeriod(userId, TransactionType.INCOME, startOfMonth, endOfMonth);
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;

        // 2. Bills
        List<Budget> budgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, month, year);
        BigDecimal totalBills = BigDecimal.ZERO;
        BigDecimal totalBillSpent = BigDecimal.ZERO;
        for (Budget b : budgets) {
            if ("BILL".equals(b.getType().name())) {
                BigDecimal spent = transactionRepository.sumExpenseByLinkedBudgetIdAndMonth(b.getId(), year, month);
                if (spent == null) spent = BigDecimal.ZERO;
                BigDecimal billAmt = b.getLimitAmount().max(spent);
                totalBills = totalBills.add(billAmt);
                totalBillSpent = totalBillSpent.add(spent);
            }
        }

        // 4. Flexible Spent
        BigDecimal totalExpense = transactionRepository.sumByTypeAndPeriod(userId, TransactionType.EXPENSE, startOfMonth, endOfMonth);
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        BigDecimal flexibleSpent = totalExpense.subtract(totalBillSpent);
        if (flexibleSpent.compareTo(BigDecimal.ZERO) < 0) flexibleSpent = BigDecimal.ZERO;

        // 5. Raw Safe Balance
        BigDecimal rawSafeBalance = totalIncome.subtract(totalBills).subtract(flexibleSpent);
        if (rawSafeBalance.compareTo(BigDecimal.ZERO) < 0) rawSafeBalance = BigDecimal.ZERO;

        // 3. Savings (40% of Raw Safe Balance)
        BigDecimal totalSavings = rawSafeBalance.multiply(new BigDecimal("0.4")).setScale(2, RoundingMode.HALF_UP);

        // 6. Safe Balance Total
        BigDecimal safeBalanceTotal = rawSafeBalance.subtract(totalSavings);

        // 6. Safe Balance Daily
        LocalDate today = LocalDate.now();
        int daysLeft = 1;
        if (year == today.getYear() && month == today.getMonthValue()) {
            daysLeft = today.lengthOfMonth() - today.getDayOfMonth() + 1;
        } else {
            daysLeft = ym.lengthOfMonth();
        }

        BigDecimal safeBalanceDaily = safeBalanceTotal.divide(BigDecimal.valueOf(daysLeft), 2, RoundingMode.HALF_UP);

        return SafeToSpendResponse.builder()
                .totalIncome(totalIncome)
                .totalBills(totalBills)
                .totalSavings(totalSavings)
                .flexibleSpent(flexibleSpent)
                .safeBalanceTotal(safeBalanceTotal)
                .safeBalanceDaily(safeBalanceDaily)
                .daysLeft(daysLeft)
                .build();
    }
}
