package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FinancialAdviceResponse {

    // ─── Feature 1: One-Click Budget (Kế hoạch ngân sách thông minh) ───
    private List<BudgetSuggestion> budgetPlan;

    // ─── Feature 2: Smart Alerts (Cảnh báo chi tiêu bất thường) ───
    private List<SpendingWarning> warnings;

    // ─── Feature 3: Habit Analyzer (Phân tích thói quen 50/30/20) ───
    private HabitAnalysis habitAnalysis;

    // ─── Feature 4: Idle Money Sweep (Gợi ý gom tiền tiết kiệm) ───
    private SavingsSuggestion savingsSuggestion;

    // ─── Feature 5: Overspending Compensation & Rebalance (Kế hoạch Bù Trừ Ngân Sách Khi Tiêu Lố)
    // ───
    private RebalancePlan rebalancePlan;

    // ─── Sub-DTOs ───

    @Data
    @Builder
    public static class RebalancePlan {
        private boolean hasOverspending; // true nếu có khoản bị tiêu lố trong tháng
        private BigDecimal totalOverspent; // Tổng số tiền tiêu lố
        private BigDecimal totalCompensated; // Tổng số tiền có thể cắt giảm bù vào
        private BigDecimal remainingDeficit; // Phần thâm hụt còn lại (nếu cắt giảm không đủ)
        private String statusMessage; // Thông báo tổng quan
        private List<OverspentItem> overspentItems; // Danh sách các khoản tiêu lố
        private List<CompensateCutItem>
                compensationCuts; // Danh sách các khoản đề xuất cắt giảm bù vào
    }

    @Data
    @Builder
    public static class OverspentItem {
        private String categoryId;
        private String categoryName;
        private String categoryIcon;
        private BigDecimal limitAmount; // Hạn mức đã đặt
        private BigDecimal spentAmount; // Thực chi tháng này
        private BigDecimal overspentAmount; // Số tiền vượt hạn mức
        private int overspentPercent; // % vượt hạn mức
        private boolean isFixed; // true nếu là chi phí cố định/hóa đơn
        private String categoryType; // "FIXED" | "FLEXIBLE"
    }

    @Data
    @Builder
    public static class CompensateCutItem {
        private String categoryId;
        private String categoryName;
        private String categoryIcon;
        private BigDecimal currentLimit; // Hạn mức hiện tại
        private BigDecimal currentSpent; // Đã chi
        private BigDecimal availableRemaining; // Còn lại có thể chi
        private BigDecimal suggestedCutAmount; // Số tiền đề xuất giảm để bù
        private BigDecimal newSuggestedLimit; // Hạn mức mới sau khi giảm bù trừ
        private String tier; // "TIER_1_LUXURY" | "TIER_2_BASIC"
        private String tierLabel; // "Ưu tiên cắt giảm (Hưởng thụ)" | "Cắt giảm bổ sung (Sinh hoạt)"
        private String reason; // Lý do giải thích
        private Boolean isBalanced; // true nếu danh mục này đã ở trạng thái cân bằng
    }

    @Data
    @Builder
    public static class BudgetSuggestion {
        private String categoryId;
        private String categoryName;
        private String categoryIcon;
        private BigDecimal suggestedAmount; // Số tiền đề xuất (trung bình 3 tháng)
        private BigDecimal currentBudget; // Ngân sách hiện tại (nếu có, null nếu chưa đặt)
        private BigDecimal lastMonthBudget; // Ngân sách tháng trước (nếu có)
        private BigDecimal lastMonthSpent; // Thực chi tháng trước
        private BigDecimal avgSpent3Months; // Trung bình chi 3 tháng
        private String reasoning; // Lý do ngắn gọn
        private String budgetId; // ID ngân sách hiện tại nếu đã có
        private Boolean hasBudget; // true nếu đã có ngân sách được thiết lập
    }

    @Data
    @Builder
    public static class SpendingWarning {
        private String categoryName;
        private String categoryIcon;
        private BigDecimal currentMonthSpent; // Chi tháng này
        private BigDecimal avg3MonthSpent; // Trung bình 3 tháng trước
        private int increasePercent; // % tăng so với trung bình
        private String severity; // "HIGH" | "MEDIUM"
        private String message; // Tin nhắn cảnh báo
        private BigDecimal projectedMonthEnd; // Dự kiến cả tháng
        private BigDecimal dailyBurnRate; // Tốc độ chi mỗi ngày
        private BigDecimal recommendedDailyLimit; // Hạn mức chi mỗi ngày còn lại
        private int remainingDays; // Số ngày còn lại trong tháng
        private String actionableTip; // Lời khuyên hành động cụ thể
        private String impactSummary; // Đánh giá mức độ ảnh hưởng
    }

    @Data
    @Builder
    public static class HabitAnalysis {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal needsAmount; // Chi thiết yếu
        private BigDecimal wantsAmount; // Chi linh hoạt
        private BigDecimal savingsAmount; // Tiết kiệm thực tế
        private double needsPercent; // % thiết yếu / thu nhập
        private double wantsPercent; // % linh hoạt / thu nhập
        private double savingsPercent; // % tiết kiệm / thu nhập
        private String verdict; // Nhận xét tổng quát
        private List<String> recommendations; // Danh sách gợi ý cải thiện
    }

    @Data
    @Builder
    public static class SavingsSuggestion {
        private BigDecimal idleAmount; // Số tiền nhàn rỗi
        private BigDecimal suggestedSaveAmount; // Đề xuất tiết kiệm
        private BigDecimal potentialMonthlySave; // Tiết kiệm tiềm năng (nếu cắt giảm)
        private String message; // Lời khuyên
        private List<CutSuggestion> cutSuggestions; // Gợi ý cắt giảm cụ thể
    }

    @Data
    @Builder
    public static class CutSuggestion {
        private String categoryName;
        private BigDecimal currentSpent;
        private BigDecimal suggestedLimit;
        private BigDecimal savingsIfCut;
        private String tip;
    }
}
