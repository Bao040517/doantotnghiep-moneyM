package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ScanQrReceiptRequest {
    @NotBlank(message = "URL không được để trống")
    private String url;
}
