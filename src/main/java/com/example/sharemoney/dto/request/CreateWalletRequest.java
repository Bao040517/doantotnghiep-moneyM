package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class CreateWalletRequest {
    @NotBlank(message = "Tên ví không được để trống")
    private String name;

    @NotNull(message = "Số dư không được để trống") private BigDecimal balance;

    private String currency = "VND";

    private String bankBin;
    private String bankAccountNo;
    private String bankAccountName;
}
