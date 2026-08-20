package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RebalanceApplyResponse {
    private boolean success;
    private String message;
    private BigDecimal totalCompensated;
    private int updatedCategoriesCount;
}
