package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingsGoalRequest {
    @NotBlank(message = "Tên mục tiêu không được để trống")
    private String name;

    @NotNull(message = "Số tiền mục tiêu không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền mục tiêu phải lớn hơn 0")
    private BigDecimal targetAmount;

    private LocalDate deadlineDate;
}
