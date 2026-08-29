package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AiAssistantRequest;
import com.example.sharemoney.dto.response.AiAssistantResponse;
import com.example.sharemoney.entity.Budget;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.SavingsGoal;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.repository.WalletRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
            "${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent}")
    private String apiUrl;

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final WalletRepository walletRepository;
    private final BudgetRepository budgetRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─────────────────────────────────────────────────────
    // PUBLIC: Xử lý tin nhắn từ người dùng
    // ─────────────────────────────────────────────────────
    public AiAssistantResponse chat(UUID userId, AiAssistantRequest request) {
        long startTime = System.currentTimeMillis();
        String userMessage = request.getMessage() != null ? request.getMessage().trim() : "";
        int historySize = request.getConversationHistory() != null ? request.getConversationHistory().size() : 0;

        log.info("╔══════════════════════════════════════════════════════════════════════════════");
        log.info("║ 🤖 [AI-CHATBOT] INCOMING USER QUESTION");
        log.info("║ 👤 User ID: {}", userId);
        log.info("║ 💬 Message: \"{}\"", userMessage);
        log.info("║ 📜 Conversation History: {} previous turns", historySize);
        log.info("╠──────────────────────────────────────────────────────────────────────────────");

        if (userMessage.isEmpty()) {
            log.info("║ ⚠️ Empty user message. Returning default greeting.");
            log.info("╚══════════════════════════════════════════════════════════════════════════════");
            return buildChatReply(
                    "Bạn chưa nhập gì cả. Thử hỏi mình điều gì đó nhé! 😊", "GENERAL_CHAT");
        }

        // Nạp dữ liệu tài chính thực tế của người dùng
        FinancialContext ctx = loadFinancialContext(userId);
        log.info("║ 📊 User Financial Context Loaded:");
        log.info("║    - User Name: {}", ctx.userName);
        log.info("║    - Total Balance: {} VND", ctx.totalBalance);
        log.info("║    - Monthly Income: {} VND | Monthly Expense: {} VND", ctx.monthlyIncome, ctx.monthlyExpense);
        log.info("║    - Wallets: {} | Budgets: {} | Savings Goals: {}", ctx.wallets.size(), ctx.budgets.size(), ctx.savingsGoals.size());

        AiAssistantResponse response;
        // Thử dùng Gemini AI nếu có API key
        if (isValidApiKey()) {
            log.info("║ 🌐 Engine Selected: Google Gemini 2.0 AI (Cloud LLM)");
            try {
                response = chatWithGemini(userId, userMessage, ctx, request.getConversationHistory());
            } catch (Exception e) {
                log.warn(
                        "║ ⚠️ Gemini failed: {}. Falling back to local heuristic NLP.",
                        e.getMessage());
                log.info("║ ⚙️ Engine Fallback: Local Heuristic Rule-Based NLP");
                response = chatWithHeuristic(userId, userMessage, ctx);
            }
        } else {
            log.info("║ ⚙️ Engine Selected: Local Heuristic Rule-Based NLP (No Gemini API Key)");
            response = chatWithHeuristic(userId, userMessage, ctx);
        }

        long totalDuration = System.currentTimeMillis() - startTime;
        log.info("╠──────────────────────────────────────────────────────────────────────────────");
        log.info("║ 🎯 Resolved Intent: {}", response.getIntent());
        log.info("║ 📝 Final Reply: \"{}\"", response.getReply() != null ? response.getReply().replace("\n", " ") : "");
        if (response.getTransactionData() != null) {
            log.info("║ 💸 Detected Transaction: {} VND | Category: {} | Note: {} | Type: {}",
                    response.getTransactionData().getAmount(),
                    response.getTransactionData().getCategoryName(),
                    response.getTransactionData().getNote(),
                    response.getTransactionData().getTransactionType());
        }
        if (response.getGoalPlanData() != null) {
            log.info("║ 🎯 Proposed Savings Goal: \"{}\" | Target: {} VND in {} months | Feasibility Score: {}/100",
                    response.getGoalPlanData().getGoalName(),
                    response.getGoalPlanData().getTargetAmount(),
                    response.getGoalPlanData().getTargetMonths(),
                    response.getGoalPlanData().getFeasibilityScore());
        }
        log.info("║ ⏱️ Total AI Pipeline Execution Time: {} ms", totalDuration);
        log.info("╚══════════════════════════════════════════════════════════════════════════════");

        return response;
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

        log.info("║ 🚀 Dispatching prompt to Gemini API endpoint...");
        long geminiStart = System.currentTimeMillis();
        ResponseEntity<Map> response = restTemplate.postForEntity(targetUrl, entity, Map.class);
        long geminiDuration = System.currentTimeMillis() - geminiStart;
        log.info("║ 📥 Gemini API replied with HTTP {} in {} ms", response.getStatusCode(), geminiDuration);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            String generatedText = extractTextFromGeminiResponse(response.getBody());
            log.info("║ 🧠 Raw Gemini Model Output: \"{}\"", generatedText != null ? generatedText.replace("\n", " ") : "null");
            if (generatedText != null) {
                return parseGeminiJsonResponse(generatedText.trim());
            }
        }

        // Fallback nếu Gemini không trả về kết quả hợp lệ
        log.warn("║ ⚠️ Gemini response invalid. Switching to Heuristic.");
        return chatWithHeuristic(userId, userMessage, ctx);
    }

    private String buildGeminiSystemPrompt(FinancialContext ctx) {
        NumberFormat fmt = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là Trợ lý Tài chính AI thông minh của ứng dụng ShareMoney. ");
        sb.append("Bạn đang trò chuyện trực tiếp với người dùng ")
                .append(ctx.userName)
                .append(". ");
        sb.append(
                "Bạn nói tiếng Việt tự nhiên, thân thiện, dí dỏm, truyền cảm hứng và luôn dựa vào dữ liệu tài chính thực tế dưới đây để tư vấn chính xác.\n");
        sb.append(
                "Bạn hiểu các từ lóng tài chính tiếng Việt: k = nghìn (50k = 50.000đ), tr = triệu, củ = triệu, cành = nghìn, chai = triệu.\n\n");

        sb.append("=== TOÀN BỘ DỮ LIỆU TÀI CHÍNH THỰC TẾ TRONG HỆ THỐNG CỦA ")
                .append(ctx.userName.toUpperCase())
                .append(" (THÁNG ")
                .append(LocalDate.now().getMonthValue())
                .append("/")
                .append(LocalDate.now().getYear())
                .append(") ===\n");
        sb.append("1. TỔNG QUAN TÀI SẢN:\n");
        sb.append("   - Tổng số dư khả dụng trên tất cả ví: ")
                .append(fmt.format(ctx.totalBalance))
                .append("\n");
        sb.append("   - Tổng thu nhập tháng này: ")
                .append(fmt.format(ctx.monthlyIncome))
                .append("\n");
        sb.append("   - Tổng chi tiêu tháng này: ")
                .append(fmt.format(ctx.monthlyExpense))
                .append("\n");
        BigDecimal net = ctx.monthlyIncome.subtract(ctx.monthlyExpense);
        sb.append("   - Dòng tiền ròng (Thu - Chi): ")
                .append(fmt.format(net))
                .append(net.compareTo(BigDecimal.ZERO) >= 0 ? " (Thặng dư)" : " (Thâm hụt)")
                .append("\n\n");

        if (!ctx.wallets.isEmpty()) {
            sb.append("2. CHI TIẾT CÁC VÍ:\n");
            for (Wallet w : ctx.wallets) {
                sb.append("   + ")
                        .append(w.getName())
                        .append(": ")
                        .append(fmt.format(w.getBalance()))
                        .append("\n");
            }
            sb.append("\n");
        }

        if (!ctx.categorySpending.isEmpty()) {
            sb.append("3. CHI TIÊU THEO DANH MỤC THÁNG NÀY:\n");
            ctx.categorySpending.forEach(
                    (cat, amount) -> {
                        sb.append("   + ")
                                .append(cat)
                                .append(": ")
                                .append(fmt.format(amount))
                                .append("\n");
                    });
            sb.append("\n");
        }

        if (!ctx.budgets.isEmpty()) {
            sb.append("4. KẾ HOẠCH NGÂN SÁCH THÁNG NÀY:\n");
            for (Budget b : ctx.budgets) {
                String catName = b.getCategory() != null ? b.getCategory().getName() : "";
                BigDecimal spent = ctx.categorySpending.getOrDefault(catName, BigDecimal.ZERO);
                BigDecimal limit =
                        b.getLimitAmount() != null ? b.getLimitAmount() : BigDecimal.ZERO;
                sb.append("   + ")
                        .append(
                                b.getName() != null && !b.getName().isBlank()
                                        ? b.getName()
                                        : (!catName.isEmpty() ? catName : "Ngân sách"))
                        .append(": Đã chi ")
                        .append(fmt.format(spent))
                        .append(" / Hạn mức ")
                        .append(fmt.format(limit))
                        .append(
                                limit.compareTo(BigDecimal.ZERO) > 0 && spent.compareTo(limit) > 0
                                        ? " [⚠️ VƯỢT HẠN MỨC]"
                                        : "")
                        .append("\n");
            }
            sb.append("\n");
        }

        if (!ctx.savingsGoals.isEmpty()) {
            sb.append("5. CÁC HŨ TIẾT KIỆM HIỆN CÓ:\n");
            for (SavingsGoal sg : ctx.savingsGoals) {
                sb.append("   + ")
                        .append(sg.getName())
                        .append(": Đã tích lũy ")
                        .append(fmt.format(sg.getCurrentAmount()))
                        .append(" / Mục tiêu ")
                        .append(fmt.format(sg.getTargetAmount()))
                        .append(" (Hạn: ")
                        .append(sg.getDeadlineDate())
                        .append(")")
                        .append("\n");
            }
            sb.append("\n");
        }

        if (!ctx.recentTransactions.isEmpty()) {
            sb.append("6. GIAO DỊCH PHÁT SINH GẦN ĐÂY:\n");
            for (String tx : ctx.recentTransactions) {
                sb.append("   - ").append(tx).append("\n");
            }
            sb.append("\n");
        }

        sb.append("=== QUY TẮC PHẢN HỒI (BẮT BUỘC) ===\n");
        sb.append(
                "Luôn trả về đúng 1 JSON object (KHÔNG kèm markdown ngoài JSON, KHÔNG ```json```) với cấu trúc:\n");
        sb.append("{\n");
        sb.append(
                "  \"reply\": \"Câu trả lời bằng tiếng Việt tự nhiên, xưng hô 'mình' - 'bạn' hoặc gọi tên người dùng, dùng emoji sinh động, phân tích trực tiếp dựa vào số liệu thực tế ở trên\",\n");
        sb.append(
                "  \"intent\": \"PLAN_SAVINGS_GOAL | CREATE_TRANSACTION | QUERY_INSIGHT | GENERAL_CHAT\",\n");
        sb.append(
                "  \"goalPlanData\": { chỉ khi intent=PLAN_SAVINGS_GOAL và đã có số tiền/thời gian cụ thể: goalName, targetAmount, targetMonths, monthlySavingsNeeded, dailySavingsNeeded, feasibilityScore (0-100), cutDownSuggestions: [{emoji, categoryName, currentSpending, suggestedSpending, monthlySavings, description}], deadlineDate },\n");
        sb.append(
                "  \"transactionData\": { chỉ khi intent=CREATE_TRANSACTION: amount, categoryName, note, paymentMethod, transactionType (EXPENSE/INCOME) },\n");
        sb.append("  \"quickReplies\": [\"gợi ý 1-chạm 1\", \"gợi ý 2\", \"gợi ý 3\"]\n");
        sb.append("HƯỚNG DẪN XỬ LÝ THEO TỪNG TÌNH HUỐNG:\n");
        sb.append(
                "1. Khi người dùng nói về mục tiêu/ước mơ/dự định (VD: 'tôi muốn đi du lịch đà lạt', 'muốn mua iPhone 16 Pro Max 30tr trong 3 tháng', 'dự định mua xe máy'):\n");
        sb.append(
                "   - Nếu ĐÃ CÓ số tiền và thời gian: Tính toán chi tiết kế hoạch (monthlySavingsNeeded = targetAmount / targetMonths, dailySavingsNeeded = monthlySavingsNeeded / 30), phân tích số dư và chi tiêu thực tế của người dùng để tính feasibilityScore và gợi ý cắt giảm cụ thể (VD: cắt bớt Ăn uống, Mua sắm từ dữ liệu ở trên).\n");
        sb.append(
                "   - Nếu CHƯA CÓ số tiền hoặc thời gian cụ thể (VD: 'tôi muốn đi du lịch đà lạt', 'dự định mua xe'): Đặt intent='PLAN_SAVINGS_GOAL', goalPlanData=null. Phân tích nhẹ tình hình tài chính của bạn (số dư ví, thu chi), cổ vũ nhiệt tình cho mục tiêu đó, ước lượng chi phí phổ biến và hỏi người dùng dự tính bao nhiêu tiền & trong mấy tháng. Cung cấp 3 quickReplies gợi ý số tiền/tháng cụ thể (VD: ['Đi du lịch Đà Lạt 3tr trong 2 tháng', 'Đi du lịch Đà Lạt 5tr trong 3 tháng', 'Đi du lịch Đà Lạt 10tr trong 6 tháng']).\n");
        sb.append(
                "2. Khi người dùng muốn ghi chép giao dịch (VD: 'Ăn bún bò 55k MoMo', 'Đi Grab 35k tiền mặt'):\n");
        sb.append(
                "   - Trích xuất amount, categoryName từ danh sách danh mục có sẵn, note, paymentMethod, transactionType.\n");
        sb.append(
                "3. Khi người dùng hỏi thăm về tình hình tài chính, thu chi, số dư (VD: 'Tháng này tiêu bao nhiêu cafe?', 'Tình hình tài chính thế nào?'):\n");
        sb.append(
                "   - Dùng chính xác số liệu trong DỮ LIỆU TÀI CHÍNH THỰC TẾ ở trên để trả lời rõ ràng, chi tiết, kèm lời khuyên quản lý tài chính hữu ích.\n");

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

        // 1. Phát hiện ý định hỏi thống kê (Ưu tiên kiểm tra trước)
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

        // 2. Phát hiện ý định ghi chép giao dịch khi có số tiền và từ khóa chi tiêu thực tế
        BigDecimal amount = extractAmount(lower);
        if (amount != null
                && amount.compareTo(BigDecimal.ZERO) > 0
                && (containsAny(
                                lower,
                                "ăn",
                                "uống",
                                "cơm",
                                "bún",
                                "phở",
                                "cafe",
                                "cà phê",
                                "trà",
                                "grab",
                                "taxi",
                                "xăng",
                                "momo",
                                "tiền mặt",
                                "chuyển khoản",
                                "zalopay",
                                "nhận lương",
                                "lương",
                                "thu nhập")
                        || !containsAny(
                                lower,
                                "muốn",
                                "ước",
                                "dự định",
                                "kế hoạch",
                                "mục tiêu",
                                "tích lũy",
                                "tiết kiệm",
                                "tích cóp",
                                "trong"))) {
            return handleCreateTransactionHeuristic(userMessage, lower, amount, ctx);
        }

        // 3. Phát hiện ý định lập kế hoạch mua sắm / mục tiêu tiết kiệm (Dream Goal Planner)
        if (containsAny(
                lower,
                "muốn",
                "ước",
                "dự định",
                "kế hoạch",
                "mục tiêu",
                "tích lũy",
                "tiết kiệm",
                "tích cóp",
                "du lịch",
                "đi chơi",
                "đi phượt",
                "sắm",
                "mua",
                "cưới",
                "học",
                "dream",
                "goal")) {
            return handleGoalPlanHeuristic(userMessage, lower, ctx, fmt);
        }

        // 4. Nếu có số tiền nhưng chưa phân loại được
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            return handleCreateTransactionHeuristic(userMessage, lower, amount, ctx);
        }

        // 5. Trả lời chung
        String reply =
                "Xin chào! Mình là Trợ lý Tài chính AI của bạn 🤖✨\n\n"
                        + "Mình có thể giúp bạn:\n"
                        + "🎯 Lập kế hoạch mua sắm & mục tiêu tài chính (du lịch, mua xe, điện thoại...)\n"
                        + "📝 Ghi chép giao dịch siêu nhanh bằng tiếng Việt tự nhiên\n"
                        + "📊 Hỏi đáp thống kê dòng tiền & chi tiêu tháng này\n\n"
                        + "Thử nhắn cho mình nhé!";

        return AiAssistantResponse.builder()
                .reply(reply)
                .intent("GENERAL_CHAT")
                .quickReplies(
                        List.of(
                                "Tôi muốn đi du lịch Đà Lạt",
                                "Muốn mua iPhone 30tr trong 3 tháng",
                                "Ăn bún bò 55k MoMo",
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

        // Nếu người dùng chưa nêu rõ số tiền hoặc thời gian (VD: "tôi muốn đi du lịch đà lạt",
        // "muốn mua xe máy")
        if (targetAmount == null || targetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            String targetDisplay =
                    (goalName != null && !goalName.isBlank()) ? goalName : "mục tiêu này";
            String promptReply =
                    String.format(
                            "🎯 **Kế hoạch cho mục tiêu: %s** ✨\n\n"
                                    + "Tuyệt vời! Đây là một mục tiêu rất ý nghĩa và hoàn toàn khả thi nếu bạn có kế hoạch tài chính rõ ràng! 🚀\n\n"
                                    + "💡 **Bạn dự tính:**\n"
                                    + "• Chi phí cho chuyến đi/món đồ này khoảng bao nhiêu? (Ví dụ: 3 triệu, 5 triệu, 10 triệu...)\n"
                                    + "• Bạn muốn đạt được mục tiêu trong mấy tháng? (Ví dụ: 2 tháng, 3 tháng...)\n\n"
                                    + "Hãy nhắn cho mình số tiền và thời gian dự kiến (hoặc chọn gợi ý 1-chạm bên dưới) để mình lập kế hoạch tích lũy chi tiết giúp bạn nhé! 💪",
                            targetDisplay);

            List<String> dynamicQuickReplies = new ArrayList<>();
            if (goalName != null && !goalName.isBlank()) {
                dynamicQuickReplies.add(goalName + " 3tr trong 2 tháng");
                dynamicQuickReplies.add(goalName + " 5tr trong 3 tháng");
                dynamicQuickReplies.add(goalName + " 10tr trong 6 tháng");
            } else {
                dynamicQuickReplies.add("Đi du lịch Đà Lạt 5tr trong 3 tháng");
                dynamicQuickReplies.add("Mua iPhone 30tr trong 3 tháng");
                dynamicQuickReplies.add("Tiết kiệm 10tr trong 2 tháng");
            }

            return AiAssistantResponse.builder()
                    .reply(promptReply)
                    .intent("PLAN_SAVINGS_GOAL")
                    .quickReplies(dynamicQuickReplies)
                    .build();
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

        // 1. Tên người dùng
        try {
            userRepository
                    .findById(userId)
                    .ifPresent(
                            u -> {
                                ctx.userName =
                                        (u.getName() != null && !u.getName().isBlank())
                                                ? u.getName()
                                                : "Bạn";
                            });
        } catch (Exception ignored) {
        }

        // 2. Tổng số dư và danh sách ví
        ctx.totalBalance = walletRepository.sumBalanceByUserId(userId);
        if (ctx.totalBalance == null) ctx.totalBalance = BigDecimal.ZERO;
        ctx.wallets = walletRepository.findByUser_Id(userId);

        // 3. Danh mục
        ctx.categories = categoryRepository.findByUser_Id(userId);

        // 4. Tổng hợp thu chi tháng này
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

        // 5. Ngân sách tháng này
        try {
            ctx.budgets = budgetRepository.findByUser_IdAndMonthAndYear(userId, month, year);
        } catch (Exception ignored) {
        }

        // 6. Các hũ tiết kiệm
        try {
            ctx.savingsGoals = savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        } catch (Exception ignored) {
        }

        // 7. Giao dịch gần đây (lấy tối đa 8 giao dịch)
        try {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM");
            NumberFormat fmt = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
            ctx.recentTransactions =
                    monthTxns.stream()
                            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                            .limit(8)
                            .map(
                                    t ->
                                            String.format(
                                                    "%s: %s %s%s (%s, %s)",
                                                    t.getCreatedAt() != null
                                                            ? t.getCreatedAt().format(dtf)
                                                            : "",
                                                    t.getNote() != null
                                                            ? t.getNote()
                                                            : (t.getCategory() != null
                                                                    ? t.getCategory().getName()
                                                                    : "Giao dịch"),
                                                    t.getType() == TransactionType.EXPENSE
                                                            ? "-"
                                                            : "+",
                                                    fmt.format(t.getAmount()),
                                                    t.getCategory() != null
                                                            ? t.getCategory().getName()
                                                            : "Khác",
                                                    t.getPaymentMethod() != null
                                                            ? t.getPaymentMethod()
                                                            : "Ví"))
                            .collect(Collectors.toList());
        } catch (Exception ignored) {
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
        if (text == null || text.isBlank()) return null;

        // 1. Mẫu có tiền tố dự định / ước mơ (VD: "tôi muốn đi du lịch đà lạt", "muốn mua iPhone 16
        // Pro Max 30tr trong 3 tháng")
        Pattern p =
                Pattern.compile(
                        "(?:tôi muốn|mình muốn|em muốn|dự định|kế hoạch|mục tiêu|tích lũy|tiết kiệm mua|tiết kiệm đi|tiết kiệm|tích cóp|ước mơ|muốn|ước)\\s*(.+?)(?=\\s+\\d+[.,]?\\d*\\s*(?:triệu|tr|củ|chai|k|nghìn|ngàn|cành|đồng|vnd|đ)|\\s+giá|\\s+trong|\\s+với|$)",
                        Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(text);
        if (m.find()) {
            String name = m.group(1).trim();
            name =
                    name.replaceAll(
                                    "(?i)\\d+[.,]?\\d*\\s*(k|tr|triệu|củ|chai|nghìn|ngàn|cành|đồng|vnd|đ).*",
                                    "")
                            .trim();
            name = cleanAndFormatGoalName(name);
            if (!name.isEmpty() && name.length() >= 2) return name;
        }

        // 2. Mẫu trực tiếp (VD: "đi du lịch đà lạt", "du lịch phú quốc", "mua xe máy", "học tiếng
        // anh")
        Pattern pDirect =
                Pattern.compile(
                        "(?:đi du lịch|du lịch|đi chơi|đi phượt|mua|sắm|học|cưới)\\s+(.+?)(?=\\s+\\d+[.,]?\\d*\\s*(?:triệu|tr|củ|chai|k|nghìn|ngàn|cành|đồng|vnd|đ)|\\s+giá|\\s+trong|\\s+với|$)",
                        Pattern.CASE_INSENSITIVE);
        Matcher mDirect = pDirect.matcher(text);
        if (mDirect.find()) {
            String name = mDirect.group(1).trim();
            name =
                    name.replaceAll(
                                    "(?i)\\d+[.,]?\\d*\\s*(k|tr|triệu|củ|chai|nghìn|ngàn|cành|đồng|vnd|đ).*",
                                    "")
                            .trim();
            name = cleanAndFormatGoalName(name);
            if (!name.isEmpty() && name.length() >= 2) return name;
        }

        return null;
    }

    private String cleanAndFormatGoalName(String name) {
        if (name == null || name.isBlank()) return "";
        name = name.trim();
        // Bỏ các từ thừa ở đầu nếu có
        name = name.replaceAll("^(?i)(mua|sắm|tích lũy|tiết kiệm)\\s+", "").trim();
        if (name.isEmpty()) return "";

        // Nếu là iPhone -> giữ nguyên iPhone
        if (name.equalsIgnoreCase("iphone") || name.toLowerCase().startsWith("iphone ")) {
            return "iPhone" + name.substring(6);
        }

        // Tự động viết hoa các địa danh / danh từ phổ biến
        name =
                name.replaceAll("(?i)\\bđà lạt\\b", "Đà Lạt")
                        .replaceAll("(?i)\\bhà nội\\b", "Hà Nội")
                        .replaceAll("(?i)\\bsài gòn\\b", "Sài Gòn")
                        .replaceAll("(?i)\\bphú quốc\\b", "Phú Quốc")
                        .replaceAll("(?i)\\bđà nẵng\\b", "Đà Nẵng")
                        .replaceAll("(?i)\\bnha trang\\b", "Nha Trang")
                        .replaceAll("(?i)\\bsapa\\b", "Sa Pa")
                        .replaceAll("(?i)\\bvũng tàu\\b", "Vũng Tàu");

        // Viết hoa chữ cái đầu nếu đang là chữ thường
        if (Character.isLowerCase(name.charAt(0))) {
            return Character.toUpperCase(name.charAt(0)) + name.substring(1);
        }
        return name;
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
        String userName = "Bạn";
        BigDecimal totalBalance = BigDecimal.ZERO;
        BigDecimal monthlyIncome = BigDecimal.ZERO;
        BigDecimal monthlyExpense = BigDecimal.ZERO;
        Map<String, BigDecimal> categorySpending = new LinkedHashMap<>();
        List<Category> categories = Collections.emptyList();
        List<Wallet> wallets = Collections.emptyList();
        List<Budget> budgets = Collections.emptyList();
        List<SavingsGoal> savingsGoals = Collections.emptyList();
        List<String> recentTransactions = Collections.emptyList();
    }
}
