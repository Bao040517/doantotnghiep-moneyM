package com.example.sharemoney.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankLookupRequest {

    @NotBlank(message = "Mã ngân hàng (BIN) không được để trống")
    private String bin;

    @NotBlank(message = "Số tài khoản không được để trống")
    private String accountNumber;
}
