package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.dto.response.FinancialAdviceResponse;
import com.example.sharemoney.dto.response.FinancialAdviceResponse.*;
import com.example.sharemoney.dto.response.UserDebtSummaryResponse;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Trợ lý Tài chính Thông minh (Rule-based Expert System).
 * Phân tích dữ liệu giao dịch lịch sử để đưa ra tư vấn mà không cần AI.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialAdvisorService {

    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final BudgetService budgetService;
    private final DebtService debtService;
    private final com.example.sharemoney.repository.SavingsGoalRepository savingsGoalRepository;

    // ─── Danh mục Thiết yếu (Needs) ───
    private static final Set<String> NEEDS_CATEGORIES = Set.of(
            "Ăn uống", "Tiền nhà", "Tiền điện", "Đi lại",
            "Y tế", "Giáo dục", "Phí liên lạc", "Chi tiêu hàng ngày"
    );

    // ─── Danh mục Linh hoạt (Wants) ───
    private static final Set<String> WANTS_CATEGORIES = Set.of(
            "Quần áo", "Mỹ phẩm", "Phí giao lưu"
    );

    /**
     * Entry point: Trả về toàn bộ kết quả phân tích cho một người dùng.
     */
    @Transactional(readOnly = true)
    public FinancialAdviceResponse analyze(UUID userId) {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();

        // Thu thập dữ liệu 3 tháng trước (không tính tháng hiện tại)
        Map<String, List<BigDecimal>> categoryHistory = collectCategoryHistory(userId, currentYear, currentMonth, 3);

        // Dữ liệu tháng hiện tại
        Map<String, BigDecimal> currentMonthSpending = getCurrentMonthSpending(userId, currentYear, currentMonth);

        // Thu nhập tháng hiện tại
        YearMonth currentYM = YearMonth.of(currentYear, currentMonth);
        LocalDateTime monthStart = currentYM.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = currentYM.plusMonths(1).atDay(1).atStartOfDay();
        BigDecimal totalIncome = transactionRepository.sumByTypeAndPeriod(userId, TransactionType.INCOME, monthStart, monthEnd);
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;

        BigDecimal totalExpense = transactionRepository.sumByTypeAndPeriod(userId, TransactionType.EXPENSE, monthStart, monthEnd);
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        // Ngân sách hiện tại
        List<BudgetSummaryResponse> currentBudgets = budgetService.getBudgetSummary(userId, currentYear, currentMonth);

        // Số dư ví
        BigDecimal walletBalance = walletRepository.sumBalanceByUserId(userId);
        if (walletBalance == null) walletBalance = BigDecimal.ZERO;

        // Nợ
        BigDecimal totalOwing = debtService.getUserDebtSummary(userId).getTotalOwing();
        if (totalOwing == null) totalOwing = BigDecimal.ZERO;

        // Tiết kiệm
        BigDecimal totalSavings = savingsGoalRepository.sumCurrentAmountByUserId(userId);
        if (totalSavings == null) totalSavings = BigDecimal.ZERO;

        // Ngân sách chưa chi
        BigDecimal unpaidBudgets = BigDecimal.ZERO;
        for (BudgetSummaryResponse b : currentBudgets) {
            BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                unpaidBudgets = unpaidBudgets.add(remaining);
            }
        }

        // Tính Tiền nhàn rỗi (Safe to Spend) y hệt Dashboard
        BigDecimal safeToSpend = walletBalance.subtract(unpaidBudgets).subtract(totalOwing);
        if (safeToSpend.compareTo(BigDecimal.ZERO) < 0) safeToSpend = BigDecimal.ZERO;

        // Tính thu nhập trung bình 3 tháng cho Habit Analysis
        BigDecimal avgIncome3Months = getAvgIncome(userId, currentYear, currentMonth, 3);

        return FinancialAdviceResponse.builder()
                .budgetPlan(generateBudgetPlan(categoryHistory, currentBudgets, currentMonthSpending))
                .warnings(generateWarnings(categoryHistory, currentMonthSpending, currentYear, currentMonth, today.getDayOfMonth()))
                .habitAnalysis(generateHabitAnalysis(totalIncome, totalExpense, currentMonthSpending, avgIncome3Months))
                .savingsSuggestion(generateSavingsSuggestion(safeToSpend, categoryHistory, currentMonthSpending))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 1: One-Click Budget (Thuật toán Moving Average)
    // ═══════════════════════════════════════════════════════════════

    private List<BudgetSuggestion> generateBudgetPlan(
            Map<String, List<BigDecimal>> categoryHistory,
            List<BudgetSummaryResponse> currentBudgets,
            Map<String, BigDecimal> currentMonthSpending) {

        List<BudgetSuggestion> suggestions = new ArrayList<>();

        // Map budget hiện tại theo categoryName
        Map<String, BudgetSummaryResponse> budgetMap = currentBudgets.stream()
                .collect(Collectors.toMap(
                        BudgetSummaryResponse::getCategoryName,
                        b -> b,
                        (v1, v2) -> v1 // nếu trùng, lấy cái đầu
                ));

        for (Map.Entry<String, List<BigDecimal>> entry : categoryHistory.entrySet()) {
            String catName = entry.getKey();
            List<BigDecimal> monthlyAmounts = entry.getValue();

            if (monthlyAmounts.isEmpty()) continue;

            // Tính trung bình, loại bỏ outliers (> 2x trung bình)
            BigDecimal rawAvg = average(monthlyAmounts);
            List<BigDecimal> filtered = monthlyAmounts.stream()
                    .filter(a -> a.compareTo(rawAvg.multiply(BigDecimal.valueOf(2))) <= 0)
                    .collect(Collectors.toList());

            BigDecimal cleanAvg = filtered.isEmpty() ? rawAvg : average(filtered);

            // Làm tròn lên bội số 50.000đ
            BigDecimal suggested = roundUpTo(cleanAvg, 50000);

            // Skip nếu số tiền quá nhỏ (< 30.000đ)
            if (suggested.compareTo(BigDecimal.valueOf(30000)) < 0) continue;

            BudgetSummaryResponse existingBudget = budgetMap.get(catName);
            BigDecimal currentBudgetAmt = existingBudget != null ? existingBudget.getLimitAmount() : null;

            String reasoning;
            if (currentBudgetAmt == null) {
                reasoning = String.format("Bạn chưa đặt ngân sách cho %s. Trung bình 3 tháng qua bạn chi %s.",
                        catName, formatVND(cleanAvg));
            } else if (suggested.compareTo(currentBudgetAmt) > 0) {
                reasoning = String.format("Ngân sách hiện tại (%s) thấp hơn mức chi thực tế trung bình.",
                        formatVND(currentBudgetAmt));
            } else {
                reasoning = String.format("Ngân sách hiện tại (%s) phù hợp với thói quen chi tiêu.",
                        formatVND(currentBudgetAmt));
            }

            suggestions.add(BudgetSuggestion.builder()
                    .categoryName(catName)
                    .categoryIcon(existingBudget != null ? existingBudget.getCategoryIcon() : null)
                    .categoryId(existingBudget != null ? existingBudget.getCategoryId().toString() : null)
                    .suggestedAmount(suggested)
                    .currentBudget(currentBudgetAmt)
                    .avgSpent3Months(cleanAvg)
                    .reasoning(reasoning)
                    .build());
        }

        // Sắp xếp theo số tiền đề xuất giảm dần
        suggestions.sort((a, b) -> b.getSuggestedAmount().compareTo(a.getSuggestedAmount()));

        return suggestions;
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 2: Smart Alerts (Thuật toán Burn-rate Prediction)
    // ═══════════════════════════════════════════════════════════════

    private List<SpendingWarning> generateWarnings(
            Map<String, List<BigDecimal>> categoryHistory,
            Map<String, BigDecimal> currentMonthSpending,
            int year, int month, int dayOfMonth) {

        List<SpendingWarning> warnings = new ArrayList<>();

        // Tính tỷ lệ ngày đã qua trong tháng
        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
        double monthProgress = (double) dayOfMonth / daysInMonth;

        for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
            String catName = entry.getKey();
            BigDecimal currentSpent = entry.getValue();

            List<BigDecimal> history = categoryHistory.getOrDefault(catName, Collections.emptyList());
            if (history.isEmpty()) continue;

            BigDecimal avg3Month = average(history);
            if (avg3Month.compareTo(BigDecimal.ZERO) <= 0) continue;

            // Dự báo chi tiêu cả tháng dựa trên tốc độ hiện tại
            BigDecimal projectedSpend = monthProgress > 0
                    ? currentSpent.divide(BigDecimal.valueOf(monthProgress), 0, RoundingMode.HALF_UP)
                    : currentSpent;

            // So sánh projected với trung bình
            BigDecimal diff = projectedSpend.subtract(avg3Month);
            if (diff.compareTo(BigDecimal.ZERO) <= 0) continue;

            int increasePercent = diff.multiply(BigDecimal.valueOf(100))
                    .divide(avg3Month, 0, RoundingMode.HALF_UP).intValue();

            // Chỉ cảnh báo nếu tăng > 30%
            if (increasePercent < 30) continue;

            String severity = increasePercent >= 80 ? "HIGH" : "MEDIUM";
            String message;
            if (severity.equals("HIGH")) {
                message = String.format("🔴 %s đang tiêu gấp %.1f lần bình thường! Mới %d/%d ngày mà đã chi %s (trung bình cả tháng chỉ %s).",
                        catName, projectedSpend.doubleValue() / avg3Month.doubleValue(),
                        dayOfMonth, daysInMonth, formatVND(currentSpent), formatVND(avg3Month));
            } else {
                message = String.format("⚠️ Tốc độ chi tiêu %s cao hơn %d%% so với bình thường. Đã chi %s, dự kiến cuối tháng sẽ lên %s.",
                        catName, increasePercent, formatVND(currentSpent), formatVND(projectedSpend));
            }

            warnings.add(SpendingWarning.builder()
                    .categoryName(catName)
                    .currentMonthSpent(currentSpent)
                    .avg3MonthSpent(avg3Month)
                    .increasePercent(increasePercent)
                    .severity(severity)
                    .message(message)
                    .build());
        }

        // Sắp xếp: HIGH trước, rồi theo % tăng giảm dần
        warnings.sort((a, b) -> {
            int cmp = b.getSeverity().compareTo(a.getSeverity());
            return cmp != 0 ? cmp : Integer.compare(b.getIncreasePercent(), a.getIncreasePercent());
        });

        return warnings;
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 3: Habit Analyzer (Thuật toán phân cụm 50/30/20)
    // ═══════════════════════════════════════════════════════════════

    private HabitAnalysis generateHabitAnalysis(
            BigDecimal totalIncome, BigDecimal totalExpense,
            Map<String, BigDecimal> currentMonthSpending,
            BigDecimal avgIncome3Months) {

        BigDecimal needsAmount = BigDecimal.ZERO;
        BigDecimal wantsAmount = BigDecimal.ZERO;

        for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
            String catName = entry.getKey();
            BigDecimal amount = entry.getValue();

            if (NEEDS_CATEGORIES.contains(catName)) {
                needsAmount = needsAmount.add(amount);
            } else if (WANTS_CATEGORIES.contains(catName)) {
                wantsAmount = wantsAmount.add(amount);
            } else {
                // Các danh mục không xác định -> xếp vào Wants
                wantsAmount = wantsAmount.add(amount);
            }
        }

        // Tính phần trăm dựa trên thu nhập (ưu tiên avg 3 tháng nếu thu nhập tháng này = 0)
        BigDecimal refIncome = totalIncome.compareTo(BigDecimal.ZERO) > 0 ? totalIncome : avgIncome3Months;

        BigDecimal savingsAmount = refIncome.subtract(needsAmount).subtract(wantsAmount);
        if (savingsAmount.compareTo(BigDecimal.ZERO) < 0) savingsAmount = BigDecimal.ZERO;



        double needsPct = 0, wantsPct = 0, savingsPct = 0;
        if (refIncome.compareTo(BigDecimal.ZERO) > 0) {
            needsPct = needsAmount.multiply(BigDecimal.valueOf(100))
                    .divide(refIncome, 1, RoundingMode.HALF_UP).doubleValue();
            wantsPct = wantsAmount.multiply(BigDecimal.valueOf(100))
                    .divide(refIncome, 1, RoundingMode.HALF_UP).doubleValue();
            savingsPct = savingsAmount.multiply(BigDecimal.valueOf(100))
                    .divide(refIncome, 1, RoundingMode.HALF_UP).doubleValue();
        }

        // Đánh giá theo chuẩn 50/30/20
        String verdict;
        List<String> recommendations = new ArrayList<>();

        if (refIncome.compareTo(BigDecimal.ZERO) <= 0) {
            verdict = "Chưa đủ dữ liệu thu nhập để phân tích.";
            recommendations.add("Hãy ghi nhận thu nhập hàng tháng để hệ thống phân tích chính xác hơn.");
        } else {
            // Đánh giá Needs
            if (needsPct > 50) {
                verdict = "⚠️ Chi tiêu thiết yếu chiếm quá nhiều";
                recommendations.add(String.format("Chi phí thiết yếu đang chiếm %.0f%% thu nhập (chuẩn ≤ 50%%). Hãy rà soát lại tiền nhà, tiền ăn để tối ưu.", needsPct));
            } else if (wantsPct > 30) {
                verdict = "⚠️ Chi tiêu linh hoạt cao hơn khuyến nghị";
                recommendations.add(String.format("Chi tiêu mua sắm & giải trí chiếm %.0f%% thu nhập (chuẩn ≤ 30%%). Cắt giảm %.0f%% sẽ giúp tiết kiệm thêm %s/tháng.",
                        wantsPct, wantsPct - 30,
                        formatVND(wantsAmount.subtract(refIncome.multiply(BigDecimal.valueOf(0.3))))));
            } else if (savingsPct < 20) {
                verdict = "💡 Tỷ lệ tiết kiệm chưa đạt chuẩn";
                BigDecimal idealSave = refIncome.multiply(BigDecimal.valueOf(0.2));
                recommendations.add(String.format("Bạn chỉ tiết kiệm được %.0f%% (chuẩn ≥ 20%%). Cần tích lũy thêm %s/tháng.",
                        savingsPct, formatVND(idealSave.subtract(savingsAmount))));
            } else {
                verdict = "🌟 Tuyệt vời! Dòng tiền đang rất cân đối.";
            }

            // Thêm nhận xét chi tiết
            if (needsPct <= 50 && needsPct > 0) {
                recommendations.add(String.format("✅ Chi phí thiết yếu chiếm %.0f%% — đạt chuẩn (≤ 50%%).", needsPct));
            }
            if (wantsPct <= 30 && wantsPct > 0) {
                recommendations.add(String.format("✅ Chi tiêu linh hoạt chiếm %.0f%% — đạt chuẩn (≤ 30%%).", wantsPct));
            }
            if (savingsPct >= 20) {
                recommendations.add(String.format("✅ Tỷ lệ tiết kiệm %.0f%% — vượt chuẩn (≥ 20%%).", savingsPct));
            }
        }

        return HabitAnalysis.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .needsAmount(needsAmount)
                .wantsAmount(wantsAmount)
                .savingsAmount(savingsAmount)
                .needsPercent(needsPct)
                .wantsPercent(wantsPct)
                .savingsPercent(savingsPct)
                .verdict(verdict)
                .recommendations(recommendations)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 4: Idle Money Sweep (Gom tiền nhàn rỗi)
    // ═══════════════════════════════════════════════════════════════

    private SavingsSuggestion generateSavingsSuggestion(
            BigDecimal safeToSpend,
            Map<String, List<BigDecimal>> categoryHistory,
            Map<String, BigDecimal> currentMonthSpending) {

        BigDecimal idleAmount = safeToSpend;

        // Đề xuất tiết kiệm 50% số tiền nhàn rỗi
        BigDecimal suggestedSave = idleAmount.multiply(BigDecimal.valueOf(0.5)).setScale(0, RoundingMode.HALF_UP);

        // Tìm các khoản linh hoạt có thể cắt giảm
        List<CutSuggestion> cutSuggestions = new ArrayList<>();
        BigDecimal potentialSave = BigDecimal.ZERO;

        for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
            String catName = entry.getKey();
            if (!WANTS_CATEGORIES.contains(catName)) continue;

            BigDecimal currentSpent = entry.getValue();
            List<BigDecimal> history = categoryHistory.getOrDefault(catName, Collections.emptyList());
            BigDecimal avg = history.isEmpty() ? currentSpent : average(history);

            // Đề xuất cắt 20% so với mức chi trung bình
            BigDecimal suggestedLimit = avg.multiply(BigDecimal.valueOf(0.8)).setScale(0, RoundingMode.HALF_UP);
            BigDecimal savings = currentSpent.subtract(suggestedLimit);

            if (savings.compareTo(BigDecimal.valueOf(10000)) > 0) {
                String tip;
                if (catName.equals("Phí giao lưu")) {
                    tip = "Hạn chế 1-2 buổi cafe/nhậu mỗi tháng.";
                } else if (catName.equals("Mỹ phẩm")) {
                    tip = "Mua theo combo hoặc đợi khuyến mãi.";
                } else if (catName.equals("Quần áo")) {
                    tip = "Áp dụng nguyên tắc \"1 vào 1 ra\" khi mua đồ.";
                } else {
                    tip = "Xem xét lại nhu cầu thực sự trước khi chi.";
                }

                cutSuggestions.add(CutSuggestion.builder()
                        .categoryName(catName)
                        .currentSpent(currentSpent)
                        .suggestedLimit(suggestedLimit)
                        .savingsIfCut(savings)
                        .tip(tip)
                        .build());
                potentialSave = potentialSave.add(savings);
            }
        }

        cutSuggestions.sort((a, b) -> b.getSavingsIfCut().compareTo(a.getSavingsIfCut()));

        String message;
        if (idleAmount.compareTo(BigDecimal.ZERO) <= 0) {
            message = "Hiện tại bạn không có tiền nhàn rỗi. Hãy kiểm tra lại ngân sách và các khoản nợ.";
        } else if (idleAmount.compareTo(BigDecimal.valueOf(500000)) < 0) {
            message = String.format("Bạn đang có %s tiền nhàn rỗi khả dụng. Số tiền nhỏ nhưng đều đặn sẽ tích lũy lớn!", formatVND(idleAmount));
        } else {
            message = String.format("Chúc mừng! Hệ thống tính toán bạn đang dư %s an toàn. Hãy chuyển %s vào Quỹ tiết kiệm ngay!",
                    formatVND(idleAmount), formatVND(suggestedSave));
        }

        return SavingsSuggestion.builder()
                .idleAmount(idleAmount)
                .suggestedSaveAmount(suggestedSave)
                .potentialMonthlySave(potentialSave)
                .message(message)
                .cutSuggestions(cutSuggestions)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Thu thập lịch sử chi tiêu theo danh mục, mỗi phần tử là tổng chi 1 tháng.
     */
    private Map<String, List<BigDecimal>> collectCategoryHistory(UUID userId, int year, int month, int numMonths) {
        Map<String, List<BigDecimal>> result = new LinkedHashMap<>();

        for (int i = numMonths; i >= 1; i--) {
            YearMonth ym = YearMonth.of(year, month).minusMonths(i);
            List<Transaction> txs = transactionRepository.findByUserAndMonth(userId, ym.getYear(), ym.getMonthValue());

            Map<String, BigDecimal> monthData = new HashMap<>();
            for (Transaction tx : txs) {
                if (tx.getType() != TransactionType.EXPENSE || tx.isExcludeFromBudget()) continue;

                if (tx.isSplit() && tx.getSplits() != null && !tx.getSplits().isEmpty()) {
                    for (var split : tx.getSplits()) {
                        String catName = split.getCategory().getName();
                        monthData.merge(catName, split.getAmount(), BigDecimal::add);
                    }
                } else {
                    String catName = tx.getCategory().getName();
                    monthData.merge(catName, tx.getAmount(), BigDecimal::add);
                }
            }

            for (Map.Entry<String, BigDecimal> entry : monthData.entrySet()) {
                result.computeIfAbsent(entry.getKey(), k -> new ArrayList<>()).add(entry.getValue());
            }
        }

        return result;
    }

    /**
     * Lấy chi tiêu tháng hiện tại theo danh mục.
     */
    private Map<String, BigDecimal> getCurrentMonthSpending(UUID userId, int year, int month) {
        List<Transaction> txs = transactionRepository.findByUserAndMonth(userId, year, month);
        Map<String, BigDecimal> result = new HashMap<>();

        for (Transaction tx : txs) {
            if (tx.getType() != TransactionType.EXPENSE || tx.isExcludeFromBudget()) continue;

            if (tx.isSplit() && tx.getSplits() != null && !tx.getSplits().isEmpty()) {
                for (var split : tx.getSplits()) {
                    String catName = split.getCategory().getName();
                    result.merge(catName, split.getAmount(), BigDecimal::add);
                }
            } else {
                String catName = tx.getCategory().getName();
                result.merge(catName, tx.getAmount(), BigDecimal::add);
            }
        }

        return result;
    }

    /**
     * Tính thu nhập trung bình N tháng trước.
     */
    private BigDecimal getAvgIncome(UUID userId, int year, int month, int numMonths) {
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;

        for (int i = numMonths; i >= 1; i--) {
            YearMonth ym = YearMonth.of(year, month).minusMonths(i);
            LocalDateTime from = ym.atDay(1).atStartOfDay();
            LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();
            BigDecimal income = transactionRepository.sumByTypeAndPeriod(userId, TransactionType.INCOME, from, to);
            if (income != null && income.compareTo(BigDecimal.ZERO) > 0) {
                total = total.add(income);
                count++;
            }
        }

        return count > 0 ? total.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values == null || values.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal roundUpTo(BigDecimal value, long step) {
        BigDecimal stepBD = BigDecimal.valueOf(step);
        return value.divide(stepBD, 0, RoundingMode.CEILING).multiply(stepBD);
    }

    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0đ";
        return String.format("%,.0fđ", amount.doubleValue());
    }
}
