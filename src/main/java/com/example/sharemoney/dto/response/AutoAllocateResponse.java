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
public class AutoAllocateResponse {
    private BigDecimal totalAllocated;
    private BigDecimal safeToSpendRemaining;
    private BigDecimal requiredReserve;
    private List<AllocatedGoalDetail> allocatedGoals;
    private String message;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllocatedGoalDetail {
        private String goalId;
        private String goalName;
        private BigDecimal allocatedAmount;
        private BigDecimal newCurrentAmount;
        private BigDecimal targetAmount;
        private boolean isCompleted;
    }
}
