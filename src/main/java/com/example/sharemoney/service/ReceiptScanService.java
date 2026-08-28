package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.ReceiptItemResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service thông minh quét hóa đơn:
 * 1. Tự động tìm và giải mã mã QR trong ảnh (đọc link / dữ liệu hóa đơn điện tử để bóc tách từng món hàng).
 * 2. Nếu không có mã QR: tự động chuyển sang OCR (Google Gemini Vision / Mindee) để đọc chữ trên hóa đơn giấy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptScanService {

    @Value("${mindee.api.key:}")
    private String mindeeApiKey;

    @Value("${mindee.api.url:https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict}")
    private String mindeeApiUrl;

    private final GeminiService geminiService;
    private final QrReceiptService qrReceiptService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ScanReceiptResponse scanReceipt(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }

        try {
            byte[] fileBytes = file.getBytes();

            // ─── BƯỚC 1: TỰ ĐỘNG QUÉT & GIẢI MÃ MÃ QR TRONG BỨC ẢNH ───
            String qrContent = tryExtractQrCodeFromImage(fileBytes);
            if (qrContent != null && !qrContent.isBlank()) {
                log.info("[ReceiptScanService] Đã phát hiện mã QR trong ảnh: {}", qrContent);
                try {
                    // Nếu mã QR là đường link tra cứu hóa đơn điện tử (VNPT, Viettel, MISA, BKAV, v.v.)
                    if (qrContent.toLowerCase().startsWith("http://") || qrContent.toLowerCase().startsWith("https://")) {
                        ScanReceiptResponse qrRes = qrReceiptService.scanReceiptFromUrl(qrContent.trim());
                        if (qrRes != null && (qrRes.getAmount() != null || (qrRes.getItems() != null && !qrRes.getItems().isEmpty()))) {
                            log.info("[ReceiptScanService] Đọc thành công hóa đơn từ QR URL: amount={}, note={}, items={}",
                                    qrRes.getAmount(), qrRes.getNote(), qrRes.getItems() != null ? qrRes.getItems().size() : 0);
                            return qrRes;
                        }
                    } else {
                        // Nếu mã QR chứa văn bản / JSON trực tiếp của hóa đơn
                        ScanReceiptResponse qrTextRes = geminiService.extractReceiptFromHtml(qrContent.trim());
                        if (qrTextRes != null && (qrTextRes.getAmount() != null || (qrTextRes.getItems() != null && !qrTextRes.getItems().isEmpty()))) {
                            return qrTextRes;
                        }
                    }
                } catch (Exception e) {
                    log.warn("[ReceiptScanService] Không thể bóc tách từ QR URL: {}. Chuyển tiếp sang OCR hình ảnh...", e.getMessage());
                }
            }

            // ─── BƯỚC 2: QUÉT OCR TRỰC TIẾP TRÊN ẢNH (GEMINI VISION / MINDEE) ───
            if (geminiService != null && geminiService.isValidApiKey()) {
                try {
                    log.info("[ReceiptScanService] Quét OCR bằng Google Gemini Vision...");
                    return geminiService.scanReceipt(file);
                } catch (Exception e) {
                    log.warn("[ReceiptScanService] Gemini Vision OCR gặp lỗi: {}. Thử Mindee...", e.getMessage());
                }
            }

            if (mindeeApiKey != null && !mindeeApiKey.trim().isEmpty() && !mindeeApiKey.contains("YOUR_MINDEE_API_KEY_HERE")) {
                try {
                    log.info("[ReceiptScanService] Quét OCR bằng Mindee API...");
                    return scanViaMindee(fileBytes, file.getOriginalFilename());
                } catch (Exception e) {
                    log.warn("[ReceiptScanService] Mindee OCR gặp lỗi: {}", e.getMessage());
                }
            }

            // Nếu không có API OCR và cũng không đọc được QR
            throw new AppException(ErrorCode.RECEIPT_SCAN_CONFIG_ERROR);

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[ReceiptScanService] Lỗi xử lý nhận diện hóa đơn", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    /**
     * Tự động dò tìm và giải mã mã QR ở bất kỳ góc nào trong bức ảnh tải lên.
     */
    private String tryExtractQrCodeFromImage(byte[] imageBytes) {
        try (ByteArrayInputStream bais = new ByteArrayInputStream(imageBytes)) {
            BufferedImage bufferedImage = ImageIO.read(bais);
            if (bufferedImage == null) return null;

            LuminanceSource source = new BufferedImageLuminanceSource(bufferedImage);
            BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
            hints.put(DecodeHintType.CHARACTER_SET, "UTF-8");

            MultiFormatReader reader = new MultiFormatReader();
            reader.setHints(hints);

            Result result = reader.decodeWithState(bitmap);
            if (result != null && result.getText() != null) {
                return result.getText().trim();
            }
        } catch (Exception e) {
            // Không tìm thấy mã QR trong ảnh (bình thường đối với hóa đơn giấy không có QR)
            log.debug("[ReceiptScanService] Không phát hiện QR code trong ảnh: {}", e.getMessage());
        }
        return null;
    }

    private ScanReceiptResponse scanViaMindee(byte[] fileBytes, String originalFilename) {
        try {
            String name = originalFilename != null ? originalFilename : "receipt.jpg";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("Authorization", "Token " + mindeeApiKey);

            ByteArrayResource fileResource =
                    new ByteArrayResource(fileBytes) {
                        @Override
                        public String getFilename() {
                            return name;
                        }
                    };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("document", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            ResponseEntity<String> response =
                    restTemplate.postForEntity(mindeeApiUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseMindeeResponse(response.getBody());
            } else {
                throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[ReceiptScanService] Mindee API error", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    private ScanReceiptResponse parseMindeeResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode prediction = root.path("document").path("inference").path("prediction");

            BigDecimal totalAmount = BigDecimal.ZERO;
            JsonNode totalAmountNode = prediction.path("total_amount").path("value");
            if (!totalAmountNode.isMissingNode() && !totalAmountNode.isNull()) {
                totalAmount = new BigDecimal(totalAmountNode.asText());
            }

            String supplierName = "";
            JsonNode supplierNode = prediction.path("supplier_name").path("value");
            if (!supplierNode.isMissingNode() && !supplierNode.isNull()) {
                supplierName = supplierNode.asText();
            }

            List<ReceiptItemResponse> items = new ArrayList<>();
            JsonNode lineItemsNode = prediction.path("line_items");
            if (lineItemsNode.isArray()) {
                for (JsonNode item : lineItemsNode) {
                    String description = getTextValue(item, "description");
                    Integer quantity = getIntValue(item, "quantity");
                    BigDecimal unitPrice = getDecimalValue(item, "unit_price");
                    BigDecimal totalPrice = getDecimalValue(item, "total_amount");

                    if ((description == null || description.isBlank()) && totalPrice == null) {
                        continue;
                    }

                    items.add(
                            ReceiptItemResponse.builder()
                                    .description(description != null ? description : "Không rõ")
                                    .quantity(quantity != null ? quantity : 1)
                                    .unitPrice(unitPrice)
                                    .totalPrice(totalPrice)
                                    .build());
                }
            }

            return ScanReceiptResponse.builder()
                    .amount(totalAmount)
                    .note(supplierName)
                    .items(items)
                    .build();

        } catch (Exception e) {
            log.error("[ReceiptScanService] Parse Mindee response error", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    private String getTextValue(JsonNode node, String field) {
        JsonNode valueNode = node.path(field);
        if (valueNode.isMissingNode() || valueNode.isNull()) return null;
        return valueNode.asText();
    }

    private Integer getIntValue(JsonNode node, String field) {
        JsonNode valueNode = node.path(field);
        if (valueNode.isMissingNode() || valueNode.isNull()) return null;
        try {
            return (int) Math.round(valueNode.asDouble());
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal getDecimalValue(JsonNode node, String field) {
        JsonNode valueNode = node.path(field);
        if (valueNode.isMissingNode() || valueNode.isNull()) return null;
        try {
            return new BigDecimal(valueNode.asText());
        } catch (Exception e) {
            return null;
        }
    }
}
