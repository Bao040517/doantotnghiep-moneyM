package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;

@Data
public class UpdateTransactionRequest {

    @NotNull(message = "Số tiền không được để trống") @Positive(message = "Số tiền phải lớn hơn 0") private BigDecimal amount;

    @NotNull(message = "Danh mục không được để trống") private UUID categoryId;

    private LocalDateTime transactionDate;

    private String note;

    private UUID linkedBudgetId;

    private String payeeName;
    private java.util.List<String> tags;

    private boolean isSplit;
    private boolean excludeFromBudget;
    private String paymentMethod;

    private java.util.List<TransactionSplitRequest> splits;
}
