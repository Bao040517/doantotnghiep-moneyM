package com.example.sharemoney.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryBreakdownResponse {
    private UUID categoryId;
    private String categoryName;
    private String categoryIcon;
    private BigDecimal totalAmount;
    private double percentage;
}
