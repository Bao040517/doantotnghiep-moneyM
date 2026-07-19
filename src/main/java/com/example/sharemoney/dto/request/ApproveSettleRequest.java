package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ApproveSettleRequest {
    @NotNull(message = "Người nợ không được để trống") private UUID debtorId;

    @NotNull(message = "Số tiền không được để trống") @Positive(message = "Số tiền phải lớn hơn 0") private BigDecimal amount;
}
