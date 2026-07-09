package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.ReceiptItemResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
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
 * Service tích hợp Mindee Receipt OCR API để nhận diện hóa đơn.
 * Trả về danh sách từng món hàng (Line Items) cùng tổng tiền.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiptScanService {

    @Value("${mindee.api.key}")
    private String mindeeApiKey;

    @Value("${mindee.api.url}")
    private String mindeeApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Quét hóa đơn bằng Mindee Receipt OCR API.
     * Gửi ảnh lên Mindee, nhận về JSON chứa line_items, total_amount, supplier_name.
     */
    public ScanReceiptResponse scanReceipt(MultipartFile file) {
        if (mindeeApiKey == null || mindeeApiKey.contains("YOUR_MINDEE_API_KEY_HERE")) {
            throw new AppException(ErrorCode.RECEIPT_SCAN_CONFIG_ERROR);
        }

        try {
            byte[] fileBytes = file.getBytes();
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "receipt.jpg";

            // Chuẩn bị multipart/form-data request cho Mindee API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("Authorization", "Token " + mindeeApiKey);

            // Tạo resource từ byte array để gửi qua multipart
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return originalFilename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("document", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Gọi Mindee API
            ResponseEntity<String> response = restTemplate.postForEntity(mindeeApiUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseMindeeResponse(response.getBody());
            } else {
                log.error("Mindee API trả về lỗi: status={}", response.getStatusCode());
                throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi gọi Mindee Receipt OCR API", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    /**
     * Parse JSON response từ Mindee API.
     * Cấu trúc: document.inference.prediction chứa line_items, total_amount, supplier_name
     */
    private ScanReceiptResponse parseMindeeResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode prediction = root
                    .path("document")
                    .path("inference")
                    .path("prediction");

            // Lấy tổng tiền
            BigDecimal totalAmount = BigDecimal.ZERO;
            JsonNode totalAmountNode = prediction.path("total_amount").path("value");
            if (!totalAmountNode.isMissingNode() && !totalAmountNode.isNull()) {
                totalAmount = new BigDecimal(totalAmountNode.asText());
            }

            // Lấy tên quán/cửa hàng
            String supplierName = "";
            JsonNode supplierNode = prediction.path("supplier_name").path("value");
            if (!supplierNode.isMissingNode() && !supplierNode.isNull()) {
                supplierName = supplierNode.asText();
            }

            // Lấy danh sách Line Items (Từng món hàng)
            List<ReceiptItemResponse> items = new ArrayList<>();
            JsonNode lineItemsNode = prediction.path("line_items");
            if (lineItemsNode.isArray()) {
                for (JsonNode item : lineItemsNode) {
                    String description = getTextValue(item, "description");
                    Integer quantity = getIntValue(item, "quantity");
                    BigDecimal unitPrice = getDecimalValue(item, "unit_price");
                    BigDecimal totalPrice = getDecimalValue(item, "total_amount");

                    // Bỏ qua item rỗng (không có tên và không có giá)
                    if ((description == null || description.isBlank()) && totalPrice == null) {
                        continue;
                    }

                    items.add(ReceiptItemResponse.builder()
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
            log.error("Lỗi parse Mindee JSON response", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    // ─── Utility helpers ───────────────────────────────────

    private String getTextValue(JsonNode node, String field) {
        JsonNode valueNode = node.path(field);
        if (valueNode.isMissingNode() || valueNode.isNull()) return null;
        // Mindee trả về string trực tiếp (không lồng .value như prediction level)
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
