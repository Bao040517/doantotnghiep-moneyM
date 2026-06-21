package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class VietQrRequest {

    @NotNull(message = "Người nhận (receiverId) không được để trống.")
    private UUID receiverId;

    @NotNull(message = "Số tiền không được để trống.") @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0.")
    private BigDecimal amount;

    @Size(max = 50, message = "Nội dung chuyển khoản tối đa 50 ký tự.")
    private String description;
}
