package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Map;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value(
            "${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    public boolean isValidApiKey() {
        return apiKey != null
                && !apiKey.trim().isEmpty()
                && !apiKey.contains("YOUR_GEMINI_API_KEY_HERE");
    }

    public AiMessageResponse generateDebtMessage(AiMessageRequest request) {
        log.info("╔══════════════════════════════════════════════════════════════════════════════");
        log.info("║ 💬 [AI-DEBT-REMINDER] INCOMING DEBT REMINDER REQUEST");
        log.info(
                "║ 👤 Debtor Name: \"{}\" | Amount: {} VND | Mood: \"{}\"",
                request.getDebtorName(),
                request.getAmount(),
                request.getMood());
        log.info("╠──────────────────────────────────────────────────────────────────────────────");

        if (!isValidApiKey()) {
            log.info("║ ⚙️ Engine: Local Dynamic Heuristic (No Gemini API Key)");
            String msg = generateFallbackMessage(request);
            log.info("║ 📝 Generated Message: \"{}\"", msg);
            log.info(
                    "╚══════════════════════════════════════════════════════════════════════════════");
            return AiMessageResponse.builder().message(msg).build();
        }

        log.info("║ 🌐 Engine: Google Gemini 3.6 Flash AI (Cloud LLM)");
        try {
            String prompt = buildPrompt(request);
            log.info("║ 🚀 Dispatching prompt to Gemini API endpoint...");

            // Chuẩn bị payload theo format của Gemini API
            Map<String, Object> requestBody =
                    Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", apiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            long start = System.currentTimeMillis();
            ResponseEntity<Map> response = callGeminiApiWithRetry(entity);
            long duration = System.currentTimeMillis() - start;
            log.info(
                    "║ 📥 Gemini API replied with HTTP {} in {} ms",
                    response.getStatusCode(),
                    duration);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String generatedText = extractTextFromGeminiResponse(response.getBody());
                if (generatedText != null && !generatedText.isBlank()) {
                    String cleanMsg = generatedText.replaceAll("^\"|\"$", "").trim();
                    log.info("║ 📝 Gemini AI Generated Message: \"{}\"", cleanMsg);
                    log.info(
                            "╚══════════════════════════════════════════════════════════════════════════════");
                    return AiMessageResponse.builder().message(cleanMsg).build();
                }
            }
        } catch (Exception e) {
            log.warn(
                    "║ ⚠️ Gemini API call failed: {}. Falling back to dynamic heuristic generator.",
                    e.getMessage());
        }

        // Graceful fallback whenever Gemini is unavailable or errors out
        String fallbackMsg = generateFallbackMessage(request);
        log.info("║ 📝 Fallback Heuristic Message: \"{}\"", fallbackMsg);
        log.info("╚══════════════════════════════════════════════════════════════════════════════");
        return AiMessageResponse.builder().message(fallbackMsg).build();
    }

    private String buildPrompt(AiMessageRequest request) {
        NumberFormat currencyFormatter =
                NumberFormat.getCurrencyInstance(java.util.Locale.forLanguageTag("vi-VN"));
        String formattedAmount = currencyFormatter.format(request.getAmount());
        String debtor =
                (request.getDebtorName() != null && !request.getDebtorName().isBlank())
                        ? request.getDebtorName().trim()
                        : "bạn hiền";
        String mood = request.getMood() != null ? request.getMood().toUpperCase().trim() : "FUNNY";

        String styleGuidance;
        switch (mood) {
            case "POLITE":
                styleGuidance =
                        "Lịch sự, tinh tế, giữ hòa khí bạn bè, xưng hô tôn trọng, nhẹ nhàng nhắc gửi tiền khi thuận tiện.";
                break;
            case "AGGRESSIVE":
                styleGuidance =
                        "Nghiêm túc, dứt khoát, nhắc nhở hạn chót thanh toán để chốt sổ nhóm, dùng emoji cảnh báo.";
                break;
            case "POETIC":
                styleGuidance =
                        "Sáng tác một đoạn thơ 4 chữ hoặc 2 câu lục bát hài hước, vần điệu, ca dao tục ngữ biến tấu nhắc nợ.";
                break;
            case "FUNNY":
            default:
                styleGuidance =
                        "Hài hước, dí dỏm, phong cách Gen Z thân mật (ví dụ: ví đang thở oxy, hết tiền ăn sáng, meme vui), dùng emoji sinh động.";
                break;
        }

        return String.format(
                "Bạn là trợ lý AI của ứng dụng quản lý tài chính ShareMoney. "
                        + "Hãy viết MỘT tin nhắn ngắn bằng tiếng Việt tự nhiên để gửi nhắc nợ cho '%s'.\n"
                        + "- Số tiền nợ: %s\n"
                        + "- Phong cách: %s (%s)\n"
                        + "- Yêu cầu: Viết 1-2 câu ngắn gọn, cảm xúc tự nhiên, đúng trọng tâm, KHÔNG để trong dấu ngoặc kép, KHÔNG kèm lời dẫn thừa hay giải thích.",
                debtor, formattedAmount, mood, styleGuidance);
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
}
