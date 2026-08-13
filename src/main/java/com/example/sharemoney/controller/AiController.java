package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.service.GeminiService;
import com.example.sharemoney.service.QrReceiptService;
import com.example.sharemoney.service.ReceiptScanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;
    private final ReceiptScanService receiptScanService;
    private final QrReceiptService qrReceiptService;

    /**
     * POST /api/ai/generate-message Gọi Google Gemini API để tạo tin nhắn đòi nợ theo phong cách
     * (mood).
     */
    @PostMapping("/generate-message")
    public ResponseEntity<AiMessageResponse> generateMessage(
            @Valid @RequestBody AiMessageRequest request) {
        return ResponseEntity.ok(geminiService.generateDebtMessage(request));
    }

    /**
     * POST /api/ai/scan-receipt Quét hóa đơn bằng Mindee Receipt OCR API. Trả về tổng tiền, tên cửa
     * hàng, và danh sách từng món hàng (Line Items).
     */
    @PostMapping(value = "/scan-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ScanReceiptResponse> scanReceipt(
            @RequestParam("image") MultipartFile image) {
        return ResponseEntity.ok(receiptScanService.scanReceipt(image));
    }

    /**
     * POST /api/ai/scan-qr-receipt Trích xuất hóa đơn từ URL của mã QR.
     */
    @PostMapping("/scan-qr-receipt")
    public ResponseEntity<ScanReceiptResponse> scanQrReceipt(
            @Valid @RequestBody com.example.sharemoney.dto.request.ScanQrReceiptRequest request) {
        return ResponseEntity.ok(qrReceiptService.scanReceiptFromUrl(request.getUrl()));
    }
}
