package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.SetBudgetRequest;
import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.dto.response.SafeToSpendResponse;
import com.example.sharemoney.entity.Budget;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final com.example.sharemoney.repository.PayeeRepository payeeRepository;

    // ─────────────────────────────────────────────────────────────
    // Tạo hoặc cập nhật ngân sách (upsert)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public BudgetSummaryResponse setBudget(UUID userId, SetBudgetRequest req) {
        LocalDate now = LocalDate.now();
        int month = req.getMonth() == 0 ? now.getMonthValue() : req.getMonth();
        int year = req.getYear() == 0 ? now.getYear() : req.getYear();

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Category category =
                categoryRepository
                        .findById(req.getCategoryId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        Budget budget;
        if (req.getId() != null) {
            budget =
                    budgetRepository
                            .findById(req.getId())
                            .orElseThrow(() -> new AppException(ErrorCode.BUDGET_NOT_FOUND));
            if (!budget.getUser().getId().equals(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
            // Update category and month/year just in case
            budget.setCategory(category);
            budget.setMonth(month);
            budget.setYear(year);
        } else {
            // Kiểm tra xem đã có ngân sách cho category + month + year + name chưa (tránh vi phạm Unique Constraint và không ghi đè nhầm các bill khác tên)
            List<Budget> existingList;
            if (req.getName() != null && !req.getName().trim().isEmpty()) {
                existingList =
                        budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYearAndName(
                                userId, category.getId(), month, year, req.getName().trim());
            } else {
                existingList =
                        budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                                userId, category.getId(), month, year);
            }
            if (existingList != null && !existingList.isEmpty()) {
                budget = existingList.get(0);
            } else {
                budget = Budget.builder().user(user).category(category).month(month).year(year).build();
            }
        }

        budget.setLimitAmount(req.getLimitAmount());
        budget.setName(req.getName());

        try {
            budget.setType(
                    com.example.sharemoney.entity.BudgetType.valueOf(req.getType().toUpperCase()));
        } catch (Exception e) {
            budget.setType(com.example.sharemoney.entity.BudgetType.FLEXIBLE);
        }
        budget.setRecurring(req.isRecurring());
        budget.setDueDayOfMonth(req.getDueDayOfMonth());
        budget.setIsMandatory(req.isMandatory());
        budget.setPayeeBankBin(req.getPayeeBankBin());
        budget.setPayeeBankAccount(req.getPayeeBankAccount());
        budget.setPayeeAccountName(req.getPayeeAccountName());

        // Nếu request gửi kèm payeeId → tự động điền thông tin người nhận từ bảng payees
        if (req.getPayeeId() != null) {
            payeeRepository.findById(req.getPayeeId()).ifPresent(payee -> {
                budget.setPayeeId(payee.getId());
                budget.setPayeeBankBin(payee.getBankBin());
                budget.setPayeeBankAccount(payee.getBankAccount());
                budget.setPayeeAccountName(payee.getAccountName() != null
                        ? payee.getAccountName() : payee.getName());
            });
        } else {
            budget.setPayeeId(null);
        }

        budgetRepository.save(budget);

        // Tính số đã chi thực tế:
        // - Nếu budget mới tạo trong tháng này → chỉ đếm từ createdAt trở đi (không hồi tố)
        // - Nếu budget được update (id != null) → đếm toàn tháng
        java.time.LocalDateTime since = getSinceDateTime(budget, year, month);
        BigDecimal spent = calculateSpent(userId, budget, year, month, since);
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
        int y = year == 0 ? now.getYear() : year;

        int prevMonth = m == 1 ? 12 : m - 1;
        int prevYear = m == 1 ? y - 1 : y;

        List<Budget> prevBudgets =
                budgetRepository.findByUser_IdAndMonthAndYear(userId, prevMonth, prevYear);
        List<Budget> currentBudgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, m, y);

        for (Budget prev : prevBudgets) {
            if (prev.isRecurring()) {
                boolean exists =
                        currentBudgets.stream()
                                .anyMatch(
                                        c ->
                                                c.getCategory()
                                                                .getId()
                                                                .equals(prev.getCategory().getId())
                                                        && java.util.Objects.equals(
                                                                c.getName(), prev.getName()));
                if (!exists) {
                    Budget newBudget =
                            Budget.builder()
                                    .user(prev.getUser())
                                    .category(prev.getCategory())
                                    .month(m)
                                    .year(y)
                                    .limitAmount(prev.getLimitAmount())
                                    .name(prev.getName())
                                    .type(prev.getType())
                                    .isRecurring(prev.isRecurring())
                                    .dueDayOfMonth(prev.getDueDayOfMonth())
                                    .isMandatory(
                                            prev.getIsMandatory() != null
                                                    ? prev.getIsMandatory()
                                                    : false)
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

        return currentBudgets.stream()
                .map(
                        b -> {
                            java.time.LocalDateTime since = getSinceDateTime(b, y, m);
                            BigDecimal spent = calculateSpent(userId, b, y, m, since);
                            if (spent == null) spent = BigDecimal.ZERO;
                            return toSummaryResponse(b, spent);
                        })
                .sorted((b1, b2) -> {
                    boolean m1 = b1.isMandatory();
                    boolean m2 = b2.isMandatory();
                    if (m1 != m2) return m1 ? -1 : 1; // Priority (isMandatory = true) on top
                    return 0;
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // Xóa ngân sách
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void deleteBudget(UUID userId, UUID budgetId) {
        Budget budget =
                budgetRepository
                        .findById(budgetId)
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
        Budget budget =
                budgetRepository
                        .findById(budgetId)
                        .orElseThrow(() -> new AppException(ErrorCode.BUDGET_NOT_FOUND));
        if (!budget.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        boolean currentVal = budget.getIsMandatory() != null ? budget.getIsMandatory() : false;
        budget.setIsMandatory(!currentVal);
        budgetRepository.save(budget);
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: xác định mốc thời gian bắt đầu tính chi tiêu
    // ─────────────────────────────────────────────────────────────
    /**
     * Nếu budget được TẠO MỚI trong đúng tháng/năm đang xét → trả về createdAt
     * (chỉ đếm giao dịch từ lúc tạo trở đi, không hồi tố).
     * Nếu budget được rollover từ tháng trước hoặc là update → trả về null
     * (đếm toàn bộ tháng như bình thường).
     */
    private java.time.LocalDateTime getSinceDateTime(Budget budget, int year, int month) {
        if (budget.getCreatedAt() == null) return null;
        if (budget.getCreatedAt().getYear() == year
                && budget.getCreatedAt().getMonthValue() == month) {
            return budget.getCreatedAt();
        }
        return null;
    }

    /**
     * Tính tổng chi tiêu thực tế của budget, có hoặc không có filter createdAt.
     */
    private BigDecimal calculateSpent(
            UUID userId, Budget budget, int year, int month,
            java.time.LocalDateTime since) {
        UUID catId = budget.getCategory().getId();
        boolean isBill = budget.getType() == com.example.sharemoney.entity.BudgetType.BILL;

        if (since != null) {
            // Budget mới tạo trong tháng → chỉ đếm từ createdAt trở đi
            return isBill
                    ? transactionRepository.sumAllExpenseByCategoryAndMonthSince(userId, catId, year, month, since)
                    : transactionRepository.sumExpenseByCategoryAndMonthSince(userId, catId, year, month, since);
        } else {
            // Budget rollover / toàn tháng
            return isBill
                    ? transactionRepository.sumAllExpenseByCategoryAndMonth(userId, catId, year, month)
                    : transactionRepository.sumExpenseByCategoryAndMonth(userId, catId, year, month);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helper: tính % và status
    // ─────────────────────────────────────────────────────────────
    private BudgetSummaryResponse toSummaryResponse(Budget budget, BigDecimal spent) {

        if (spent == null) spent = BigDecimal.ZERO;

        BigDecimal totalLimit = budget.getLimitAmount();

        int percentage =
                totalLimit.compareTo(BigDecimal.ZERO) <= 0
                        ? (spent.compareTo(BigDecimal.ZERO) > 0 ? 100 : 0)
                        : spent.multiply(BigDecimal.valueOf(100))
                                .divide(totalLimit, 0, java.math.RoundingMode.HALF_UP)
                                .intValue();

        String status;
        if (percentage >= 100) status = "OVER";
        else if (percentage >= 80) status = "WARNING";
        else status = "OK";

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
                .type(budget.getType() != null ? budget.getType().name() : "FLEXIBLE")
                .isRecurring(budget.isRecurring())
                .dueDayOfMonth(budget.getDueDayOfMonth())
                .isMandatory(budget.getIsMandatory() != null ? budget.getIsMandatory() : false)
                .payeeBankBin(budget.getPayeeBankBin())
                .payeeBankAccount(budget.getPayeeBankAccount())
                .payeeAccountName(budget.getPayeeAccountName())
                .payeeId(budget.getPayeeId())
                .createdAt(budget.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public SafeToSpendResponse getSafeToSpend(UUID userId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime startOfMonth = ym.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = ym.atEndOfMonth().plusDays(1).atStartOfDay();

        // 1. Total Income
        BigDecimal totalIncome =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.INCOME, startOfMonth, endOfMonth);
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;

        // 2. Bills
        List<Budget> budgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, month, year);
        BigDecimal totalBills = BigDecimal.ZERO;
        BigDecimal totalBillSpent = BigDecimal.ZERO;
        for (Budget b : budgets) {
            if (b.getType() != null && "BILL".equals(b.getType().name())) {
                BigDecimal spent =
                        transactionRepository.sumAllExpenseByCategoryAndMonth(
                                userId, b.getCategory().getId(), year, month);
                if (spent == null) spent = BigDecimal.ZERO;
                BigDecimal billAmt = b.getLimitAmount().max(spent);
                totalBills = totalBills.add(billAmt);
                totalBillSpent = totalBillSpent.add(spent);
            }
        }

        // 4. Flexible Spent
        BigDecimal totalExpense =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.EXPENSE, startOfMonth, endOfMonth);
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        BigDecimal flexibleSpent = totalExpense.subtract(totalBillSpent);
        if (flexibleSpent.compareTo(BigDecimal.ZERO) < 0) flexibleSpent = BigDecimal.ZERO;

        // 5. Raw Safe Balance
        BigDecimal rawSafeBalance = totalIncome.subtract(totalBills).subtract(flexibleSpent);
        if (rawSafeBalance.compareTo(BigDecimal.ZERO) < 0) rawSafeBalance = BigDecimal.ZERO;

        // 3. Savings (40% of Raw Safe Balance)
        BigDecimal totalSavings =
                rawSafeBalance.multiply(new BigDecimal("0.4")).setScale(2, RoundingMode.HALF_UP);

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

        BigDecimal safeBalanceDaily =
                safeBalanceTotal.divide(BigDecimal.valueOf(daysLeft), 2, RoundingMode.HALF_UP);

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
