package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class SafeToSpendResponse {
    private BigDecimal totalIncome;
    private BigDecimal totalBills;
    private BigDecimal totalSavings;
    private BigDecimal flexibleSpent;
    private BigDecimal safeBalanceTotal;
    private BigDecimal safeBalanceDaily;
    private int daysLeft;
}
