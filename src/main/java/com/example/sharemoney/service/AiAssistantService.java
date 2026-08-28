package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiAssistantRequest;
import com.example.sharemoney.dto.response.AiAssistantResponse;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.WalletRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * AI Assistant Service — Trợ lý Tài chính thông minh. Hỗ trợ: 1. Lập kế hoạch mua sắm mục tiêu
 * (Dream Goal Planner) 2. Ghi chép giao dịch siêu tốc bằng ngôn ngữ tự nhiên 3. Hỏi đáp dòng tiền &
 * thống kê tức thì
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value(
            "${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}")
    private String apiUrl;

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────
    // PUBLIC: Xử lý tin nhắn từ người dùng
    // ─────────────────────────────────────────────────────
    public AiAssistantResponse chat(UUID userId, AiAssistantRequest request) {
        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        if (userMessage.isEmpty()) {
            return buildChatReply(
                    "Bạn chưa nhập gì cả. Thử hỏi mình điều gì đó nhé! 😊", "GENERAL_CHAT");
        }

        // Nạp dữ liệu tài chính thực tế của người dùng
        FinancialContext ctx = loadFinancialContext(userId);

        // Thử dùng Gemini AI nếu có API key
        if (isValidApiKey()) {
            try {
                return chatWithGemini(userId, userMessage, ctx, request.getConversationHistory());
            } catch (Exception e) {
                log.warn(
                        "[AiAssistant] Gemini failed: {}. Falling back to heuristic.",
                        e.getMessage());
            }
        }

        // Fallback: xử lý cục bộ bằng heuristic
        return chatWithHeuristic(userId, userMessage, ctx);
    }

    // ─────────────────────────────────────────────────────
    // GEMINI AI ENGINE
    // ─────────────────────────────────────────────────────
    private AiAssistantResponse chatWithGemini(
            UUID userId,
            String userMessage,
            FinancialContext ctx,
            List<AiAssistantRequest.ChatMessage> history) {
        String systemPrompt = buildGeminiSystemPrompt(ctx);

        // Xây dựng lịch sử hội thoại
        List<Map<String, Object>> contents = new ArrayList<>();

        // System instruction qua tin nhắn đầu tiên
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt))));
        contents.add(
                Map.of(
                        "role",
                        "model",
                        "parts",
                        List.of(
                                Map.of(
                                        "text",
                                        "Hiểu rồi! Mình là Trợ lý Tài chính AI của bạn. Hãy hỏi mình bất cứ điều gì về tài chính cá nhân nhé! 🤖✨"))));

        // Lịch sử chat trước đó (nếu có)
        if (history != null) {
            for (AiAssistantRequest.ChatMessage msg : history) {
                String role = "user".equals(msg.getRole()) ? "user" : "model";
                contents.add(
                        Map.of("role", role, "parts", List.of(Map.of("text", msg.getContent()))));
            }
        }

        // Tin nhắn hiện tại
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));

        Map<String, Object> requestBody = Map.of("contents", contents);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey.trim());

        String targetUrl = apiUrl + (apiUrl.contains("?") ? "&" : "?") + "key=" + apiKey.trim();
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(targetUrl, entity, Map.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String generatedText = extractTextFromGeminiResponse(response.getBody());
            if (generatedText != null) {
                return parseGeminiJsonResponse(generatedText.trim());
            }
        }

        // Fallback nếu Gemini không trả về kết quả hợp lệ
        return chatWithHeuristic(userId, userMessage, ctx);
    }

    private String buildGeminiSystemPrompt(FinancialContext ctx) {
        NumberFormat fmt = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là Trợ lý Tài chính AI thông minh của ứng dụng ShareMoney. ");
        sb.append("Bạn nói tiếng Việt tự nhiên, thân thiện, dí dỏm và truyền cảm hứng. ");
        sb.append(
                "Bạn hiểu các viết tắt tiếng Việt: k = nghìn (50k = 50.000đ), tr = triệu, củ = triệu, cành = nghìn, chai = triệu.\n\n");

        sb.append("DỮ LIỆU TÀI CHÍNH THỰC TẾ CỦA NGƯỜI DÙNG THÁNG NÀY:\n");
        sb.append("- Tổng số dư ví: ").append(fmt.format(ctx.totalBalance)).append("\n");
        sb.append("- Tổng thu nhập tháng này: ").append(fmt.format(ctx.monthlyIncome)).append("\n");
        sb.append("- Tổng chi tiêu tháng này: ")
                .append(fmt.format(ctx.monthlyExpense))
                .append("\n");

        if (!ctx.categorySpending.isEmpty()) {
            sb.append("- Chi tiêu theo danh mục tháng này:\n");
            ctx.categorySpending.forEach(
                    (cat, amount) -> {
                        sb.append("  + ")
                                .append(cat)
                                .append(": ")
                                .append(fmt.format(amount))
                                .append("\n");
                    });
        }

        if (!ctx.categories.isEmpty()) {
            sb.append("- Danh sách danh mục chi tiêu: ");
            sb.append(
                    ctx.categories.stream()
                            .map(c -> c.getName() + " (" + c.getIconName() + ")")
                            .collect(Collectors.joining(", ")));
            sb.append("\n");
        }

        if (!ctx.wallets.isEmpty()) {
            sb.append("- Danh sách ví: ");
            sb.append(
                    ctx.wallets.stream()
                            .map(w -> w.getName() + " (" + fmt.format(w.getBalance()) + ")")
                            .collect(Collectors.joining(", ")));
            sb.append("\n");
        }

        sb.append("\nQUY TẮC TRẢ LỜI:\n");
        sb.append(
                "Luôn trả về đúng 1 JSON object (KHÔNG markdown, KHÔNG ```json```) với cấu trúc:\n");
        sb.append("{\n");
        sb.append(
                "  \"reply\": \"Câu trả lời bằng tiếng Việt tự nhiên (dùng emoji, thân thiện, dí dỏm)\",\n");
        sb.append(
                "  \"intent\": \"PLAN_SAVINGS_GOAL | CREATE_TRANSACTION | QUERY_INSIGHT | GENERAL_CHAT\",\n");
        sb.append(
                "  \"goalPlanData\": { chỉ khi intent=PLAN_SAVINGS_GOAL: goalName, targetAmount, targetMonths, monthlySavingsNeeded, dailySavingsNeeded, feasibilityScore (0-100), cutDownSuggestions: [{emoji, categoryName, currentSpending, suggestedSpending, monthlySavings, description}], deadlineDate },\n");
        sb.append(
                "  \"transactionData\": { chỉ khi intent=CREATE_TRANSACTION: amount, categoryName, note, paymentMethod, transactionType (EXPENSE/INCOME) },\n");
        sb.append(
                "  \"quickReplies\": [\"gợi ý câu hỏi tiếp theo 1\", \"gợi ý 2\", \"gợi ý 3\"]\n");
        sb.append("}\n\n");
        sb.append("Khi lập kế hoạch mua sắm mục tiêu (PLAN_SAVINGS_GOAL):\n");
        sb.append("- Tính monthlySavingsNeeded = targetAmount / targetMonths\n");
        sb.append("- Tính dailySavingsNeeded = monthlySavingsNeeded / 30\n");
        sb.append(
                "- Phân tích chi tiêu thực tế và đề xuất cắt giảm CỤ THỂ (cafe, ăn ngoài, mua sắm...)\n");
        sb.append("- Đánh giá feasibilityScore dựa trên thu nhập vs số tiền cần tiết kiệm\n");
        sb.append("- Trả lời truyền cảm hứng, có emoji, có số liệu cụ thể\n\n");
        sb.append("Khi ghi chép giao dịch (CREATE_TRANSACTION):\n");
        sb.append(
                "- Trích xuất amount, tên danh mục phù hợp nhất từ danh sách có sẵn, ghi chú và phương thức thanh toán\n");
        sb.append(
                "- VD: 'Ăn bún bò 55k MoMo' -> amount=55000, categoryName='Ăn uống', note='Bún bò', paymentMethod='MoMo'\n\n");
        sb.append(
                "Khi trả lời thống kê (QUERY_INSIGHT): Dùng dữ liệu thực tế ở trên để trả lời chính xác.\n");

        return sb.toString();
    }

    private AiAssistantResponse parseGeminiJsonResponse(String text) {
        // Dọn dẹp markdown wrapping nếu có
        text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();

        try {
            JsonNode root = objectMapper.readTree(text);

            String reply = root.has("reply") ? root.get("reply").asText() : text;
            String intent = root.has("intent") ? root.get("intent").asText() : "GENERAL_CHAT";

            AiAssistantResponse.AiAssistantResponseBuilder builder =
                    AiAssistantResponse.builder().reply(reply).intent(intent);

            // Parse goalPlanData
            if (root.has("goalPlanData") && !root.get("goalPlanData").isNull()) {
                JsonNode gd = root.get("goalPlanData");
                List<AiAssistantResponse.CutDownSuggestion> suggestions = new ArrayList<>();
                if (gd.has("cutDownSuggestions") && gd.get("cutDownSuggestions").isArray()) {
                    for (JsonNode s : gd.get("cutDownSuggestions")) {
                        suggestions.add(
                                AiAssistantResponse.CutDownSuggestion.builder()
                                        .emoji(getJsonText(s, "emoji"))
                                        .categoryName(getJsonText(s, "categoryName"))
                                        .currentSpending(getJsonBigDecimal(s, "currentSpending"))
                                        .suggestedSpending(
                                                getJsonBigDecimal(s, "suggestedSpending"))
                                        .monthlySavings(getJsonBigDecimal(s, "monthlySavings"))
                                        .description(getJsonText(s, "description"))
                                        .build());
                    }
                }

                builder.goalPlanData(
                        AiAssistantResponse.GoalPlanData.builder()
                                .goalName(getJsonText(gd, "goalName"))
                                .targetAmount(getJsonBigDecimal(gd, "targetAmount"))
                                .targetMonths(
                                        gd.has("targetMonths")
                                                ? gd.get("targetMonths").asInt()
                                                : null)
                                .monthlySavingsNeeded(getJsonBigDecimal(gd, "monthlySavingsNeeded"))
                                .dailySavingsNeeded(getJsonBigDecimal(gd, "dailySavingsNeeded"))
                                .feasibilityScore(
                                        gd.has("feasibilityScore")
                                                ? gd.get("feasibilityScore").asInt()
                                                : null)
                                .cutDownSuggestions(suggestions)
                                .deadlineDate(getJsonText(gd, "deadlineDate"))
                                .build());
            }

            // Parse transactionData
            if (root.has("transactionData") && !root.get("transactionData").isNull()) {
                JsonNode td = root.get("transactionData");
                builder.transactionData(
                        AiAssistantResponse.TransactionData.builder()
                                .amount(getJsonBigDecimal(td, "amount"))
                                .categoryName(getJsonText(td, "categoryName"))
                                .note(getJsonText(td, "note"))
                                .paymentMethod(getJsonText(td, "paymentMethod"))
                                .transactionType(getJsonText(td, "transactionType"))
                                .build());
            }

            // Parse quickReplies
            if (root.has("quickReplies") && root.get("quickReplies").isArray()) {
                List<String> qr = new ArrayList<>();
                for (JsonNode q : root.get("quickReplies")) {
                    qr.add(q.asText());
                }
                builder.quickReplies(qr);
            }

            return builder.build();
        } catch (Exception e) {
            log.warn("[AiAssistant] Failed to parse Gemini JSON: {}", e.getMessage());
            // Trả về text thô nếu không parse được JSON
            return buildChatReply(text, "GENERAL_CHAT");
        }
    }

    // ─────────────────────────────────────────────────────
    // HEURISTIC FALLBACK ENGINE (Không cần API key)
    // ─────────────────────────────────────────────────────
    private AiAssistantResponse chatWithHeuristic(
            UUID userId, String userMessage, FinancialContext ctx) {
        String lower = userMessage.toLowerCase();
        NumberFormat fmt = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

        // 1. Phát hiện ý định lập kế hoạch mua sắm
        if (containsAny(
                lower,
                "muốn mua",
                "mua được",
                "lập kế hoạch",
                "tích lũy",
                "tiết kiệm mua",
                "mục tiêu mua",
                "kế hoạch mua",
                "sắm",
                "dream",
                "ước mơ")) {
            return handleGoalPlanHeuristic(userMessage, lower, ctx, fmt);
        }

        // 2. Phát hiện ý định hỏi thống kê
        if (containsAny(
                lower,
                "tiêu bao nhiêu",
                "chi bao nhiêu",
                "tháng này",
                "thu chi",
                "thống kê",
                "tình hình",
                "tổng chi",
                "tổng thu",
                "còn bao nhiêu",
                "số dư")) {
            return handleQueryInsightHeuristic(lower, ctx, fmt);
        }

        // 3. Phát hiện ý định ghi chép giao dịch
        BigDecimal amount = extractAmount(lower);
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            return handleCreateTransactionHeuristic(userMessage, lower, amount, ctx);
        }

        // 4. Trả lời chung
        String reply =
                "Xin chào! Mình là Trợ lý Tài chính AI của bạn 🤖✨\n\n"
                        + "Mình có thể giúp bạn:\n"
                        + "🎯 Lập kế hoạch mua sắm mục tiêu\n"
                        + "📝 Ghi chép giao dịch siêu nhanh\n"
                        + "📊 Hỏi đáp thống kê chi tiêu\n\n"
                        + "Thử nhắn cho mình nhé!";

        return AiAssistantResponse.builder()
                .reply(reply)
                .intent("GENERAL_CHAT")
                .quickReplies(
                        List.of(
                                "Muốn mua iPhone 30tr trong 3 tháng",
                                "Ăn bún bò 55k MoMo",
                                "Tháng này tiêu bao nhiêu cafe?",
                                "Tình hình thu chi tháng này"))
                .build();
    }

    private AiAssistantResponse handleGoalPlanHeuristic(
            String original, String lower, FinancialContext ctx, NumberFormat fmt) {
        BigDecimal targetAmount = extractAmount(lower);
        Integer targetMonths = extractMonths(lower);
        String goalName = extractGoalName(original);
        if (goalName == null) {
            goalName = extractGoalName(lower);
        }

        if (targetAmount == null || targetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return buildChatReply(
                    "Bạn muốn mua gì và giá bao nhiêu? Hãy nói rõ hơn nhé! Ví dụ: \"Muốn mua iPhone 30 triệu trong 3 tháng\" 🎯",
                    "GENERAL_CHAT");
        }

        if (targetMonths == null || targetMonths <= 0) {
            targetMonths = 3; // Mặc định 3 tháng
        }

        BigDecimal monthlySavings =
                targetAmount.divide(BigDecimal.valueOf(targetMonths), 0, RoundingMode.CEILING);
        BigDecimal dailySavings =
                monthlySavings.divide(BigDecimal.valueOf(30), 0, RoundingMode.CEILING);

        // Tính điểm khả thi
        BigDecimal availableMonthly = ctx.monthlyIncome.subtract(ctx.monthlyExpense);
        if (availableMonthly.compareTo(BigDecimal.ZERO) <= 0) {
            availableMonthly =
                    ctx.monthlyIncome.multiply(BigDecimal.valueOf(0.2)); // Ước tính 20% thu nhập
        }

        int feasibility = 50;
        if (availableMonthly.compareTo(BigDecimal.ZERO) > 0) {
            double ratio =
                    monthlySavings.doubleValue() / Math.max(1, availableMonthly.doubleValue());
            if (ratio <= 0.5) feasibility = 95;
            else if (ratio <= 0.7) feasibility = 85;
            else if (ratio <= 0.9) feasibility = 70;
            else if (ratio <= 1.0) feasibility = 55;
            else if (ratio <= 1.3) feasibility = 35;
            else feasibility = 15;
        }

        // Gợi ý cắt giảm chi tiêu
        List<AiAssistantResponse.CutDownSuggestion> suggestions = new ArrayList<>();
        ctx.categorySpending.entrySet().stream()
                .filter(e -> e.getValue().compareTo(BigDecimal.valueOf(50000)) > 0)
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(4)
                .forEach(
                        e -> {
                            BigDecimal current = e.getValue();
                            BigDecimal suggested =
                                    current.multiply(BigDecimal.valueOf(0.5))
                                            .setScale(0, RoundingMode.HALF_UP);
                            BigDecimal saved = current.subtract(suggested);
                            String emoji = guessEmoji(e.getKey());
                            suggestions.add(
                                    AiAssistantResponse.CutDownSuggestion.builder()
                                            .emoji(emoji)
                                            .categoryName(e.getKey())
                                            .currentSpending(current)
                                            .suggestedSpending(suggested)
                                            .monthlySavings(saved)
                                            .description(
                                                    "Giảm "
                                                            + e.getKey()
                                                            + " từ "
                                                            + fmt.format(current)
                                                            + " xuống "
                                                            + fmt.format(suggested))
                                            .build());
                        });

        LocalDate deadline = LocalDate.now().plusMonths(targetMonths);

        // Soạn reply
        StringBuilder reply = new StringBuilder();
        reply.append("🎯 **Kế hoạch mua ")
                .append(goalName != null ? goalName : "món đồ mơ ước")
                .append("**\n\n");
        reply.append("💰 Giá: ").append(fmt.format(targetAmount)).append("\n");
        reply.append("⏳ Thời hạn: ")
                .append(targetMonths)
                .append(" tháng (đến ")
                .append(deadline)
                .append(")\n\n");
        reply.append("📊 Bạn cần tích lũy:\n");
        reply.append("  • ").append(fmt.format(monthlySavings)).append("/tháng\n");
        reply.append("  • ").append(fmt.format(dailySavings)).append("/ngày\n\n");

        if (!suggestions.isEmpty()) {
            reply.append("✂️ Gợi ý cắt giảm để đạt mục tiêu:\n");
            for (var s : suggestions) {
                reply.append("  ")
                        .append(s.getEmoji())
                        .append(" ")
                        .append(s.getDescription())
                        .append(" (tiết kiệm +")
                        .append(fmt.format(s.getMonthlySavings()))
                        .append("/tháng)\n");
            }
            reply.append("\n");
        }

        reply.append("🏆 Độ khả thi: **").append(feasibility).append("%** ");
        if (feasibility >= 80) reply.append("(Rất khả thi! Cố lên! 💪🔥)");
        else if (feasibility >= 60) reply.append("(Khả thi nếu giữ kỷ luật! 💪)");
        else if (feasibility >= 40) reply.append("(Thử thách đấy, nhưng không phải không thể! 🚀)");
        else reply.append("(Khá gắt, nên cân nhắc kéo dài thời gian hơn 📅)");

        reply.append("\n\n👉 Bấm nút bên dưới để **Kích hoạt Hũ Tiết Kiệm** ngay!");

        return AiAssistantResponse.builder()
                .reply(reply.toString())
                .intent("PLAN_SAVINGS_GOAL")
                .goalPlanData(
                        AiAssistantResponse.GoalPlanData.builder()
                                .goalName(goalName != null ? goalName : "Mục tiêu mua sắm")
                                .targetAmount(targetAmount)
                                .targetMonths(targetMonths)
                                .monthlySavingsNeeded(monthlySavings)
                                .dailySavingsNeeded(dailySavings)
                                .feasibilityScore(feasibility)
                                .cutDownSuggestions(suggestions)
                                .deadlineDate(deadline.toString())
                                .build())
                .quickReplies(
                        List.of(
                                "Nếu tiết kiệm "
                                        + fmt.format(
                                                monthlySavings.multiply(BigDecimal.valueOf(0.7)))
                                        + "/tháng thì mất bao lâu?",
                                "Tháng này tôi tiêu bao nhiêu rồi?",
                                "Tình hình thu chi tháng này"))
                .build();
    }

    private AiAssistantResponse handleQueryInsightHeuristic(
            String lower, FinancialContext ctx, NumberFormat fmt) {
        StringBuilder reply = new StringBuilder();

        // Tìm từ khóa danh mục cụ thể
        String queriedCategory = null;
        BigDecimal queriedAmount = BigDecimal.ZERO;
        for (Map.Entry<String, BigDecimal> entry : ctx.categorySpending.entrySet()) {
            if (lower.contains(entry.getKey().toLowerCase())) {
                queriedCategory = entry.getKey();
                queriedAmount = entry.getValue();
                break;
            }
        }

        // Tìm từ khóa chung: cafe, cà phê, trà sữa...
        if (queriedCategory == null) {
            Map<String, List<String>> keywordMap =
                    Map.of(
                            "Ăn uống",
                                    List.of(
                                            "cafe", "cà phê", "ăn", "bún", "cơm", "phở", "trà sữa",
                                            "uống", "nhậu", "lẩu"),
                            "Di chuyển", List.of("taxi", "grab", "xe", "xăng", "gojek", "be"),
                            "Mua sắm", List.of("mua", "shopping", "shopee", "lazada", "tiki"),
                            "Giải trí", List.of("phim", "game", "chơi", "karaoke", "giải trí"));

            for (var e : keywordMap.entrySet()) {
                for (String kw : e.getValue()) {
                    if (lower.contains(kw)) {
                        queriedCategory = e.getKey();
                        queriedAmount =
                                ctx.categorySpending.getOrDefault(queriedCategory, BigDecimal.ZERO);
                        break;
                    }
                }
                if (queriedCategory != null) break;
            }
        }

        if (queriedCategory != null && queriedAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal percent =
                    ctx.monthlyExpense.compareTo(BigDecimal.ZERO) > 0
                            ? queriedAmount
                                    .multiply(BigDecimal.valueOf(100))
                                    .divide(ctx.monthlyExpense, 1, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
            reply.append("📊 Tháng này bạn đã chi **")
                    .append(fmt.format(queriedAmount))
                    .append("** cho **")
                    .append(queriedCategory)
                    .append("**");
            if (percent.compareTo(BigDecimal.ZERO) > 0) {
                reply.append(", chiếm **").append(percent).append("%** tổng chi tiêu");
            }
            reply.append(".\n\n");
        } else {
            reply.append("📊 **Tổng quan tài chính tháng ")
                    .append(LocalDate.now().getMonthValue())
                    .append("/")
                    .append(LocalDate.now().getYear())
                    .append(":**\n\n");
        }

        reply.append("💵 Tổng thu nhập: ").append(fmt.format(ctx.monthlyIncome)).append("\n");
        reply.append("💸 Tổng chi tiêu: ").append(fmt.format(ctx.monthlyExpense)).append("\n");
        BigDecimal net = ctx.monthlyIncome.subtract(ctx.monthlyExpense);
        reply.append(
                net.compareTo(BigDecimal.ZERO) >= 0
                        ? "✅ Tiết kiệm ròng: +" + fmt.format(net) + " 🎉\n"
                        : "⚠️ Thâm hụt: " + fmt.format(net) + " 😰\n");
        reply.append("🏦 Tổng số dư ví: ").append(fmt.format(ctx.totalBalance)).append("\n");

        if (!ctx.categorySpending.isEmpty()) {
            reply.append("\n📋 Chi tiết theo danh mục:\n");
            ctx.categorySpending.entrySet().stream()
                    .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                    .limit(6)
                    .forEach(
                            e ->
                                    reply.append("  • ")
                                            .append(guessEmoji(e.getKey()))
                                            .append(" ")
                                            .append(e.getKey())
                                            .append(": ")
                                            .append(fmt.format(e.getValue()))
                                            .append("\n"));
        }

        return AiAssistantResponse.builder()
                .reply(reply.toString())
                .intent("QUERY_INSIGHT")
                .quickReplies(
                        List.of(
                                "Muốn mua iPhone 30tr trong 3 tháng",
                                "Giảm chi tiêu ăn uống được không?",
                                "Ăn cơm trưa 45k tiền mặt"))
                .build();
    }

    private AiAssistantResponse handleCreateTransactionHeuristic(
            String original, String lower, BigDecimal amount, FinancialContext ctx) {
        // Tìm danh mục phù hợp nhất
        String categoryName = "Khác";
        Map<String, List<String>> keywordMap = new LinkedHashMap<>();
        keywordMap.put(
                "Ăn uống",
                List.of(
                        "ăn", "bún", "cơm", "phở", "cafe", "cà phê", "trà", "uống", "sữa", "bánh",
                        "lẩu", "nhậu", "bia", "pizza", "gà", "bò"));
        keywordMap.put(
                "Di chuyển",
                List.of("taxi", "grab", "xe", "xăng", "gojek", "be", "bus", "di chuyển"));
        keywordMap.put(
                "Mua sắm",
                List.of("mua", "shopping", "shopee", "lazada", "tiki", "quần", "áo", "giày"));
        keywordMap.put(
                "Giải trí", List.of("phim", "game", "karaoke", "giải trí", "chơi", "du lịch"));
        keywordMap.put(
                "Hoá đơn & Tiện ích",
                List.of("điện", "nước", "wifi", "internet", "gas", "thuê nhà", "phòng trọ"));
        keywordMap.put("Sức khoẻ", List.of("thuốc", "bệnh viện", "khám", "gym", "tập"));
        keywordMap.put("Giáo dục", List.of("học", "sách", "khoá học", "học phí"));

        for (var e : keywordMap.entrySet()) {
            for (String kw : e.getValue()) {
                if (lower.contains(kw)) {
                    categoryName = e.getKey();
                    break;
                }
            }
            if (!"Khác".equals(categoryName)) break;
        }

        // Tìm categoryId thực tế
        UUID categoryId = null;
        for (Category cat : ctx.categories) {
            if (cat.getName().equalsIgnoreCase(categoryName)
                    && cat.getType() == TransactionType.EXPENSE) {
                categoryId = cat.getId();
                break;
            }
        }

        // Trích xuất ghi chú (bỏ số tiền và từ khóa phương thức)
        String note =
                original.replaceAll(
                                "(?i)\\d+[.,]?\\d*\\s*(k|nghìn|ngàn|tr|triệu|củ|cành|đồng|vnd|đ)",
                                "")
                        .replaceAll(
                                "(?i)(momo|tiền mặt|chuyển khoản|thẻ|cash|banking|ví|zalopay)", "")
                        .replaceAll("\\s+", " ")
                        .trim();
        if (note.length() > 50) note = note.substring(0, 50);

        // Phương thức thanh toán
        String paymentMethod = null;
        if (lower.contains("momo")) paymentMethod = "MoMo";
        else if (lower.contains("zalopay") || lower.contains("zalo")) paymentMethod = "ZaloPay";
        else if (lower.contains("chuyển khoản") || lower.contains("banking"))
            paymentMethod = "Chuyển khoản";
        else if (lower.contains("tiền mặt") || lower.contains("cash")) paymentMethod = "Tiền mặt";
        else if (lower.contains("thẻ") || lower.contains("card")) paymentMethod = "Thẻ";

        // Loại giao dịch
        String txType = "EXPENSE";
        if (containsAny(
                lower,
                "nhận lương",
                "thu nhập",
                "nhận tiền",
                "tiền thưởng",
                "lương",
                "bonus",
                "được trả")) {
            txType = "INCOME";
            categoryName = "Thu nhập";
        }

        NumberFormat fmt = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        String reply =
                String.format(
                        "📝 Mình đã nhận diện giao dịch:\n\n"
                                + "💰 Số tiền: **%s**\n"
                                + "🏷️ Danh mục: **%s**\n"
                                + "%s%s\n"
                                + "👉 Bấm nút bên dưới để **tạo giao dịch ngay**!",
                        fmt.format(amount),
                        categoryName,
                        note.isEmpty() ? "" : "📝 Ghi chú: " + note + "\n",
                        paymentMethod != null ? "💳 Thanh toán: " + paymentMethod + "\n" : "");

        return AiAssistantResponse.builder()
                .reply(reply)
                .intent("CREATE_TRANSACTION")
                .transactionData(
                        AiAssistantResponse.TransactionData.builder()
                                .amount(amount)
                                .categoryName(categoryName)
                                .categoryId(categoryId)
                                .note(note.isEmpty() ? null : note)
                                .paymentMethod(paymentMethod)
                                .transactionType(txType)
                                .build())
                .quickReplies(
                        List.of(
                                "Tháng này tiêu bao nhiêu rồi?",
                                "Muốn tiết kiệm mua laptop 20tr",
                                "Tình hình thu chi tháng này"))
                .build();
    }

    // ─────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────
    private FinancialContext loadFinancialContext(UUID userId) {
        FinancialContext ctx = new FinancialContext();
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        ctx.totalBalance = walletRepository.sumBalanceByUserId(userId);
        if (ctx.totalBalance == null) ctx.totalBalance = BigDecimal.ZERO;

        ctx.categories = categoryRepository.findByUser_Id(userId);
        ctx.wallets = walletRepository.findByUser_Id(userId);

        // Tổng hợp thu chi tháng này
        List<Transaction> monthTxns = transactionRepository.findByUserAndMonth(userId, year, month);
        ctx.monthlyIncome = BigDecimal.ZERO;
        ctx.monthlyExpense = BigDecimal.ZERO;
        ctx.categorySpending = new LinkedHashMap<>();

        for (Transaction t : monthTxns) {
            if (t.getType() == TransactionType.INCOME) {
                ctx.monthlyIncome = ctx.monthlyIncome.add(t.getAmount());
            } else if (t.getType() == TransactionType.EXPENSE) {
                ctx.monthlyExpense = ctx.monthlyExpense.add(t.getAmount());
                String catName = t.getCategory() != null ? t.getCategory().getName() : "Khác";
                ctx.categorySpending.merge(catName, t.getAmount(), BigDecimal::add);
            }
        }

        return ctx;
    }

    private BigDecimal extractAmount(String text) {
        // Thử các mẫu: "30 triệu", "30tr", "55k", "120 nghìn", "500 ngàn", "1 củ", "200 cành"
        Pattern[] patterns = {
            Pattern.compile("(\\d+[.,]?\\d*)\\s*(triệu|tr|củ|chai)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(\\d+[.,]?\\d*)\\s*(k|nghìn|ngàn|cành)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(\\d+[.,]?\\d*)\\s*(đồng|vnd|đ)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(\\d{4,9})"), // Số lớn không có đơn vị (>= 1000)
        };

        BigDecimal[] multipliers = {
            BigDecimal.valueOf(1_000_000),
            BigDecimal.valueOf(1_000),
            BigDecimal.ONE,
            BigDecimal.ONE,
        };

        for (int i = 0; i < patterns.length; i++) {
            Matcher m = patterns[i].matcher(text);
            if (m.find()) {
                try {
                    String numStr = m.group(1).replace(",", ".");
                    BigDecimal val = new BigDecimal(numStr).multiply(multipliers[i]);
                    if (val.compareTo(BigDecimal.ZERO) > 0)
                        return val.setScale(0, RoundingMode.HALF_UP);
                } catch (Exception ignored) {
                }
            }
        }
        return null;
    }

    private Integer extractMonths(String text) {
        Pattern p = Pattern.compile("(\\d+)\\s*(tháng|thang|month)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String extractGoalName(String text) {
        // Tìm tên món đồ: "muốn mua iPhone 16 Pro Max", "mua Macbook Air", "mua PS5"
        Pattern p =
                Pattern.compile(
                        "(?:muốn mua|tích lũy mua|kế hoạch mua|tiết kiệm mua|mục tiêu mua|mua|sắm)\\s+(.+?)(?=\\s+\\d+[.,]?\\d*\\s*(?:triệu|tr|củ|chai|k|nghìn|ngàn|cành|đồng|vnd|đ)|\\s+giá|\\s+trong|\\s+với|$)",
                        Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            String name = m.group(1).trim();
            // Bỏ số tiền và đơn vị ở cuối nếu còn sót
            name =
                    name.replaceAll("\\d+[.,]?\\d*\\s*(k|tr|triệu|củ|nghìn|ngàn|đồng|vnd|đ).*", "")
                            .trim();
            if (!name.isEmpty() && name.length() > 2) return name;
        }
        return null;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }

    private String guessEmoji(String categoryName) {
        Map<String, String> emojiMap =
                Map.ofEntries(
                        Map.entry("Ăn uống", "🍜"),
                        Map.entry("Di chuyển", "🚕"),
                        Map.entry("Mua sắm", "🛍️"),
                        Map.entry("Giải trí", "🎬"),
                        Map.entry("Hoá đơn & Tiện ích", "🏠"),
                        Map.entry("Sức khoẻ", "💊"),
                        Map.entry("Giáo dục", "📚"),
                        Map.entry("Thu nhập", "💰"),
                        Map.entry("Khác", "📦"));
        return emojiMap.getOrDefault(categoryName, "📦");
    }

    private boolean isValidApiKey() {
        return apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("YOUR_");
    }

    private AiAssistantResponse buildChatReply(String reply, String intent) {
        return AiAssistantResponse.builder()
                .reply(reply)
                .intent(intent)
                .quickReplies(
                        List.of(
                                "Muốn mua iPhone 30tr trong 3 tháng",
                                "Ăn bún bò 55k MoMo",
                                "Tháng này tiêu bao nhiêu cafe?"))
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractTextFromGeminiResponse(Map<String, Object> body) {
        try {
            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) body.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> content =
                        (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    List<Map<String, Object>> parts =
                            (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AiAssistant] Error extracting Gemini text", e);
        }
        return null;
    }

    private String getJsonText(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private BigDecimal getJsonBigDecimal(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            try {
                return new BigDecimal(node.get(field).asText());
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────────────
    // DATA CLASS
    // ─────────────────────────────────────────────────────
    private static class FinancialContext {
        BigDecimal totalBalance = BigDecimal.ZERO;
        BigDecimal monthlyIncome = BigDecimal.ZERO;
        BigDecimal monthlyExpense = BigDecimal.ZERO;
        Map<String, BigDecimal> categorySpending = new LinkedHashMap<>();
        List<Category> categories = Collections.emptyList();
        List<Wallet> wallets = Collections.emptyList();
    }
}
