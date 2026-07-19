package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SettleDebtRequest {
    @NotNull(message = "ID người nhận không được để trống") private UUID toUserId;

    @NotNull(message = "Số tiền không được để trống") @DecimalMin(value = "1.0", message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;
}
