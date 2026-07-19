package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;

@Data
public class TransactionSplitRequest {
    @NotNull(message = "Danh mục không được để trống") private UUID categoryId;

    @NotNull(message = "Số tiền không được để trống") @Positive(message = "Số tiền phải lớn hơn 0") private BigDecimal amount;

    private String note;
}
