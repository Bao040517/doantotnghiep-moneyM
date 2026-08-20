package com.example.sharemoney.dto.request;

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
public class RebalanceApplyRequest {
    private List<RebalanceCutOverride> cuts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RebalanceCutOverride {
        private String categoryId;
        private BigDecimal cutAmount;
        private BigDecimal newLimit;
    }
}
