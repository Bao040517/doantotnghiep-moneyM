package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

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

    // ─── Sub-DTOs ───

    @Data
    @Builder
    public static class BudgetSuggestion {
        private String categoryId;
        private String categoryName;
        private String categoryIcon;
        private BigDecimal suggestedAmount;   // Số tiền đề xuất (trung bình 3 tháng)
        private BigDecimal currentBudget;      // Ngân sách hiện tại (nếu có, null nếu chưa đặt)
        private BigDecimal avgSpent3Months;     // Trung bình chi 3 tháng
        private String reasoning;              // Lý do ngắn gọn
    }

    @Data
    @Builder
    public static class SpendingWarning {
        private String categoryName;
        private String categoryIcon;
        private BigDecimal currentMonthSpent;  // Chi tháng này
        private BigDecimal avg3MonthSpent;      // Trung bình 3 tháng trước
        private int increasePercent;            // % tăng so với trung bình
        private String severity;                // "HIGH" | "MEDIUM"
        private String message;                 // Tin nhắn cảnh báo
    }

    @Data
    @Builder
    public static class HabitAnalysis {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal needsAmount;         // Chi thiết yếu
        private BigDecimal wantsAmount;          // Chi linh hoạt
        private BigDecimal savingsAmount;        // Tiết kiệm thực tế
        private double needsPercent;             // % thiết yếu / thu nhập
        private double wantsPercent;             // % linh hoạt / thu nhập
        private double savingsPercent;           // % tiết kiệm / thu nhập
        private String verdict;                  // Nhận xét tổng quát
        private List<String> recommendations;    // Danh sách gợi ý cải thiện
    }

    @Data
    @Builder
    public static class SavingsSuggestion {
        private BigDecimal idleAmount;           // Số tiền nhàn rỗi
        private BigDecimal suggestedSaveAmount;  // Đề xuất tiết kiệm
        private BigDecimal potentialMonthlySave; // Tiết kiệm tiềm năng (nếu cắt giảm)
        private String message;                  // Lời khuyên
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
