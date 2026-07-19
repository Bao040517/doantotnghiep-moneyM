package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransactionSplitResponse {
    private UUID id;
    private CategoryResponse category;
    private BigDecimal amount;
    private String note;
}
