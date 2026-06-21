package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateExpenseRequest {

    @NotNull(message = "paidBy không được để trống.") private UUID paidBy;

    @NotBlank(message = "Tiêu đề khoản chi không được để trống.")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự.")
    private String title;

    @NotNull(message = "Số tiền không được để trống.") @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0.")
    private BigDecimal amount;

    @Size(max = 50)
    private String category;

    private List<UUID> splitUserIds;
}
