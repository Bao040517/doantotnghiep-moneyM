package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.dto.response.ReceiptItemResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value(
            "${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    public boolean isValidApiKey() {
        return apiKey != null
                && !apiKey.trim().isEmpty()
                && !apiKey.contains("YOUR_GEMINI_API_KEY_HERE");
    }

    public AiMessageResponse generateDebtMessage(AiMessageRequest request) {
        if (!isValidApiKey()) {
            log.info(
                    "[GeminiService] API key not configured, using smart dynamic heuristic fallback.");
            return AiMessageResponse.builder().message(generateFallbackMessage(request)).build();
        }

        try {
            String prompt = buildPrompt(request);

            // Chuẩn bị payload theo format của Gemini API
            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                if (generatedText != null && !generatedText.isBlank()) {
                    return AiMessageResponse.builder().message(generatedText.trim()).build();
                }
            }
        } catch (Exception e) {
            log.warn(
                    "[GeminiService] Gemini API call encountered error: {}. Falling back to dynamic heuristic generator.",
                    e.getMessage());
        }

        // Graceful fallback whenever Gemini is unavailable or errors out
        return AiMessageResponse.builder().message(generateFallbackMessage(request)).build();
    }

    public ScanReceiptResponse scanReceipt(MultipartFile file) {
        if (!isValidApiKey()) {
            throw new AppException(ErrorCode.RECEIPT_SCAN_CONFIG_ERROR);
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
                            "Analyze this receipt image carefully. Extract the final total amount paid (as a number), the store or supplier name (as 'note'), and the list of line items purchased if visible. "
                                    + "Return strictly a valid JSON object in this format: "
                                    + "{\"amount\": 150000, \"note\": \"Tên cửa hàng\", \"items\": [{\"description\": \"Tên món\", \"quantity\": 1, \"unitPrice\": 50000, \"totalPrice\": 50000}]}. "
                                    + "Do not include any other text, markdown, or code blocks.");

            Map<String, Object> imagePart = Map.of("inline_data", inlineData);

            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(textPart, imagePart))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                if (generatedText != null) {
                    generatedText =
                            generatedText.replaceAll("```json", "").replaceAll("```", "").trim();
                    com.fasterxml.jackson.databind.ObjectMapper mapper =
                            new com.fasterxml.jackson.databind.ObjectMapper();
                    return mapper.readValue(generatedText, ScanReceiptResponse.class);
                }
            }
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GeminiService] Error scanning receipt via Gemini API", e);
            throw new AppException(ErrorCode.RECEIPT_SCAN_FAILED);
        }
    }

    public ScanReceiptResponse extractReceiptFromHtml(String htmlText) {
        if (!isValidApiKey()) {
            log.info(
                    "[GeminiService] Gemini API key not set, parsing HTML via heuristic fallback.");
            return extractReceiptViaHeuristic(htmlText);
        }

        try {
            String prompt =
                    "Analyze the following text extracted from an e-invoice webpage. "
                            + "Extract the final total amount paid (as a number), a brief description/name of the store or supplier, and the list of purchased items. "
                            + "Each item should have 'description' (string), 'quantity' (number), 'unitPrice' (number), and 'totalPrice' (number). "
                            + "Return exactly a JSON object in this format: "
                            + "{\"amount\": 150000, \"note\": \"Supermarket Groceries\", \"items\": [{\"description\": \"Item 1\", \"quantity\": 1, \"unitPrice\": 50000, \"totalPrice\": 50000}]}. "
                            + "Do not include any other text, markdown, or code blocks.\n\n"
                            + "Text content:\n"
                            + htmlText;

            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                if (generatedText != null) {
                    generatedText =
                            generatedText.replaceAll("```json", "").replaceAll("```", "").trim();
                    com.fasterxml.jackson.databind.ObjectMapper mapper =
                            new com.fasterxml.jackson.databind.ObjectMapper();
                    return mapper.readValue(generatedText, ScanReceiptResponse.class);
                }
            }
        } catch (Exception e) {
            log.warn(
                    "[GeminiService] Gemini HTML extraction failed: {}. Using heuristic parser.",
                    e.getMessage());
        }

        return extractReceiptViaHeuristic(htmlText);
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
                if (content != null) {
                    List<Map<String, Object>> parts =
                            (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private ResponseEntity<Map> callGeminiApiWithRetry(HttpEntity<Map<String, Object>> entity) {
        int maxRetries = 2;
        long waitTime = 800;

        String targetUrl = apiUrl;
        if (apiKey != null && !apiKey.isBlank() && !targetUrl.contains("key=")) {
            targetUrl = targetUrl + (targetUrl.contains("?") ? "&" : "?") + "key=" + apiKey.trim();
        }

        for (int i = 0; i < maxRetries; i++) {
            try {
                return restTemplate.postForEntity(targetUrl, entity, Map.class);
            } catch (Exception e) {
                log.warn(
                        "[GeminiService] Attempt {}/{} failed: {}",
                        i + 1,
                        maxRetries,
                        e.getMessage());
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

    /**
     * Thuật toán Heuristic đa dạng tạo câu nhắc nợ thông minh cục bộ khi chưa có Gemini API Key
     * hoặc mạng lỗi.
     */
    private String generateFallbackMessage(AiMessageRequest request) {
        String debtor =
                (request.getDebtorName() != null && !request.getDebtorName().isBlank())
                        ? request.getDebtorName().trim()
                        : "bạn hiền";
        NumberFormat currencyFormatter =
                NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("vi-VN"));
        String amountStr = currencyFormatter.format(request.getAmount());

        String mood = request.getMood() != null ? request.getMood().toUpperCase().trim() : "FUNNY";

        List<String> options;
        switch (mood) {
            case "POLITE":
                options =
                        List.of(
                                String.format(
                                        "Chào %s, bạn kiểm tra giúp mình khoản chi tiêu nhóm %s và chuyển khoản giùm mình khi thuận tiện nhé. Cảm ơn bạn rất nhiều! ☕",
                                        debtor, amountStr),
                                String.format(
                                        "Hi %s, khi nào rảnh bạn chuyển khoản %s tiền quỹ nhóm giúp mình nha. Cảm ơn bạn nhiều! 😊",
                                        debtor, amountStr),
                                String.format(
                                        "%s ơi, phiền bạn check lại thông tin chuyển khoản %s tiền nhóm đợt rồi giúp mình nha. Thank you! 🙏",
                                        debtor, amountStr),
                                String.format(
                                        "Gửi %s, gửi bạn thông tin khoản chia hóa đơn %s, bạn sắp xếp chuyển khoản giúp mình nhé. Cảm ơn bạn! ✨",
                                        debtor, amountStr));
                break;
            case "AGGRESSIVE":
                options =
                        List.of(
                                String.format(
                                        "Thông báo khẩn! %s chuyển ngay %s tiền nhóm giúp mình để chốt sổ tài chính nhé! ⚠️⚡",
                                        debtor, amountStr),
                                String.format(
                                        "%s ơi, khoản nợ %s tiền nhóm hơi lâu rồi đó nha, chuyển khoản gấp trong hôm nay giúp mình với! 🛑",
                                        debtor, amountStr),
                                String.format(
                                        "Cảnh báo hạn chót! %s thanh toán ngay %s tiền nhóm nha, không là bị bêu tên trên nhóm đấy! 😡📢",
                                        debtor, amountStr),
                                String.format(
                                        "Alo alo %s! Nhanh tay chuyển khoản %s tiền nợ nhóm giúp mình cái nào, trốn lâu quá rồi đó! 🔥",
                                        debtor, amountStr));
                break;
            case "POETIC":
                options =
                        List.of(
                                String.format(
                                        "Nắng chiều ngả bóng hoàng hôn, tiền nợ %s xin đừng lãng quên hỡi %s 🌸📜",
                                        amountStr, debtor),
                                String.format(
                                        "Trăm năm Kiều vẫn là Kiều, nợ tiền %s nhóm phải liều mà đòi nha %s 🍃💸",
                                        amountStr, debtor),
                                String.format(
                                        "Gió đưa cành trúc la đà, %s chưa trả %s là ta buồn thiu 🎋✨",
                                        debtor, amountStr),
                                String.format(
                                        "Trăng lên đỉnh núi trăng tà, tiền nợ %s mau mau trả nè %s 🌙🕊️",
                                        amountStr, debtor));
                break;
            case "FUNNY":
            default:
                options =
                        List.of(
                                String.format(
                                        "Ê %s, ví tao đang thở oxy nè! Còn %s tiền nhóm hôm bữa, bắn qua cứu bạn hiền với! 🚑💨",
                                        debtor, amountStr),
                                String.format(
                                        "Alo %s ơi, chim sẻ gọi đại bàng! Đại bàng chuyển khoản %s tiền nhóm giùm chim sẻ mua gói mì tôm nhé 😂🍜",
                                        debtor, amountStr),
                                String.format(
                                        "%s iu quý! Bữa ăn/chi tiêu vui quá, giờ đến tiết mục thanh toán %s tiền nhóm kìa! Bắn lẹ nha bồ tèo 💸✨",
                                        debtor, amountStr),
                                String.format(
                                        "Nghe nói người đẹp/soái ca như %s không bao giờ để nợ qua đêm! Chuyển %s tiền nhóm nha người anh em! 🕶️🔥",
                                        debtor, amountStr),
                                String.format(
                                        "Ê %s, mầy còn nợ tao %s tiền nhóm đó nha! Trả lẹ đi mậy, hết tiền ăn sáng rồi! 🥐☕",
                                        debtor, amountStr));
                break;
        }

        return options.get(random.nextInt(options.size()));
    }

    /** Trích xuất thông tin hoá đơn cơ bản từ nội dung HTML khi không dùng Gemini. */
    private ScanReceiptResponse extractReceiptViaHeuristic(String htmlText) {
        BigDecimal amount = BigDecimal.ZERO;
        String note = "Hoá đơn điện tử";

        try {
            // Tìm các mẫu số tiền thường gặp trong hoá đơn tiếng Việt (ví dụ: Tổng tiền: 150.000
            // hoặc 150,000 đ)
            Pattern pattern =
                    Pattern.compile(
                            "(?i)(?:tổng cộng|tổng tiền|thanh toán|total)[^0-9]{1,20}([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})");
            Matcher matcher = pattern.matcher(htmlText);
            if (matcher.find()) {
                String rawNum = matcher.group(1).replace(".", "").replace(",", "");
                amount = new BigDecimal(rawNum);
            }

            // Lấy tên cửa hàng từ các cụm từ đầu trang
            if (htmlText.toLowerCase().contains("winmart")) {
                note = "WinMart Supermarket";
            } else if (htmlText.toLowerCase().contains("circle k")) {
                note = "Circle K Convenience Store";
            } else if (htmlText.toLowerCase().contains("co.opmart")
                    || htmlText.toLowerCase().contains("coopmart")) {
                note = "Co.opmart";
            } else if (htmlText.toLowerCase().contains("seven eleven")
                    || htmlText.toLowerCase().contains("7-eleven")) {
                note = "7-Eleven Store";
            }
        } catch (Exception e) {
            log.warn("[GeminiService] Heuristic parsing warning: {}", e.getMessage());
        }

        List<ReceiptItemResponse> items = new ArrayList<>();
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            items.add(
                    ReceiptItemResponse.builder()
                            .description(note)
                            .quantity(1)
                            .unitPrice(amount)
                            .totalPrice(amount)
                            .build());
        }

        return ScanReceiptResponse.builder().amount(amount).note(note).items(items).build();
    }
}
