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
public class CashflowSummaryResponse {

    private List<CashflowPoint> weeks;
    private List<CashflowPoint> months;
    private List<CashflowPoint> years;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CashflowPoint {
        private String period; // "Tuần 1", "T1", "2025"
        private String label;  // "T1", "T2", "2025"
        private BigDecimal income;
        private BigDecimal expense;
        private BigDecimal net;
    }
}
