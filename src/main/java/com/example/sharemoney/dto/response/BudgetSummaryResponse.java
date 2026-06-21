package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class BudgetSummaryResponse {

    private UUID budgetId;
    private String name;

    private UUID categoryId;
    private String categoryName;
    private String categoryIcon;

    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private int percentage;         // 0-100+ (có thể > 100 nếu vượt ngân sách)
    private String status;          // "OK" | "WARNING" | "OVER"

    private boolean isRollover;
    private BigDecimal rolloverAmount;
    private BigDecimal availableAmount;
    
    private String type;
    private boolean isRecurring;
    private Integer dueDayOfMonth;
    @com.fasterxml.jackson.annotation.JsonProperty("isMandatory")
    private boolean isMandatory;

    private String payeeBankBin;
    private String payeeBankAccount;
    private String payeeAccountName;
}
