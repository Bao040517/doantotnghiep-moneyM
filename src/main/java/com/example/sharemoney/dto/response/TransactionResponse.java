package com.example.sharemoney.dto.response;

import com.example.sharemoney.entity.TransactionType;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

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
    private List<TransactionSplitResponse> splits;
}
