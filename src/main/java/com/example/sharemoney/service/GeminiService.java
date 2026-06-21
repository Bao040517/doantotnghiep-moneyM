package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String urlWithKey = apiUrl + "?key=" + apiKey;

        try {
            ResponseEntity<Map> response =
                    restTemplate.postForEntity(urlWithKey, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                return AiMessageResponse.builder().message(generatedText).build();
            } else {
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        } catch (Exception e) {
            // Log error here in a real app
            throw new AppException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private String buildPrompt(AiMessageRequest request) {
        NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("vi-VN"));
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
}
