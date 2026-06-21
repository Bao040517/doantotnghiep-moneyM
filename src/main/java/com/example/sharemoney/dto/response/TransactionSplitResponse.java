package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class TransactionSplitResponse {
    private UUID id;
    private CategoryResponse category;
    private BigDecimal amount;
    private String note;
}
