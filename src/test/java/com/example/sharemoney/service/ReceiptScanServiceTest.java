package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReceiptScanServiceTest {

    @Mock private GeminiService geminiService;

    @Mock private QrReceiptService qrReceiptService;

    @InjectMocks private ReceiptScanService receiptScanService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(receiptScanService, "mindeeApiKey", "");
        when(geminiService.isValidApiKey()).thenReturn(false);
    }

    private byte[] generateQrCodeImageBytes(String text) throws Exception {
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix bitMatrix = writer.encode(text, BarcodeFormat.QR_CODE, 200, 200);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
        return baos.toByteArray();
    }

    @Test
    @DisplayName("File rỗng ném ngoại lệ VALIDATION_ERROR")
    void testEmptyFileThrowsValidationError() {
        MockMultipartFile emptyFile =
                new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);

        AppException ex =
                assertThrows(AppException.class, () -> receiptScanService.scanReceipt(emptyFile));
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
    }

    @Test
    @DisplayName(
            "Ảnh có chứa mã QR URL tra cứu hóa đơn điện tử -> Tự động giải mã ZXing và trích xuất qua QrReceiptService")
    void testScanReceiptWithQrUrl() throws Exception {
        String testUrl = "https://einvoice.vn/lookup?code=ABC123456";
        byte[] qrImageBytes = generateQrCodeImageBytes(testUrl);

        MockMultipartFile file =
                new MockMultipartFile("image", "receipt_qr.png", "image/png", qrImageBytes);

        ScanReceiptResponse mockQrResponse =
                ScanReceiptResponse.builder()
                        .amount(new BigDecimal("1250000"))
                        .note("Hóa đơn Điện tử VNPT")
                        .build();

        when(qrReceiptService.scanReceiptFromUrl(testUrl)).thenReturn(mockQrResponse);

        ScanReceiptResponse response = receiptScanService.scanReceipt(file);

        assertNotNull(response);
        assertEquals(new BigDecimal("1250000"), response.getAmount());
        assertEquals("Hóa đơn Điện tử VNPT", response.getNote());
        verify(qrReceiptService).scanReceiptFromUrl(eq(testUrl));
    }

    @Test
    @DisplayName(
            "Ảnh không có mã QR và không cấu hình API Key OCR -> Ném RECEIPT_SCAN_CONFIG_ERROR")
    void testScanReceiptNoQrNoOcrThrowsConfigError() throws Exception {
        // Tạo ảnh trắng 100x100 (không chứa QR)
        java.awt.image.BufferedImage img =
                new java.awt.image.BufferedImage(
                        100, 100, java.awt.image.BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "PNG", baos);
        byte[] blankImageBytes = baos.toByteArray();

        MockMultipartFile file =
                new MockMultipartFile("image", "blank.png", "image/png", blankImageBytes);

        AppException ex =
                assertThrows(AppException.class, () -> receiptScanService.scanReceipt(file));
        assertEquals(ErrorCode.RECEIPT_SCAN_CONFIG_ERROR, ex.getErrorCode());
    }
}
