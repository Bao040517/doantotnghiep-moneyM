package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantResponse {
    private String reply;
    private String intent; // PLAN_SAVINGS_GOAL, CREATE_TRANSACTION, QUERY_INSIGHT, GENERAL_CHAT
    private GoalPlanData goalPlanData;
    private TransactionData transactionData;
    private List<String> quickReplies;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalPlanData {
        private String goalName;
        private BigDecimal targetAmount;
        private Integer targetMonths;
        private BigDecimal monthlySavingsNeeded;
        private BigDecimal dailySavingsNeeded;
        private Integer feasibilityScore; // 0-100
        private List<CutDownSuggestion> cutDownSuggestions;
        private String deadlineDate; // ISO format
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CutDownSuggestion {
        private String emoji;
        private String categoryName;
        private BigDecimal currentSpending;
        private BigDecimal suggestedSpending;
        private BigDecimal monthlySavings;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionData {
        private BigDecimal amount;
        private String categoryName;
        private UUID categoryId;
        private String note;
        private String paymentMethod;
        private String transactionType; // EXPENSE or INCOME
    }
}
