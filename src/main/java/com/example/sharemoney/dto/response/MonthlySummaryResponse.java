package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlySummaryResponse {

    private List<MonthData> months;
    private CurrentMonthData currentMonth;
    private ComparisonData comparison;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthData {
        private String label; // "T1/2026"
        private int year;
        private int month;
        private BigDecimal income;
        private BigDecimal expense;
        private BigDecimal net;
        private BigDecimal debtPayment;
        private java.util.Map<String, BigDecimal> categoryExpenses;
        private java.util.Map<String, BigDecimal> categoryIncomes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CurrentMonthData {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private String topCategory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComparisonData {
        private BigDecimal expenseChange;
        private int expenseChangePercent;
    }
}
