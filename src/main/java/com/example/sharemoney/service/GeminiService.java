package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public AiMessageResponse generateDebtMessage(AiMessageRequest request) {
        if (apiKey == null || apiKey.contains("YOUR_GEMINI_API_KEY_HERE")) {
            throw new AppException(ErrorCode.INTERNAL_ERROR); // Nên có error riêng cho cấu hình
        }

        String prompt = buildPrompt(request);

        // Chuẩn bị payload theo format của Gemini API
        Map<String, Object> requestBody =
                Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                return AiMessageResponse.builder().message(generatedText).build();
            } else {
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        } catch (Exception e) {
            log.error("Lỗi khi gọi Gemini API generate-message: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public ScanReceiptResponse scanReceipt(MultipartFile file) {
        if (apiKey == null || apiKey.contains("YOUR_GEMINI_API_KEY_HERE")) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        try {
            String base64Image = java.util.Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            Map<String, Object> inlineData =
                    Map.of(
                            "mime_type", mimeType,
                            "data", base64Image);

            Map<String, Object> textPart =
                    Map.of(
                            "text",
                            "Analyze this receipt. Extract the final total amount paid (as a number) and a brief description/name of the store or items. Return exactly a JSON object in this format: {\"amount\": 150000, \"note\": \"Supermarket Groceries\"}. Do not include any other text, markdown, or code blocks.");

            Map<String, Object> imagePart = Map.of("inline_data", inlineData);

            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(textPart, imagePart))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                generatedText =
                        generatedText.replaceAll("```json", "").replaceAll("```", "").trim();

                com.fasterxml.jackson.databind.ObjectMapper mapper =
                        new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.readValue(generatedText, ScanReceiptResponse.class);
            } else {
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        } catch (Exception e) {
            log.error("Lỗi khi quét hóa đơn qua Gemini API", e);
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public ScanReceiptResponse extractReceiptFromHtml(String htmlText) {
        if (apiKey == null || apiKey.contains("YOUR_GEMINI_API_KEY_HERE")) {
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }

        try {
            String prompt = "Analyze the following text extracted from an e-invoice webpage. "
                    + "Extract the final total amount paid (as a number), a brief description/name of the store or supplier, and the list of purchased items. "
                    + "Each item should have 'description' (string), 'quantity' (number), 'unitPrice' (number), and 'totalPrice' (number). "
                    + "Return exactly a JSON object in this format: "
                    + "{\"amount\": 150000, \"note\": \"Supermarket Groceries\", \"items\": [{\"description\": \"Item 1\", \"quantity\": 1, \"unitPrice\": 50000, \"totalPrice\": 50000}]}. "
                    + "Do not include any other text, markdown, or code blocks.\n\n"
                    + "Text content:\n" + htmlText;

            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                generatedText =
                        generatedText.replaceAll("```json", "").replaceAll("```", "").trim();

                com.fasterxml.jackson.databind.ObjectMapper mapper =
                        new com.fasterxml.jackson.databind.ObjectMapper();
                return mapper.readValue(generatedText, ScanReceiptResponse.class);
            } else {
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        } catch (Exception e) {
            log.error("Lỗi khi trích xuất hóa đơn từ HTML qua Gemini API", e);
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private String buildPrompt(AiMessageRequest request) {
        NumberFormat currencyFormatter =
                NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("vi-VN"));
        String formattedAmount = currencyFormatter.format(request.getAmount());

        return String.format(
                "Hãy đóng vai một người bạn, viết một tin nhắn đòi tiền gửi cho người tên là '%s'. "
                        + "Số tiền cần đòi là %s. "
                        + "Phong cách của tin nhắn phải là: %s. "
                        + "Yêu cầu: Viết ngắn gọn, tự nhiên, ngôn ngữ tiếng Việt đời thường, không cần lời chào hỏi quá trang trọng.",
                request.getDebtorName(), formattedAmount, request.getMood());
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromGeminiResponse(Map<String, Object> responseBody) {
        try {
            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) responseBody.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> candidate = candidates.get(0);
                Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                if (parts != null && !parts.isEmpty()) {
                    return (String) parts.get(0).get("text");
                }
            }
            return "Không thể tạo tin nhắn lúc này.";
        } catch (Exception e) {
            return "Lỗi khi đọc phản hồi từ AI.";
        }
    }

    private ResponseEntity<Map> callGeminiApiWithRetry(HttpEntity<Map<String, Object>> entity) {
        int maxRetries = 3;
        long waitTime = 1000;

        for (int i = 0; i < maxRetries; i++) {
            try {
                return restTemplate.postForEntity(apiUrl, entity, Map.class);
            } catch (Exception e) {
                log.warn("Lỗi khi gọi Gemini API (lần thử {}/{}): {}", i + 1, maxRetries, e.getMessage());
                if (i == maxRetries - 1) {
                    throw e;
                }
                try {
                    Thread.sleep(waitTime);
                    waitTime *= 2;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new AppException(ErrorCode.INTERNAL_ERROR);
                }
            }
        }
        throw new AppException(ErrorCode.INTERNAL_ERROR);
    }
}
