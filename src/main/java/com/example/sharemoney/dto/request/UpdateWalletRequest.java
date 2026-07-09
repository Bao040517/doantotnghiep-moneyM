package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateWalletRequest {
    @NotBlank(message = "Tên ví không được để trống")
    private String name;

    private String bankBin;
    private String bankAccountNo;
    private String bankAccountName;
}
