package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RemindDebtRequest {

    @NotNull(message = "Người nợ (debtorId) không được để trống")
    private UUID debtorId;

    @NotNull(message = "Số tiền nhắc nợ không được để trống") @DecimalMin(value = "1", message = "Số tiền nhắc nợ phải lớn hơn 0")
    private BigDecimal amount;

    private String message;
}
