package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.VietQrRequest;
import com.example.sharemoney.dto.response.VietQrResponse;
import com.example.sharemoney.service.VietQrService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/qr-code")
@RequiredArgsConstructor
public class VietQrController {

    private final VietQrService vietQrService;

    /** POST /api/payments/qr-code Sinh link ảnh mã QR (VietQR) để thanh toán. */
    @PostMapping
    public ResponseEntity<VietQrResponse> generateQr(@Valid @RequestBody VietQrRequest request) {
        return ResponseEntity.ok(vietQrService.generateQrLink(request));
    }
}
