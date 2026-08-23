package com.example.sharemoney.dto.response;

import com.example.sharemoney.entity.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransactionResponse {
    private UUID id;
    private BigDecimal amount;
    private TransactionType type;
    private CategoryResponse category;
    private LocalDateTime transactionDate;
    private String note;
    private UUID linkedExpenseId;

    private String payeeName;
    private java.util.List<String> tags;

    private boolean isSplit;
    private String paymentMethod;
    private List<TransactionSplitResponse> splits;
}
