package com.example.sharemoney.service;

import com.example.sharemoney.dto.BankLookupResponse;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class BankLookupService {

    @Value("${vietqr.client-id:}")
    private String vietqrClientId;

    @Value("${vietqr.api-key:}")
    private String vietqrApiKey;

    @Value("${vietqr.lookup-url:https://api.vietqr.io/v2/lookup}")
    private String vietqrLookupUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    // Mock danh sách tài khoản kiểm thử seed data
    private static final Map<String, String> KNOWN_ACCOUNTS = new HashMap<>();

    static {
        KNOWN_ACCOUNTS.put("970422:6617052004888", "DUONG DUC BAO");
        KNOWN_ACCOUNTS.put("970426:96886693050620", "DUONG DUC BAO");
        KNOWN_ACCOUNTS.put("970436:1012345678", "TRAN THI B");
        KNOWN_ACCOUNTS.put("970407:1903456789", "LE VAN C");
        KNOWN_ACCOUNTS.put("970415:113366668888", "PHAM THI D");
        KNOWN_ACCOUNTS.put("970418:21510001234567", "HOANG VAN E");
        KNOWN_ACCOUNTS.put("970432:1234567890", "VU THI F");
        KNOWN_ACCOUNTS.put("970416:88889999", "DANG VAN G");
        KNOWN_ACCOUNTS.put("970423:01234567001", "BUI THI H");
    }

    /** Tra cứu tên chủ tài khoản thật qua Napas247 / VietQR Open API */
    public BankLookupResponse lookupAccount(String bin, String accountNumber) {
        String cleanBin = bin != null ? bin.trim() : "";
        String cleanAccNo = accountNumber != null ? accountNumber.trim() : "";

        if (cleanBin.isEmpty() || cleanAccNo.isEmpty()) {
            return BankLookupResponse.builder()
                    .bin(cleanBin)
                    .accountNumber(cleanAccNo)
                    .verified(false)
                    .message("Mã ngân hàng và số tài khoản không được để trống")
                    .build();
        }

        // 1. Kiểm tra nếu có cấu hình VietQR API Key thật
        if (vietqrClientId != null
                && !vietqrClientId.isBlank()
                && vietqrApiKey != null
                && !vietqrApiKey.isBlank()) {
            try {
                Map<String, String> body = new HashMap<>();
                body.put("bin", cleanBin);
                body.put("accountNumber", cleanAccNo);

                String jsonBody = objectMapper.writeValueAsString(body);

                HttpRequest request =
                        HttpRequest.newBuilder()
                                .uri(URI.create(vietqrLookupUrl))
                                .header("Content-Type", "application/json")
                                .header("x-client-id", vietqrClientId)
                                .header("x-api-key", vietqrApiKey)
                                .POST(
                                        HttpRequest.BodyPublishers.ofString(
                                                jsonBody, StandardCharsets.UTF_8))
                                .timeout(Duration.ofSeconds(8))
                                .build();

                HttpResponse<String> response =
                        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                log.info(
                        "[BankLookup] VietQR response status: {}, body: {}",
                        response.statusCode(),
                        response.body());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    if (root.has("code") && "00".equals(root.get("code").asText())) {
                        JsonNode data = root.get("data");
                        String accountName = "";
                        if (data.has("accountName")) {
                            accountName = data.get("accountName").asText();
                        } else if (data.has("ownerName")) {
                            accountName = data.get("ownerName").asText();
                        }

                        if (!accountName.isBlank()) {
                            return BankLookupResponse.builder()
                                    .bin(cleanBin)
                                    .accountNumber(cleanAccNo)
                                    .accountName(accountName.trim().toUpperCase())
                                    .verified(true)
                                    .message("Đã xác thực chính chủ từ Ngân hàng")
                                    .build();
                        }
                    } else if (root.has("desc")) {
                        log.warn(
                                "[BankLookup] VietQR lookup returned non-success: {}",
                                root.get("desc").asText());
                    }
                }
            } catch (Exception e) {
                log.error("[BankLookup] Failed to call VietQR lookup API", e);
            }
        }

        // 2. Tra cứu trong cơ sở dữ liệu mẫu / Mock cache
        String key = cleanBin + ":" + cleanAccNo;
        if (KNOWN_ACCOUNTS.containsKey(key)) {
            String mockName = KNOWN_ACCOUNTS.get(key);
            return BankLookupResponse.builder()
                    .bin(cleanBin)
                    .accountNumber(cleanAccNo)
                    .accountName(mockName)
                    .verified(true)
                    .message("Đã khớp với tài khoản ngân hàng (Mock Verified)")
                    .build();
        }

        // 3. Fallback khi không có API key thật và tài khoản mới
        return BankLookupResponse.builder()
                .bin(cleanBin)
                .accountNumber(cleanAccNo)
                .accountName(null)
                .verified(false)
                .message(
                        "Chưa cấu hình API Key VietQR Napas247 hoặc tài khoản không tồn tại. Vui lòng nhập tên thủ công.")
                .build();
    }
}
