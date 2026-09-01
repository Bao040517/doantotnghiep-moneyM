package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.dto.response.FinancialAdviceResponse;
import com.example.sharemoney.dto.response.FinancialAdviceResponse.*;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trợ lý Tài chính Thông minh (Rule-based Expert System). Phân tích dữ liệu giao dịch lịch sử để
 * đưa ra tư vấn mà không cần AI.
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
    private static final Set<String> NEEDS_CATEGORIES =
            Set.of(
                    "Ăn uống",
                    "Tiền nhà",
                    "Tiền điện",
                    "Tiền nước",
                    "Đi lại",
                    "Y tế",
                    "Giáo dục",
                    "Phí liên lạc",
                    "Chi tiêu hàng ngày");

    // ─── Danh mục Linh hoạt (Wants) ───
    private static final Set<String> WANTS_CATEGORIES =
            Set.of("Quần áo", "Mỹ phẩm", "Phí giao lưu");

    /**
     * Entry point: Trả về toàn bộ kết quả phân tích cho một người dùng (mặc định tháng hiện tại).
     */
    @Transactional
    public FinancialAdviceResponse analyze(UUID userId) {
        return analyze(userId, null, null);
    }

    /** Overload analyze: Trả về kết quả phân tích theo năm và tháng chỉ định. */
    @Transactional
    public FinancialAdviceResponse analyze(UUID userId, Integer year, Integer month) {
        LocalDate today = LocalDate.now();
        int targetYear = (year != null && year > 0) ? year : today.getYear();
        int targetMonth =
                (month != null && month >= 1 && month <= 12) ? month : today.getMonthValue();

        // Thu thập dữ liệu 3 tháng trước (không tính tháng target)
        Map<String, List<BigDecimal>> categoryHistory =
                collectCategoryHistory(userId, targetYear, targetMonth, 3);

        // Dữ liệu tháng target
        Map<String, BigDecimal> currentMonthSpending =
                getCurrentMonthSpending(userId, targetYear, targetMonth);

        // Thu nhập tháng target
        YearMonth targetYM = YearMonth.of(targetYear, targetMonth);
        LocalDateTime monthStart = targetYM.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = targetYM.plusMonths(1).atDay(1).atStartOfDay();
        BigDecimal totalIncome =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.INCOME, monthStart, monthEnd);
        if (totalIncome == null) totalIncome = BigDecimal.ZERO;

        BigDecimal totalExpense =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.EXPENSE, monthStart, monthEnd);
        if (totalExpense == null) totalExpense = BigDecimal.ZERO;

        // Ngân sách tháng target
        List<BudgetSummaryResponse> currentBudgets =
                budgetService.getBudgetSummary(userId, targetYear, targetMonth);
        if (currentBudgets == null) currentBudgets = Collections.emptyList();

        // Số dư ví
        BigDecimal walletBalance = walletRepository.sumBalanceByUserId(userId);
        if (walletBalance == null) walletBalance = BigDecimal.ZERO;

        // Nợ
        BigDecimal totalOwing = BigDecimal.ZERO;
        var debtSummary = debtService.getUserDebtSummary(userId);
        if (debtSummary != null && debtSummary.getTotalOwing() != null) {
            totalOwing = debtSummary.getTotalOwing();
        }

        // Tiết kiệm
        BigDecimal totalSavings = savingsGoalRepository.sumCurrentAmountByUserId(userId);
        if (totalSavings == null) totalSavings = BigDecimal.ZERO;

        // Ngân sách chưa chi
        BigDecimal unpaidBudgets = BigDecimal.ZERO;
        for (BudgetSummaryResponse b : currentBudgets) {
            if (b == null || b.getLimitAmount() == null || b.getSpentAmount() == null) continue;
            BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                unpaidBudgets = unpaidBudgets.add(remaining);
            }
        }

        // Tính Tiền nhàn rỗi (Safe to Spend)
        BigDecimal safeToSpend = walletBalance.subtract(unpaidBudgets).subtract(totalOwing);
        if (safeToSpend.compareTo(BigDecimal.ZERO) < 0) safeToSpend = BigDecimal.ZERO;

        // Tính thu nhập trung bình 3 tháng cho Habit Analysis
        BigDecimal avgIncome3Months = getAvgIncome(userId, targetYear, targetMonth, 3);

        // Xác định dayOfMonth để đánh giá tốc độ chi tiêu (burn-rate)
        int evalDayOfMonth;
        if (targetYear == today.getYear() && targetMonth == today.getMonthValue()) {
            evalDayOfMonth = today.getDayOfMonth();
        } else if (targetYear < today.getYear()
                || (targetYear == today.getYear() && targetMonth < today.getMonthValue())) {
            evalDayOfMonth = targetYM.lengthOfMonth();
        } else {
            evalDayOfMonth = 1;
        }

        YearMonth lastYM = targetYM.minusMonths(1);
        Map<String, BigDecimal> lastMonthSpending =
                getCurrentMonthSpending(userId, lastYM.getYear(), lastYM.getMonthValue());
        List<BudgetSummaryResponse> lastMonthBudgets =
                budgetService.getBudgetSummary(userId, lastYM.getYear(), lastYM.getMonthValue());
        if (lastMonthBudgets == null) lastMonthBudgets = Collections.emptyList();

        return FinancialAdviceResponse.builder()
                .budgetPlan(
                        generateBudgetPlan(
                                categoryHistory,
                                currentBudgets,
                                lastMonthBudgets,
                                currentMonthSpending))
                .warnings(
                        generateWarnings(
                                categoryHistory,
                                currentMonthSpending,
                                lastMonthSpending,
                                targetYear,
                                targetMonth,
                                evalDayOfMonth))
                .habitAnalysis(
                        generateHabitAnalysis(
                                totalIncome,
                                totalExpense,
                                currentMonthSpending,
                                avgIncome3Months,
                                targetYear,
                                targetMonth))
                .savingsSuggestion(
                        generateSavingsSuggestion(
                                safeToSpend, categoryHistory, currentMonthSpending))
                .rebalancePlan(generateRebalancePlan(currentBudgets))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 1: One-Click Budget (Thuật toán Moving Average & So sánh tháng trước)
    // ═══════════════════════════════════════════════════════════════

    private List<BudgetSuggestion> generateBudgetPlan(
            Map<String, List<BigDecimal>> categoryHistory,
            List<BudgetSummaryResponse> currentBudgets,
            List<BudgetSummaryResponse> lastMonthBudgets,
            Map<String, BigDecimal> currentMonthSpending) {

        List<BudgetSuggestion> suggestions = new ArrayList<>();

        // Map budget hiện tại theo categoryName (chữ thường) và categoryId
        Map<String, BudgetSummaryResponse> budgetMap = new HashMap<>();
        if (currentBudgets != null) {
            for (BudgetSummaryResponse b : currentBudgets) {
                if (b != null && b.getCategoryName() != null) {
                    budgetMap.putIfAbsent(b.getCategoryName().toLowerCase().trim(), b);
                }
                if (b != null && b.getCategoryId() != null) {
                    budgetMap.putIfAbsent(b.getCategoryId().toString(), b);
                }
            }
        }

        // Map budget tháng trước theo categoryName
        Map<String, BudgetSummaryResponse> lastBudgetMap = new HashMap<>();
        if (lastMonthBudgets != null) {
            for (BudgetSummaryResponse b : lastMonthBudgets) {
                if (b != null && b.getCategoryName() != null) {
                    lastBudgetMap.putIfAbsent(b.getCategoryName().toLowerCase().trim(), b);
                }
                if (b != null && b.getCategoryId() != null) {
                    lastBudgetMap.putIfAbsent(b.getCategoryId().toString(), b);
                }
            }
        }

        for (Map.Entry<String, List<BigDecimal>> entry : categoryHistory.entrySet()) {
            String catName = entry.getKey();
            List<BigDecimal> monthlyAmounts = entry.getValue();

            if (catName == null || monthlyAmounts == null || monthlyAmounts.isEmpty()) continue;

            // Tính trung bình, loại bỏ outliers (> 2x trung bình)
            BigDecimal rawAvg = average(monthlyAmounts);
            List<BigDecimal> filtered =
                    monthlyAmounts.stream()
                            .filter(
                                    a ->
                                            a != null
                                                    && a.compareTo(
                                                                    rawAvg.multiply(
                                                                            BigDecimal.valueOf(2)))
                                                            <= 0)
                            .collect(Collectors.toList());

            BigDecimal cleanAvg = filtered.isEmpty() ? rawAvg : average(filtered);

            // Làm tròn lên bội số 50.000đ
            BigDecimal suggested = roundUpTo(cleanAvg, 50000);

            // Skip nếu số tiền quá nhỏ (< 30.000đ)
            if (suggested.compareTo(BigDecimal.valueOf(30000)) < 0) continue;

            BudgetSummaryResponse existingBudget = budgetMap.get(catName.toLowerCase().trim());
            BigDecimal currentBudgetAmt =
                    existingBudget != null ? existingBudget.getLimitAmount() : null;

            BudgetSummaryResponse lastBudget = lastBudgetMap.get(catName.toLowerCase().trim());
            BigDecimal lastMonthBudgetAmt = lastBudget != null ? lastBudget.getLimitAmount() : null;
            BigDecimal lastMonthSpentAmt = lastBudget != null ? lastBudget.getSpentAmount() : null;

            String reasoning;
            if (currentBudgetAmt == null) {
                reasoning =
                        String.format(
                                "Bạn chưa đặt ngân sách cho %s. Trung bình 3 tháng qua bạn chi %s.",
                                catName, formatVND(cleanAvg));
            } else if (suggested.compareTo(currentBudgetAmt) > 0) {
                reasoning =
                        String.format(
                                "Ngân sách hiện tại (%s) thấp hơn mức chi thực tế trung bình.",
                                formatVND(currentBudgetAmt));
            } else {
                reasoning =
                        String.format(
                                "Ngân sách hiện tại (%s) phù hợp với thói quen chi tiêu.",
                                formatVND(currentBudgetAmt));
            }

            String existingBudgetIdStr =
                    existingBudget != null && existingBudget.getBudgetId() != null
                            ? existingBudget.getBudgetId().toString()
                            : null;
            boolean hasBudgetBool = existingBudget != null;

            suggestions.add(
                    BudgetSuggestion.builder()
                            .categoryName(catName)
                            .categoryIcon(
                                    existingBudget != null
                                            ? existingBudget.getCategoryIcon()
                                            : (lastBudget != null
                                                    ? lastBudget.getCategoryIcon()
                                                    : null))
                            .categoryId(
                                    existingBudget != null && existingBudget.getCategoryId() != null
                                            ? existingBudget.getCategoryId().toString()
                                            : (lastBudget != null
                                                            && lastBudget.getCategoryId() != null
                                                    ? lastBudget.getCategoryId().toString()
                                                    : null))
                            .suggestedAmount(suggested)
                            .currentBudget(currentBudgetAmt)
                            .lastMonthBudget(lastMonthBudgetAmt)
                            .lastMonthSpent(lastMonthSpentAmt)
                            .avgSpent3Months(cleanAvg)
                            .reasoning(reasoning)
                            .budgetId(existingBudgetIdStr)
                            .hasBudget(hasBudgetBool)
                            .build());
        }

        // Sắp xếp theo số tiền đề xuất giảm dần
        suggestions.sort((a, b) -> b.getSuggestedAmount().compareTo(a.getSuggestedAmount()));

        return suggestions;
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 2: Smart Alerts (Thuật toán Cảnh Báo Thông Minh)
    // Phân biệt rõ:
    // - Khoản Linh hoạt (Flexible): Đánh giá theo Tốc độ đốt tiền (Burn-Rate) dự phóng cuối tháng
    // - Khoản Hóa đơn / Cố định / Đột xuất (Bill, Fixed, One-off): Không nhân theo ngày, so sánh trực tiếp với Tháng trước & TB 3 tháng
    // ═══════════════════════════════════════════════════════════════

    private List<SpendingWarning> generateWarnings(
            Map<String, List<BigDecimal>> categoryHistory,
            Map<String, BigDecimal> currentMonthSpending,
            Map<String, BigDecimal> lastMonthSpending,
            int year,
            int month,
            int dayOfMonth) {

        List<SpendingWarning> warnings = new ArrayList<>();

        // Nếu là tháng tương lai (chưa đến), không tạo cảnh báo
        LocalDate today = LocalDate.now();
        if (year > today.getYear() || (year == today.getYear() && month > today.getMonthValue())) {
            return warnings;
        }

        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
        double monthProgress = (double) dayOfMonth / daysInMonth;
        int effectiveDay = Math.max(1, dayOfMonth);
        int remainingDays = Math.max(1, daysInMonth - effectiveDay);

        if (currentMonthSpending == null || currentMonthSpending.isEmpty()) {
            return warnings;
        }

        for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
            String catName = entry.getKey();
            BigDecimal currentSpent = entry.getValue();

            if (catName == null || currentSpent == null || currentSpent.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            List<BigDecimal> history =
                    categoryHistory.getOrDefault(catName, Collections.emptyList());
            BigDecimal avg3Month = average(history);
            BigDecimal lastMonthSpent =
                    lastMonthSpending != null
                            ? lastMonthSpending.getOrDefault(catName, BigDecimal.ZERO)
                            : BigDecimal.ZERO;

            boolean isBill = isBillCategory(catName);

            if (isBill) {
                // ─── NHÓM 1: HÓA ĐƠN / CỐ ĐỊNH / ĐỘT XUẤT (BILL & ONE-OFF) ───
                // Tuyệt đối không nhân burn-rate theo ngày. So sánh trực tiếp thực chi với Tháng trước & TB 3 tháng.
                BigDecimal refBaseline = avg3Month.compareTo(BigDecimal.ZERO) > 0 ? avg3Month : lastMonthSpent;
                if (refBaseline.compareTo(BigDecimal.ZERO) <= 0) {
                    continue; // Chưa đủ lịch sử so sánh
                }

                int increaseVsAvg3Month = avg3Month.compareTo(BigDecimal.ZERO) > 0
                        ? currentSpent.subtract(avg3Month).multiply(BigDecimal.valueOf(100)).divide(avg3Month, 0, RoundingMode.HALF_UP).intValue()
                        : 0;

                int increaseVsLastMonth = (lastMonthSpent != null && lastMonthSpent.compareTo(BigDecimal.ZERO) > 0)
                        ? currentSpent.subtract(lastMonthSpent).multiply(BigDecimal.valueOf(100)).divide(lastMonthSpent, 0, RoundingMode.HALF_UP).intValue()
                        : 0;

                // Chỉ cảnh báo nếu chi tiêu >= 100.000đ và tăng > 25% so với tháng trước hoặc TB 3 tháng
                if (currentSpent.compareTo(BigDecimal.valueOf(100000)) < 0) continue;
                if (increaseVsAvg3Month < 25 && increaseVsLastMonth < 25) continue;

                int primaryIncreasePct = Math.max(increaseVsAvg3Month, increaseVsLastMonth);
                String severity = primaryIncreasePct >= 50 ? "HIGH" : "MEDIUM";

                String message;
                if (increaseVsLastMonth >= 25 && lastMonthSpent.compareTo(BigDecimal.ZERO) > 0) {
                    message = String.format(
                            "Khoản %s tháng này tăng +%d%% so với tháng trước (chi thực tế %s so với %s tháng trước).",
                            catName, increaseVsLastMonth, formatVND(currentSpent), formatVND(lastMonthSpent));
                } else {
                    message = String.format(
                            "Khoản %s phát sinh cao hơn +%d%% so với trung bình 3 tháng (chi thực tế %s so với mức chuẩn %s).",
                            catName, increaseVsAvg3Month, formatVND(currentSpent), formatVND(avg3Month));
                }

                BigDecimal diffAmount = currentSpent.subtract(refBaseline);
                String impactSummary = String.format(
                        "Chênh lệch tăng +%s so với mức chi tiêu định kỳ thông thường.",
                        formatVND(diffAmount));

                String actionableTip;
                String lowerCat = catName.toLowerCase();
                if (lowerCat.contains("điện") || lowerCat.contains("nước") || lowerCat.contains("mạng") || lowerCat.contains("wifi") || lowerCat.contains("dịch vụ")) {
                    actionableTip = "💡 Gợi ý: Kiểm tra lại các thiết bị tiêu thụ điện/nước công suất cao hoặc rà soát lại hóa đơn dịch vụ tháng này.";
                } else if (lowerCat.contains("y tế") || lowerCat.contains("thuốc") || lowerCat.contains("khám") || lowerCat.contains("bệnh") || lowerCat.contains("viện")) {
                    actionableTip = "💡 Đây là khoản chi y tế đột xuất. Bạn có thể trích từ Quỹ dự phòng/Điểm dừng an toàn hoặc tái cân bằng giảm các khoản Ăn uống, Mua sắm.";
                } else {
                    actionableTip = "💡 Hãy kiểm tra lại các khoản phí phát sinh hoặc điều chỉnh ngân sách các tháng tiếp theo cho phù hợp.";
                }

                warnings.add(
                        SpendingWarning.builder()
                                .categoryName(catName)
                                .warningType("BILL_SPIKE")
                                .currentMonthSpent(currentSpent)
                                .lastMonthSpent(lastMonthSpent)
                                .avg3MonthSpent(avg3Month)
                                .increasePercent(primaryIncreasePct)
                                .increaseVsLastMonth(increaseVsLastMonth)
                                .severity(severity)
                                .message(message)
                                .projectedMonthEnd(currentSpent) // Không nhân theo ngày
                                .dailyBurnRate(null) // Không có tốc độ/ngày cho bill
                                .recommendedDailyLimit(null)
                                .remainingDays(remainingDays)
                                .actionableTip(actionableTip)
                                .impactSummary(impactSummary)
                                .build());

            } else {
                // ─── NHÓM 2: CHI TIÊU LINH HOẠT HÀNG NGÀY (FLEXIBLE SPENDING) ───
                // Áp dụng Burn-rate Prediction dự phóng cuối tháng
                if (avg3Month.compareTo(BigDecimal.ZERO) <= 0) continue;

                // Tránh cảnh báo ảo 2 ngày đầu tháng trừ khi đã chi quá 50% trung bình tháng
                if (dayOfMonth < 3 && currentSpent.compareTo(avg3Month.multiply(BigDecimal.valueOf(0.5))) < 0) {
                    continue;
                }

                BigDecimal dailyBurnRate = currentSpent.divide(BigDecimal.valueOf(effectiveDay), 0, RoundingMode.HALF_UP);
                BigDecimal projectedSpend = monthProgress > 0
                        ? currentSpent.divide(BigDecimal.valueOf(monthProgress), 0, RoundingMode.HALF_UP)
                        : currentSpent;

                BigDecimal diff = projectedSpend.subtract(avg3Month);
                if (diff.compareTo(BigDecimal.ZERO) <= 0) continue;

                int increasePercent = diff.multiply(BigDecimal.valueOf(100))
                        .divide(avg3Month, 0, RoundingMode.HALF_UP)
                        .intValue();

                // Chỉ cảnh báo nếu tốc độ dự phóng tăng > 25%
                if (increasePercent < 25) continue;

                BigDecimal projectedOver = projectedSpend.subtract(avg3Month);

                BigDecimal recommendedDailyLimit;
                if (avg3Month.compareTo(currentSpent) > 0) {
                    recommendedDailyLimit = avg3Month.subtract(currentSpent)
                            .divide(BigDecimal.valueOf(remainingDays), 0, RoundingMode.HALF_UP);
                } else {
                    recommendedDailyLimit = dailyBurnRate.multiply(BigDecimal.valueOf(0.3)).setScale(0, RoundingMode.HALF_UP);
                }

                String severity = increasePercent >= 60 ? "HIGH" : "MEDIUM";
                String message;
                String actionableTip;
                String impactSummary;

                if (severity.equals("HIGH")) {
                    message = String.format(
                            "🔴 Đốt tiền quá nhanh! Đang chi trung bình %s/ngày (gấp %.1f lần bình thường).",
                            formatVND(dailyBurnRate),
                            projectedSpend.doubleValue() / avg3Month.doubleValue());
                    impactSummary = String.format(
                            "Dự kiến cả tháng lên tới %s (thâm hụt +%s so với mức chuẩn %s).",
                            formatVND(projectedSpend),
                            formatVND(projectedOver),
                            formatVND(avg3Month));
                    actionableTip = String.format(
                            "💡 Hành động ngay: Hạn chế chi tối đa %s/ngày trong %d ngày còn lại hoặc thực hiện Tái cân bằng ngân sách để bù đắp.",
                            formatVND(recommendedDailyLimit), remainingDays);
                } else {
                    message = String.format(
                            "⚠️ Tốc độ chi tiêu tăng %d%% so với trung bình 3 tháng.",
                            increasePercent);
                    impactSummary = String.format(
                            "Dự kiến cuối tháng sẽ chạm mốc %s (cao hơn bình thường %s).",
                            formatVND(projectedSpend), formatVND(projectedOver));
                    actionableTip = String.format(
                            "💡 Khuyến nghị: Giới hạn chi tối đa %s/ngày trong %d ngày tới để giữ an toàn ngân sách.",
                            formatVND(recommendedDailyLimit), remainingDays);
                }

                warnings.add(
                        SpendingWarning.builder()
                                .categoryName(catName)
                                .warningType("BURN_RATE")
                                .currentMonthSpent(currentSpent)
                                .lastMonthSpent(lastMonthSpent)
                                .avg3MonthSpent(avg3Month)
                                .increasePercent(increasePercent)
                                .severity(severity)
                                .message(message)
                                .projectedMonthEnd(projectedSpend)
                                .dailyBurnRate(dailyBurnRate)
                                .recommendedDailyLimit(recommendedDailyLimit)
                                .remainingDays(remainingDays)
                                .actionableTip(actionableTip)
                                .impactSummary(impactSummary)
                                .build());
            }
        }

        // Sắp xếp: HIGH trước, rồi theo % tăng giảm dần
        warnings.sort(
                (a, b) -> {
                    int cmp = b.getSeverity().compareTo(a.getSeverity());
                    return cmp != 0
                            ? cmp
                            : Integer.compare(b.getIncreasePercent(), a.getIncreasePercent());
                });

        return warnings;
    }

    /**
     * Nhận diện danh mục Hóa đơn / Cố định / Đột xuất (Bill, Fixed, One-off).
     * Tuyệt đối không áp dụng burn-rate theo ngày, mà so sánh trực tiếp với tháng trước & TB 3 tháng.
     */
    private boolean isBillCategory(String catName) {
        if (catName == null) return false;
        String lower = catName.toLowerCase().trim();
        List<String> billKeywords =
                Arrays.asList(
                        "điện", "tiền điện", "nước", "tiền nước", "nhà", "tiền nhà", "thuê nhà",
                        "mạng", "internet", "wifi", "truyền hình", "rác", "tiền rác",
                        "trả góp", "lãi vay", "vay", "bảo hiểm", "học phí", "học tập", "viễn thông",
                        "cố định", "định kỳ", "bill", "hóa đơn", "phí liên lạc", "phí quản lý",
                        "phí giữ xe", "gửi xe", "chung cư", "phí dịch vụ", "cước", "thuê bao",
                        "y tế", "khám", "khám bệnh", "thuốc", "bệnh viện", "viện phí", "nha khoa",
                        "sửa xe", "sửa nhà", "sửa chữa", "đám tiệc", "hiếu hỷ", "cưới hỏi", "sinh nhật",
                        "biếu tặng", "thuế", "phạt");
        return billKeywords.stream().anyMatch(lower::contains);
    }

    // ═══════════════════════════════════════════════════════════════
    // FEATURE 3: Habit Analyzer (Thuật toán phân cụm 50/30/20)
    // ═══════════════════════════════════════════════════════════════

    private HabitAnalysis generateHabitAnalysis(
            BigDecimal totalIncome,
            BigDecimal totalExpense,
            Map<String, BigDecimal> currentMonthSpending,
            BigDecimal avgIncome3Months,
            int targetYear,
            int targetMonth) {

        BigDecimal needsAmount = BigDecimal.ZERO;
        BigDecimal wantsAmount = BigDecimal.ZERO;

        if (currentMonthSpending != null) {
            for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
                String catName = entry.getKey();
                BigDecimal amount = entry.getValue();
                if (catName == null || amount == null) continue;

                if (NEEDS_CATEGORIES.contains(catName)) {
                    needsAmount = needsAmount.add(amount);
                } else if (WANTS_CATEGORIES.contains(catName)) {
                    wantsAmount = wantsAmount.add(amount);
                } else {
                    wantsAmount = wantsAmount.add(amount);
                }
            }
        }

        // Tính phần trăm dựa trên thu nhập
        BigDecimal refIncome =
                totalIncome.compareTo(BigDecimal.ZERO) > 0 ? totalIncome : avgIncome3Months;

        BigDecimal savingsAmount = refIncome.subtract(needsAmount).subtract(wantsAmount);
        if (savingsAmount.compareTo(BigDecimal.ZERO) < 0) savingsAmount = BigDecimal.ZERO;

        double needsPct = 0, wantsPct = 0, savingsPct = 0;
        if (refIncome.compareTo(BigDecimal.ZERO) > 0) {
            needsPct =
                    needsAmount
                            .multiply(BigDecimal.valueOf(100))
                            .divide(refIncome, 1, RoundingMode.HALF_UP)
                            .doubleValue();
            wantsPct =
                    wantsAmount
                            .multiply(BigDecimal.valueOf(100))
                            .divide(refIncome, 1, RoundingMode.HALF_UP)
                            .doubleValue();
            savingsPct =
                    savingsAmount
                            .multiply(BigDecimal.valueOf(100))
                            .divide(refIncome, 1, RoundingMode.HALF_UP)
                            .doubleValue();
        }

        // Đánh giá theo chuẩn 50/30/20
        String verdict = "";
        List<String> recommendations = new ArrayList<>();

        LocalDate today = LocalDate.now();
        boolean isFuture =
                targetYear > today.getYear()
                        || (targetYear == today.getYear() && targetMonth > today.getMonthValue());

        if (isFuture) {
            verdict =
                    String.format(
                            "🗓️ Tháng %d/%d là tháng trong tương lai (Chưa có dữ liệu chi tiêu thực tế).",
                            targetMonth, targetYear);
            recommendations.add(
                    String.format(
                            "Bạn đang xem gợi ý cho Tháng %d/%d. Hãy tạo trước các thẻ Ngân sách ở mục Kế hoạch bên dưới!",
                            targetMonth, targetYear));
        } else if (refIncome.compareTo(BigDecimal.ZERO) <= 0) {
            verdict = "Chưa đủ dữ liệu thu nhập để phân tích.";
            recommendations.add(
                    "Hãy ghi nhận thu nhập hàng tháng để hệ thống phân tích chính xác hơn.");
        } else {
            // Đánh giá Needs
            if (needsPct > 50) {
                verdict =
                        String.format(
                                "⚠️ Chi tiêu thiết yếu chiếm %.0f%% thu nhập (vượt chuẩn 50%%)",
                                needsPct);
                BigDecimal overNeeds =
                        needsAmount.subtract(refIncome.multiply(BigDecimal.valueOf(0.5)));
                recommendations.add(
                        String.format(
                                "📌 Chi phí thiết yếu đang chiếm %.0f%% thu nhập (vượt %s so với mức khuyến nghị 50%%). Việc này làm giảm không gian tích lũy. Gợi ý: Hãy rà soát tiền điện nước, gói cước viễn thông hoặc tối ưu chi phí đi lại.",
                                needsPct, formatVND(overNeeds)));
            } else {
                recommendations.add(
                        String.format(
                                "✅ Chi phí thiết yếu chiếm %.0f%% thu nhập — đang trong vùng an toàn (chuẩn ≤ 50%%).",
                                needsPct));
            }

            if (wantsPct > 30) {
                verdict =
                        String.format(
                                "🚨 Chi tiêu linh hoạt chiếm %.0f%% thu nhập (vượt chuẩn 30%%)",
                                wantsPct);
                BigDecimal overWants =
                        wantsAmount.subtract(refIncome.multiply(BigDecimal.valueOf(0.3)));
                recommendations.add(
                        String.format(
                                "🎯 Chi tiêu linh hoạt (ăn ngoài, mua sắm, giải trí) đang vượt %s so với chuẩn 30%%. Gợi ý: Hãy cắt giảm khoảng %s/ngày từ các khoản mua sắm tùy hứng.",
                                formatVND(overWants),
                                formatVND(
                                        overWants.divide(
                                                BigDecimal.valueOf(30), 0, RoundingMode.HALF_UP))));
            } else if (wantsPct > 0) {
                recommendations.add(
                        String.format(
                                "✅ Chi tiêu linh hoạt chiếm %.0f%% thu nhập — kiểm soát rất tốt (chuẩn ≤ 30%%).",
                                wantsPct));
            }

            if (savingsPct < 20) {
                BigDecimal lackSave =
                        refIncome.multiply(BigDecimal.valueOf(0.2)).subtract(savingsAmount);
                if (savingsPct <= 0) {
                    verdict = "⚠️ Dòng tiền thâm hụt — Chưa có khoản tích lũy";
                    recommendations.add(
                            "💰 Bạn chưa có khoản tích lũy nào trong tháng này. Hãy áp dụng nguyên tắc 'Pay yourself first' — trích nạp quỹ tích lũy ngay khi nhận thu nhập.");
                } else {
                    verdict =
                            String.format(
                                    "💡 Tỷ lệ tích lũy đạt %.0f%% (chưa đạt mục tiêu 20%%)",
                                    savingsPct);
                    recommendations.add(
                            String.format(
                                    "💰 Tỷ lệ tích lũy hiện đạt %.0f%% (thiếu %s để đạt chuẩn 20%%). Bạn nên duy trì trích lập cố định vào Ví Tiết Kiệm đầu mỗi tháng.",
                                    savingsPct, formatVND(lackSave)));
                }
            } else {
                recommendations.add(
                        String.format(
                                "🌟 Tỷ lệ tích lũy đạt %.0f%% thu nhập — xuất sắc! Bạn có thể cân nhắc chuyển bớt tiền nhàn rỗi sang mục tiêu tiết kiệm dài hạn.",
                                savingsPct));
            }

            if (needsPct <= 50 && wantsPct <= 30 && savingsPct >= 20) {
                verdict = "🌟 Tuyệt vời! Cơ cấu tài chính chuẩn 50/30/20";
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

        BigDecimal idleAmount = safeToSpend != null ? safeToSpend : BigDecimal.ZERO;

        // Đề xuất tiết kiệm 50% số tiền nhàn rỗi
        BigDecimal suggestedSave =
                idleAmount.multiply(BigDecimal.valueOf(0.5)).setScale(0, RoundingMode.HALF_UP);

        // Tìm các khoản linh hoạt có thể cắt giảm
        List<CutSuggestion> cutSuggestions = new ArrayList<>();
        BigDecimal potentialSave = BigDecimal.ZERO;

        if (currentMonthSpending != null) {
            for (Map.Entry<String, BigDecimal> entry : currentMonthSpending.entrySet()) {
                String catName = entry.getKey();
                if (catName == null || !WANTS_CATEGORIES.contains(catName)) continue;

                BigDecimal currentSpent = entry.getValue();
                if (currentSpent == null) continue;

                List<BigDecimal> history =
                        categoryHistory.getOrDefault(catName, Collections.emptyList());
                BigDecimal avg = history.isEmpty() ? currentSpent : average(history);

                // Đề xuất cắt 20% so với mức chi trung bình
                BigDecimal suggestedLimit =
                        avg.multiply(BigDecimal.valueOf(0.8)).setScale(0, RoundingMode.HALF_UP);
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

                    cutSuggestions.add(
                            CutSuggestion.builder()
                                    .categoryName(catName)
                                    .currentSpent(currentSpent)
                                    .suggestedLimit(suggestedLimit)
                                    .savingsIfCut(savings)
                                    .tip(tip)
                                    .build());
                    potentialSave = potentialSave.add(savings);
                }
            }
        }

        cutSuggestions.sort((a, b) -> b.getSavingsIfCut().compareTo(a.getSavingsIfCut()));

        String message;
        if (idleAmount.compareTo(BigDecimal.ZERO) <= 0) {
            message =
                    "Hiện tại bạn không có tiền nhàn rỗi. Hãy kiểm tra lại ngân sách và các khoản nợ.";
        } else if (idleAmount.compareTo(BigDecimal.valueOf(500000)) < 0) {
            message =
                    String.format(
                            "Bạn đang có %s tiền nhàn rỗi khả dụng. Số tiền nhỏ nhưng đều đặn sẽ tích lũy lớn!",
                            formatVND(idleAmount));
        } else {
            message =
                    String.format(
                            "Chúc mừng! Hệ thống tính toán bạn đang dư %s an toàn. Hãy chuyển %s vào Quỹ tiết kiệm ngay!",
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
    // FEATURE 5: Dynamic Budget Rebalance & Overspending Compensation V2
    // (Tái cân bằng phân tầng ưu tiên: Cắt giảm Hưởng thụ trước -> Sinh hoạt sau -> Vét sai số làm
    // tròn)
    // ═══════════════════════════════════════════════════════════════

    public RebalancePlan generateRebalancePlan(List<BudgetSummaryResponse> currentBudgets) {
        if (currentBudgets == null || currentBudgets.isEmpty()) {
            return RebalancePlan.builder()
                    .hasOverspending(false)
                    .totalOverspent(BigDecimal.ZERO)
                    .totalCompensated(BigDecimal.ZERO)
                    .remainingDeficit(BigDecimal.ZERO)
                    .statusMessage(
                            "Chưa có dữ liệu ngân sách trong tháng này để phân tích tái cân bằng.")
                    .overspentItems(Collections.emptyList())
                    .compensationCuts(Collections.emptyList())
                    .build();
        }

        List<OverspentItem> overspentItems = new ArrayList<>();
        List<BudgetSummaryResponse> tier1Luxury = new ArrayList<>();
        List<BudgetSummaryResponse> tier2Basic = new ArrayList<>();
        BigDecimal totalOverspent = BigDecimal.ZERO;
        BigDecimal totalTier1Avail = BigDecimal.ZERO;
        BigDecimal totalTier2Avail = BigDecimal.ZERO;

        for (BudgetSummaryResponse b : currentBudgets) {
            if (b == null || b.getLimitAmount() == null || b.getSpentAmount() == null) continue;

            BigDecimal limit = b.getLimitAmount();
            BigDecimal spent = b.getSpentAmount();
            boolean isFixed = isFixedBudget(b);

            if (spent.compareTo(limit) > 0) {
                // Tiêu lố ngân sách (cả khoản Cố định lẫn Linh hoạt)
                BigDecimal overspent = spent.subtract(limit);
                totalOverspent = totalOverspent.add(overspent);
                int overPct =
                        limit.compareTo(BigDecimal.ZERO) > 0
                                ? overspent
                                        .multiply(BigDecimal.valueOf(100))
                                        .divide(limit, 0, RoundingMode.HALF_UP)
                                        .intValue()
                                : 100;

                overspentItems.add(
                        OverspentItem.builder()
                                .categoryId(
                                        b.getCategoryId() != null
                                                ? b.getCategoryId().toString()
                                                : null)
                                .categoryName(
                                        b.getCategoryName() != null
                                                ? b.getCategoryName()
                                                : b.getName())
                                .categoryIcon(b.getCategoryIcon())
                                .limitAmount(limit)
                                .spentAmount(spent)
                                .overspentAmount(overspent)
                                .overspentPercent(overPct)
                                .isFixed(isFixed)
                                .categoryType(isFixed ? "FIXED" : "FLEXIBLE")
                                .build());
            } else if (limit.compareTo(spent) > 0) {
                // Chưa chi hết: TUYỆT ĐỐI CHỈ xem xét cắt giảm nếu là danh mục LINH HOẠT (không
                // phải Cố định/Bill)
                if (!isFixed) {
                    BigDecimal remaining = limit.subtract(spent);
                    // Chỉ cắt giảm nếu số tiền còn dư >= 10.000đ
                    if (remaining.compareTo(BigDecimal.valueOf(10000)) >= 0) {
                        if (isLuxuryCategory(b)) {
                            tier1Luxury.add(b);
                            totalTier1Avail = totalTier1Avail.add(remaining);
                        } else {
                            tier2Basic.add(b);
                            totalTier2Avail = totalTier2Avail.add(remaining);
                        }
                    }
                }
            }
        }

        if (overspentItems.isEmpty() || totalOverspent.compareTo(BigDecimal.ZERO) <= 0) {
            return RebalancePlan.builder()
                    .hasOverspending(false)
                    .totalOverspent(BigDecimal.ZERO)
                    .totalCompensated(BigDecimal.ZERO)
                    .remainingDeficit(BigDecimal.ZERO)
                    .statusMessage(
                            "🎉 Tuyệt vời! Tất cả các khoản chi tiêu tháng này đều đang trong tầm kiểm soát.")
                    .overspentItems(Collections.emptyList())
                    .compensationCuts(Collections.emptyList())
                    .build();
        }

        // Sắp xếp các khoản tiêu lố theo số tiền lố giảm dần
        overspentItems.sort((a, b) -> b.getOverspentAmount().compareTo(a.getOverspentAmount()));

        List<CompensateCutItem> compensationCuts = new ArrayList<>();
        BigDecimal remainingNeed = totalOverspent;

        // ─── TẦNG 1: Cắt giảm từ nhóm Siêu linh hoạt / Hưởng thụ (Tier 1 Luxury) ───
        // Quy tắc: Chỉ thay đổi với những khoản flexible có phần ngân sách còn dư lớn hơn phần bù
        // trừ
        // Đảm bảo sau khi cắt, ngân sách còn lại luôn > 0 (giữ lại tối thiểu 20.000đ vùng an toàn)
        if (!tier1Luxury.isEmpty() && remainingNeed.compareTo(BigDecimal.ZERO) > 0) {
            for (BudgetSummaryResponse b : tier1Luxury) {
                if (remainingNeed.compareTo(BigDecimal.ZERO) <= 0) break;
                BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());

                // Chỉ cắt nếu ngân sách còn dư > 20.000đ
                if (remaining.compareTo(BigDecimal.valueOf(20000)) <= 0) continue;

                // Mức cắt tối đa giữ lại tối thiểu 20.000đ vùng an toàn
                BigDecimal maxCutAllowed = remaining.subtract(BigDecimal.valueOf(20000));
                if (maxCutAllowed.compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal cutAmount = remainingNeed.min(maxCutAllowed);
                // Làm tròn về số nguyên đồng (không ép về 0 nếu < 10k)
                cutAmount = cutAmount.setScale(0, RoundingMode.HALF_UP);

                if (cutAmount.compareTo(BigDecimal.ZERO) > 0
                        && cutAmount.compareTo(remaining) < 0) {
                    BigDecimal newLimit = b.getLimitAmount().subtract(cutAmount);
                    remainingNeed = remainingNeed.subtract(cutAmount);

                    String reason =
                            String.format(
                                    "Cắt giảm %s từ ngân sách hưởng thụ (còn dư %s > mức bù %s).",
                                    formatVND(cutAmount),
                                    formatVND(remaining),
                                    formatVND(cutAmount));

                    compensationCuts.add(
                            CompensateCutItem.builder()
                                    .categoryId(
                                            b.getCategoryId() != null
                                                    ? b.getCategoryId().toString()
                                                    : null)
                                    .categoryName(
                                            b.getCategoryName() != null
                                                    ? b.getCategoryName()
                                                    : b.getName())
                                    .categoryIcon(b.getCategoryIcon())
                                    .currentLimit(b.getLimitAmount())
                                    .currentSpent(b.getSpentAmount())
                                    .availableRemaining(remaining)
                                    .suggestedCutAmount(cutAmount)
                                    .newSuggestedLimit(newLimit)
                                    .tier("TIER_1_LUXURY")
                                    .tierLabel("Ưu tiên cắt giảm (Hưởng thụ)")
                                    .reason(reason)
                                    .build());
                }
            }
        }

        // ─── TẦNG 2: Cắt giảm từ nhóm Linh hoạt cơ bản / Sinh hoạt (Tier 2 Basic) ───
        // (Chỉ kích hoạt nếu Tier 1 chưa đủ bù đắp và remainingNeed vẫn > 0)
        // Quy tắc: Chỉ thay đổi với những khoản flexible có phần ngân sách còn dư lớn hơn phần bù
        // trừ
        if (!tier2Basic.isEmpty() && remainingNeed.compareTo(BigDecimal.ZERO) > 0) {
            for (BudgetSummaryResponse b : tier2Basic) {
                if (remainingNeed.compareTo(BigDecimal.ZERO) <= 0) break;
                BigDecimal remaining = b.getLimitAmount().subtract(b.getSpentAmount());

                // Chỉ cắt nếu ngân sách còn dư > 20.000đ
                if (remaining.compareTo(BigDecimal.valueOf(20000)) <= 0) continue;

                // Mức cắt tối đa giữ lại tối thiểu 20.000đ vùng an toàn
                BigDecimal maxCutAllowed = remaining.subtract(BigDecimal.valueOf(20000));
                if (maxCutAllowed.compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal cutAmount = remainingNeed.min(maxCutAllowed);
                cutAmount = cutAmount.setScale(0, RoundingMode.HALF_UP);

                if (cutAmount.compareTo(BigDecimal.ZERO) > 0
                        && cutAmount.compareTo(remaining) < 0) {
                    BigDecimal newLimit = b.getLimitAmount().subtract(cutAmount);
                    remainingNeed = remainingNeed.subtract(cutAmount);

                    String reason =
                            String.format(
                                    "Cắt giảm bổ sung %s từ khoản sinh hoạt (còn dư %s > mức bù %s).",
                                    formatVND(cutAmount),
                                    formatVND(remaining),
                                    formatVND(cutAmount));

                    compensationCuts.add(
                            CompensateCutItem.builder()
                                    .categoryId(
                                            b.getCategoryId() != null
                                                    ? b.getCategoryId().toString()
                                                    : null)
                                    .categoryName(
                                            b.getCategoryName() != null
                                                    ? b.getCategoryName()
                                                    : b.getName())
                                    .categoryIcon(b.getCategoryIcon())
                                    .currentLimit(b.getLimitAmount())
                                    .currentSpent(b.getSpentAmount())
                                    .availableRemaining(remaining)
                                    .suggestedCutAmount(cutAmount)
                                    .newSuggestedLimit(newLimit)
                                    .tier("TIER_2_BASIC")
                                    .tierLabel("Cắt giảm bổ sung (Sinh hoạt)")
                                    .reason(reason)
                                    .build());
                }
            }
        }

        // Bổ sung tất cả các danh mục linh hoạt khác (chưa bị tiêu lố, đã chi hết hoặc không cần
        // cắt thêm) vào danh sách với trạng thái ĐÃ CÂN BẰNG
        Set<String> cutCategoryNames = new HashSet<>();
        for (CompensateCutItem cut : compensationCuts) {
            if (cut.getCategoryName() != null) {
                cutCategoryNames.add(cut.getCategoryName().toLowerCase());
            }
        }

        Set<String> overspentCategoryNames = new HashSet<>();
        for (OverspentItem oi : overspentItems) {
            if (oi.getCategoryName() != null) {
                overspentCategoryNames.add(oi.getCategoryName().toLowerCase());
            }
        }

        for (BudgetSummaryResponse b : currentBudgets) {
            if (b == null || isFixedBudget(b)) continue;
            String catName = b.getCategoryName() != null ? b.getCategoryName() : b.getName();
            if (catName != null
                    && !cutCategoryNames.contains(catName.toLowerCase())
                    && !overspentCategoryNames.contains(catName.toLowerCase())) {
                BigDecimal limit =
                        b.getLimitAmount() != null ? b.getLimitAmount() : BigDecimal.ZERO;
                BigDecimal spent =
                        b.getSpentAmount() != null ? b.getSpentAmount() : BigDecimal.ZERO;
                BigDecimal remaining =
                        limit.compareTo(spent) > 0 ? limit.subtract(spent) : BigDecimal.ZERO;
                boolean isLuxury = isLuxuryCategory(b);

                compensationCuts.add(
                        CompensateCutItem.builder()
                                .categoryId(
                                        b.getCategoryId() != null
                                                ? b.getCategoryId().toString()
                                                : null)
                                .categoryName(catName)
                                .categoryIcon(b.getCategoryIcon())
                                .currentLimit(limit)
                                .currentSpent(spent)
                                .availableRemaining(remaining)
                                .suggestedCutAmount(BigDecimal.ZERO)
                                .newSuggestedLimit(limit)
                                .tier(isLuxury ? "TIER_1_LUXURY" : "TIER_2_BASIC")
                                .tierLabel(
                                        isLuxury
                                                ? "✨ Hưởng thụ (Đã cân bằng)"
                                                : "🛒 Sinh hoạt (Đã cân bằng)")
                                .reason(
                                        remaining.compareTo(BigDecimal.ZERO) > 0
                                                ? String.format(
                                                        "Danh mục đang cân bằng an toàn (còn dư %s trong hạn mức %s).",
                                                        formatVND(remaining), formatVND(limit))
                                                : String.format(
                                                        "Danh mục đã chi hết hạn mức %s và đang được giữ ổn định.",
                                                        formatVND(limit)))
                                .isBalanced(true)
                                .build());
            }
        }

        BigDecimal totalCompensated =
                compensationCuts.stream()
                        .filter(c -> c.getSuggestedCutAmount() != null)
                        .map(CompensateCutItem::getSuggestedCutAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingDeficit = totalOverspent.subtract(totalCompensated);
        if (remainingDeficit.compareTo(BigDecimal.ZERO) < 0) remainingDeficit = BigDecimal.ZERO;

        long activeCutsCount =
                compensationCuts.stream()
                        .filter(
                                c ->
                                        c.getSuggestedCutAmount() != null
                                                && c.getSuggestedCutAmount()
                                                                .compareTo(BigDecimal.ZERO)
                                                        > 0)
                        .count();

        String statusMessage;
        if (remainingDeficit.compareTo(BigDecimal.ZERO) == 0) {
            statusMessage =
                    String.format(
                            "Bạn đã tiêu lố %s ở %d danh mục. Đã lập phương án ưu tiên cắt giảm %d danh mục linh hoạt để bù đắp 100%%!",
                            formatVND(totalOverspent), overspentItems.size(), activeCutsCount);
        } else if (totalCompensated.compareTo(BigDecimal.ZERO) > 0) {
            statusMessage =
                    String.format(
                            "Bạn đã tiêu lố %s. Đã ưu tiên bù đắp %s từ %d khoản linh hoạt. Phần thâm hụt còn lại %s sẽ được trích từ quỹ dự phòng.",
                            formatVND(totalOverspent),
                            formatVND(totalCompensated),
                            activeCutsCount,
                            formatVND(remainingDeficit));
        } else {
            statusMessage =
                    String.format(
                            "Bạn đã tiêu lố %s. Tất cả %d danh mục linh hoạt khác đã ở trạng thái cân bằng hoặc không còn đủ số dư để cắt giảm.",
                            formatVND(totalOverspent), compensationCuts.size());
        }

        return RebalancePlan.builder()
                .hasOverspending(true)
                .totalOverspent(totalOverspent)
                .totalCompensated(totalCompensated)
                .remainingDeficit(remainingDeficit)
                .statusMessage(statusMessage)
                .overspentItems(overspentItems)
                .compensationCuts(compensationCuts)
                .build();
    }

    /**
     * Thực thi áp dụng kế hoạch Tái cân bằng ngân sách: Cập nhật hạn mức ngân sách mới vào
     * Database. Hỗ trợ nhận danh sách tùy chỉnh (Override) từ Client hoặc chạy tự động.
     */
    @Transactional
    public com.example.sharemoney.dto.response.RebalanceApplyResponse applyRebalance(
            UUID userId,
            Integer year,
            Integer month,
            com.example.sharemoney.dto.request.RebalanceApplyRequest request) {
        LocalDate today = LocalDate.now();
        int targetYear = (year != null && year > 0) ? year : today.getYear();
        int targetMonth =
                (month != null && month >= 1 && month <= 12) ? month : today.getMonthValue();

        List<BudgetSummaryResponse> currentBudgets =
                budgetService.getBudgetSummary(userId, targetYear, targetMonth);
        RebalancePlan plan = generateRebalancePlan(currentBudgets);

        if (!plan.isHasOverspending()) {
            return com.example.sharemoney.dto.response.RebalanceApplyResponse.builder()
                    .success(false)
                    .message("Không có khoản tiêu lố nào cần bù trừ trong tháng này.")
                    .totalCompensated(BigDecimal.ZERO)
                    .updatedCategoriesCount(0)
                    .build();
        }

        int updatedCount = 0;
        BigDecimal appliedTotal = BigDecimal.ZERO;

        // Trường hợp 1: Có request tùy chỉnh (custom override) từ Client
        if (request != null && request.getCuts() != null && !request.getCuts().isEmpty()) {
            for (var customCut : request.getCuts()) {
                if (customCut.getCategoryId() == null
                        || (customCut.getNewLimit() == null && customCut.getCutAmount() == null))
                    continue;
                try {
                    UUID catId = UUID.fromString(customCut.getCategoryId());
                    List<com.example.sharemoney.entity.Budget> budgets =
                            budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                                    userId, catId, targetMonth, targetYear);
                    if (budgets != null && !budgets.isEmpty()) {
                        for (var b : budgets) {
                            BigDecimal newLimit = customCut.getNewLimit();
                            if (newLimit == null && customCut.getCutAmount() != null) {
                                newLimit = b.getLimitAmount().subtract(customCut.getCutAmount());
                            }
                            if (newLimit != null && newLimit.compareTo(BigDecimal.ZERO) >= 0) {
                                BigDecimal cutAmt = b.getLimitAmount().subtract(newLimit);
                                if (cutAmt.compareTo(BigDecimal.ZERO) > 0) {
                                    appliedTotal = appliedTotal.add(cutAmt);
                                }
                                b.setLimitAmount(newLimit);
                                budgetRepository.save(b);
                                updatedCount++;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn(
                            "Failed to apply custom override for categoryId: {}",
                            customCut.getCategoryId(),
                            e);
                }
            }
        } else {
            // Trường hợp 2: Áp dụng toàn bộ theo kế hoạch tự động của AI
            if (plan.getCompensationCuts().isEmpty()) {
                return com.example.sharemoney.dto.response.RebalanceApplyResponse.builder()
                        .success(false)
                        .message("Không tìm thấy danh mục linh hoạt nào khả dụng để cắt giảm.")
                        .totalCompensated(BigDecimal.ZERO)
                        .updatedCategoriesCount(0)
                        .build();
            }

            for (CompensateCutItem cut : plan.getCompensationCuts()) {
                if (cut.getCategoryId() == null || cut.getNewSuggestedLimit() == null) continue;
                if (cut.getSuggestedCutAmount() == null
                        || cut.getSuggestedCutAmount().compareTo(BigDecimal.ZERO) <= 0) continue;
                try {
                    UUID catId = UUID.fromString(cut.getCategoryId());
                    List<com.example.sharemoney.entity.Budget> budgets =
                            budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                                    userId, catId, targetMonth, targetYear);
                    if (budgets != null && !budgets.isEmpty()) {
                        for (var b : budgets) {
                            b.setLimitAmount(cut.getNewSuggestedLimit());
                            budgetRepository.save(b);
                            updatedCount++;
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to update budget for categoryId: {}", cut.getCategoryId(), e);
                }
            }
            appliedTotal = plan.getTotalCompensated();
        }

        // Bù đắp số tiền đã cắt giảm sang các danh mục bị tiêu lố để đưa ngân sách về trạng thái
        // cân bằng
        if (appliedTotal.compareTo(BigDecimal.ZERO) > 0 && plan.getOverspentItems() != null) {
            BigDecimal toCompensate = appliedTotal;
            for (OverspentItem item : plan.getOverspentItems()) {
                if (toCompensate.compareTo(BigDecimal.ZERO) <= 0) break;
                if (item.getCategoryId() == null) continue;
                try {
                    UUID overCatId = UUID.fromString(item.getCategoryId());
                    List<com.example.sharemoney.entity.Budget> overBudgets =
                            budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                                    userId, overCatId, targetMonth, targetYear);
                    if (overBudgets != null && !overBudgets.isEmpty()) {
                        for (var ob : overBudgets) {
                            BigDecimal overAmt = item.getOverspentAmount();
                            if (overAmt != null && overAmt.compareTo(BigDecimal.ZERO) > 0) {
                                BigDecimal addAmt = toCompensate.min(overAmt);
                                ob.setLimitAmount(ob.getLimitAmount().add(addAmt));
                                budgetRepository.save(ob);
                                toCompensate = toCompensate.subtract(addAmt);
                                if (toCompensate.compareTo(BigDecimal.ZERO) <= 0) break;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn(
                            "Failed to increase overspent budget limit for categoryId: {}",
                            item.getCategoryId(),
                            e);
                }
            }
        }

        return com.example.sharemoney.dto.response.RebalanceApplyResponse.builder()
                .success(true)
                .message(
                        String.format(
                                "Tái cân bằng thành công! Đã điều chỉnh hạn mức %d danh mục để bù đắp %,.0fđ tiêu lố.",
                                updatedCount, appliedTotal.doubleValue()))
                .totalCompensated(appliedTotal)
                .updatedCategoriesCount(updatedCount)
                .build();
    }

    /** Overload cho phương thức applyRebalance */
    @Transactional
    public com.example.sharemoney.dto.response.RebalanceApplyResponse applyRebalance(
            UUID userId, Integer year, Integer month) {
        return applyRebalance(userId, year, month, null);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Nhận diện khoản chi Cố định / Hóa đơn / Bắt buộc (Fixed Costs / Bills). Tuyệt đối không cắt
     * giảm hạn mức của các khoản này.
     */
    private boolean isFixedBudget(BudgetSummaryResponse b) {
        if (b == null) return false;
        if (b.isMandatory()) return true;
        if ("MANDATORY".equalsIgnoreCase(b.getType())) return true;

        String name =
                (b.getName() != null ? b.getName() : "")
                        + " "
                        + (b.getCategoryName() != null ? b.getCategoryName() : "");
        String lower = name.toLowerCase();

        List<String> fixedKeywords =
                Arrays.asList(
                        "điện",
                        "tiền điện",
                        "nước",
                        "tiền nước",
                        "nhà",
                        "tiền nhà",
                        "thuê nhà",
                        "mạng",
                        "internet",
                        "wifi",
                        "rác",
                        "tiền rác",
                        "trả góp",
                        "lãi vay",
                        "vay",
                        "bảo hiểm",
                        "học phí",
                        "phí liên lạc",
                        "viễn thông",
                        "cố định",
                        "định kỳ",
                        "bill",
                        "hóa đơn",
                        "phí quản lý",
                        "phí giữ xe",
                        "gửi xe",
                        "chung cư");

        return fixedKeywords.stream().anyMatch(lower::contains);
    }

    /**
     * Nhận diện danh mục Siêu linh hoạt / Hưởng thụ (Tier 1 Luxury / High Elasticity). Sẽ được ưu
     * tiên cắt giảm TỐI ĐA trước khi đụng đến các khoản sinh hoạt khác.
     */
    private boolean isLuxuryCategory(BudgetSummaryResponse b) {
        if (b == null) return false;
        String name =
                (b.getName() != null ? b.getName() : "")
                        + " "
                        + (b.getCategoryName() != null ? b.getCategoryName() : "");
        String lower = name.toLowerCase();

        List<String> luxuryKeywords =
                Arrays.asList(
                        "mua sắm",
                        "shopping",
                        "giải trí",
                        "entertainment",
                        "du lịch",
                        "travel",
                        "làm đẹp",
                        "mỹ phẩm",
                        "beauty",
                        "spa",
                        "thời trang",
                        "quần áo",
                        "clothes",
                        "fashion",
                        "giao lưu",
                        "nhậu",
                        "tiệc tùng",
                        "bar",
                        "pub",
                        "game",
                        "đồ chơi",
                        "sở thích",
                        "hobbies",
                        "trang sức",
                        "quà tặng");

        return luxuryKeywords.stream().anyMatch(lower::contains);
    }

    /** Thu thập lịch sử chi tiêu theo danh mục, mỗi phần tử là tổng chi 1 tháng. */
    private Map<String, List<BigDecimal>> collectCategoryHistory(
            UUID userId, int year, int month, int numMonths) {
        Map<String, List<BigDecimal>> result = new LinkedHashMap<>();

        for (int i = numMonths; i >= 1; i--) {
            YearMonth ym = YearMonth.of(year, month).minusMonths(i);
            List<Transaction> txs =
                    transactionRepository.findByUserAndMonth(
                            userId, ym.getYear(), ym.getMonthValue());
            if (txs == null) continue;

            Map<String, BigDecimal> monthData = new HashMap<>();
            for (Transaction tx : txs) {
                if (tx == null
                        || tx.getType() != TransactionType.EXPENSE
                        || tx.isExcludeFromBudget()) continue;

                if (tx.isSplit() && tx.getSplits() != null && !tx.getSplits().isEmpty()) {
                    for (var split : tx.getSplits()) {
                        if (split != null
                                && split.getCategory() != null
                                && split.getCategory().getName() != null
                                && split.getAmount() != null) {
                            String catName = split.getCategory().getName();
                            monthData.merge(catName, split.getAmount(), BigDecimal::add);
                        }
                    }
                } else if (tx.getCategory() != null
                        && tx.getCategory().getName() != null
                        && tx.getAmount() != null) {
                    String catName = tx.getCategory().getName();
                    monthData.merge(catName, tx.getAmount(), BigDecimal::add);
                }
            }

            for (Map.Entry<String, BigDecimal> entry : monthData.entrySet()) {
                result.computeIfAbsent(entry.getKey(), k -> new ArrayList<>())
                        .add(entry.getValue());
            }
        }

        return result;
    }

    /** Lấy chi tiêu tháng hiện tại theo danh mục. */
    private Map<String, BigDecimal> getCurrentMonthSpending(UUID userId, int year, int month) {
        List<Transaction> txs = transactionRepository.findByUserAndMonth(userId, year, month);
        Map<String, BigDecimal> result = new HashMap<>();
        if (txs == null) return result;

        for (Transaction tx : txs) {
            if (tx == null || tx.getType() != TransactionType.EXPENSE || tx.isExcludeFromBudget())
                continue;

            if (tx.isSplit() && tx.getSplits() != null && !tx.getSplits().isEmpty()) {
                for (var split : tx.getSplits()) {
                    if (split != null
                            && split.getCategory() != null
                            && split.getCategory().getName() != null
                            && split.getAmount() != null) {
                        String catName = split.getCategory().getName();
                        result.merge(catName, split.getAmount(), BigDecimal::add);
                    }
                }
            } else if (tx.getCategory() != null
                    && tx.getCategory().getName() != null
                    && tx.getAmount() != null) {
                String catName = tx.getCategory().getName();
                result.merge(catName, tx.getAmount(), BigDecimal::add);
            }
        }

        return result;
    }

    /** Tính thu nhập trung bình N tháng trước. */
    private BigDecimal getAvgIncome(UUID userId, int year, int month, int numMonths) {
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;

        for (int i = numMonths; i >= 1; i--) {
            YearMonth ym = YearMonth.of(year, month).minusMonths(i);
            LocalDateTime from = ym.atDay(1).atStartOfDay();
            LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();
            BigDecimal income =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.INCOME, from, to);
            if (income != null && income.compareTo(BigDecimal.ZERO) > 0) {
                total = total.add(income);
                count++;
            }
        }

        return count > 0
                ? total.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
    }

    private BigDecimal average(List<BigDecimal> values) {
        if (values == null || values.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum =
                values.stream().filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal roundUpTo(BigDecimal value, long step) {
        if (value == null) return BigDecimal.ZERO;
        BigDecimal stepBD = BigDecimal.valueOf(step);
        return value.divide(stepBD, 0, RoundingMode.CEILING).multiply(stepBD);
    }

    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0đ";
        return String.format("%,.0fđ", amount.doubleValue());
    }
}
