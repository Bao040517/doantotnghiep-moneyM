package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FinancialHealthDTO {
    private int score; // 0 - 100
    private String healthStatus; // e.g., Kém, Trung bình, Khá, Tốt, Xuất sắc
    private String advice;

    // Components
    private int savingsRatioScore;
    private int debtToIncomeScore;
    private int emergencyFundScore;
    private int budgetAdherenceScore;
}
