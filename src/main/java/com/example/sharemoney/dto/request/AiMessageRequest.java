package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AiMessageRequest {

    @NotBlank(message = "Tên người nợ không được để trống.")
    @Size(max = 50, message = "Tên người nợ tối đa 50 ký tự.")
    private String debtorName;

    @NotNull(message = "Số tiền không được để trống.") @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0.")
    private BigDecimal amount;

    /** Phong cách đòi nợ: FUNNY, POLITE, AGGRESSIVE, POETIC... */
    @NotBlank(message = "Phong cách (mood) không được để trống.")
    private String mood;
}
