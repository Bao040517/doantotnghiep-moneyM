package com.example.sharemoney.service;

import com.example.sharemoney.config.PayOSConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PayOSService {

    private final PayOSConfig payOSConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    /**
     * Tạo mã băm HMAC SHA256 chuẩn PayOS
     */
    public String generateHmacSHA256(String data, String key) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] bytes = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("[PayOS] Error generating HMAC SHA256 signature", e);
            return "";
        }
    }

    /**
     * Tạo Payment Link qua Cổng PayOS
     */
    public Map<String, Object> createPaymentLink(long orderCode, long amount, String description, String returnUrl, String cancelUrl) {
        try {
            String safeDesc = description != null ? description.replaceAll("[^a-zA-Z0-9 ]", "").trim() : "SM" + orderCode;
            if (safeDesc.length() > 25) {
                safeDesc = safeDesc.substring(0, 25);
            }
            if (safeDesc.isEmpty()) {
                safeDesc = "Thanh toan SM" + orderCode;
            }

            String retUrl = (returnUrl != null && !returnUrl.isEmpty()) ? returnUrl : payOSConfig.getReturnUrl();
            String canUrl = (cancelUrl != null && !cancelUrl.isEmpty()) ? cancelUrl : payOSConfig.getCancelUrl();

            // Chuỗi dữ liệu ký SHA256 theo thứ tự alphabet: amount, cancelUrl, description, orderCode, returnUrl
            String signData = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                    amount, canUrl, safeDesc, orderCode, retUrl);

            String signature = generateHmacSHA256(signData, payOSConfig.getChecksumKey());

            Map<String, Object> reqBody = new HashMap<>();
            reqBody.put("orderCode", orderCode);
            reqBody.put("amount", amount);
            reqBody.put("description", safeDesc);
            reqBody.put("returnUrl", retUrl);
            reqBody.put("cancelUrl", canUrl);
            reqBody.put("signature", signature);

            String jsonPayload = objectMapper.writeValueAsString(reqBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", payOSConfig.getClientId())
                    .header("x-api-key", payOSConfig.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("[PayOS] Response status: {}, body: {}", response.statusCode(), response.body());

            JsonNode root = objectMapper.readTree(response.body());
            if (root.has("code") && "00".equals(root.get("code").asText())) {
                JsonNode data = root.get("data");
                Map<String, Object> result = new HashMap<>();
                result.put("bin", data.has("bin") ? data.get("bin").asText() : "970426");
                result.put("accountNumber", data.has("accountNumber") ? data.get("accountNumber").asText() : "96886693050620");
                result.put("accountName", data.has("accountName") ? data.get("accountName").asText() : "DUONG DUC BAO");
                result.put("amount", amount);
                result.put("description", data.has("description") ? data.get("description").asText() : safeDesc);
                result.put("orderCode", orderCode);
                result.put("status", "PENDING");
                result.put("checkoutUrl", data.has("checkoutUrl") ? data.get("checkoutUrl").asText() : "");
                result.put("qrCode", data.has("qrCode") ? data.get("qrCode").asText() : "");
                return result;
            } else {
                log.warn("[PayOS] PayOS returned non-zero code: {}", response.body());
            }
        } catch (Exception e) {
            log.error("[PayOS] Failed to call PayOS API", e);
        }

        // Fallback: Sinh VietQR Napas247 chuẩn khi ở chế độ Offline/Demo
        String safeDesc = "SM" + orderCode;
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("bin", "970426");
        fallback.put("accountNumber", "96886693050620");
        fallback.put("accountName", "DUONG DUC BAO");
        fallback.put("amount", amount);
        fallback.put("description", safeDesc);
        fallback.put("orderCode", orderCode);
        fallback.put("status", "PENDING");
        fallback.put("checkoutUrl", "");
        fallback.put("qrCode", "https://img.vietqr.io/image/970426-96886693050620-compact2.png?amount=" + amount + "&addInfo=" + safeDesc);
        return fallback;
    }

    /**
     * Xác thực dữ liệu Webhook từ PayOS gửi sang
     */
    public boolean verifyWebhookSignature(Map<String, Object> data, String signature) {
        if (data == null || signature == null || signature.isEmpty()) {
            return false;
        }
        try {
            TreeMap<String, Object> sortedMap = new TreeMap<>(data);
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
                if (entry.getValue() != null) {
                    if (sb.length() > 0) sb.append("&");
                    sb.append(entry.getKey()).append("=").append(entry.getValue().toString());
                }
            }
            String calculated = generateHmacSHA256(sb.toString(), payOSConfig.getChecksumKey());
            return calculated.equalsIgnoreCase(signature);
        } catch (Exception e) {
            log.error("[PayOS] Webhook verification error", e);
            return false;
        }
    }

    /**
     * Truy vấn thông tin trạng thái Payment Link trực tiếp từ PayOS Server
     * GET https://api-merchant.payos.vn/v2/payment-requests/{orderCode}
     */
    public Map<String, Object> getPaymentLinkInformation(long orderCode) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL + "/" + orderCode))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", payOSConfig.getClientId())
                    .header("x-api-key", payOSConfig.getApiKey())
                    .GET()
                    .timeout(Duration.ofSeconds(6))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("[PayOS Query] OrderCode: {}, Status: {}, Body: {}", orderCode, response.statusCode(), response.body());

            JsonNode root = objectMapper.readTree(response.body());
            if (root.has("code") && "00".equals(root.get("code").asText())) {
                JsonNode data = root.get("data");
                Map<String, Object> result = new HashMap<>();
                result.put("orderCode", orderCode);
                result.put("status", data.has("status") ? data.get("status").asText() : "PENDING");
                result.put("amount", data.has("amount") ? data.get("amount").asLong() : 0L);
                result.put("amountPaid", data.has("amountPaid") ? data.get("amountPaid").asLong() : 0L);
                return result;
            }
        } catch (Exception e) {
            log.error("[PayOS Query] Failed to query order {} from PayOS API", orderCode, e);
        }
        return java.util.Collections.emptyMap();
    }
}
