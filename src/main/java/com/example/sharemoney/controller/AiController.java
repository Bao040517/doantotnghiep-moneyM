package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.AiAssistantRequest;
import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.response.AiAssistantResponse;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.dto.response.SavingsGoalResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.AiAssistantService;
import com.example.sharemoney.service.GeminiService;
import com.example.sharemoney.service.SavingsGoalService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;
    private final AiAssistantService aiAssistantService;
    private final SavingsGoalService savingsGoalService;

    /**
     * POST /api/ai/generate-message Gọi Google Gemini API để tạo tin nhắn đòi nợ theo phong cách
     * (mood).
     */
    @PostMapping("/generate-message")
    public ResponseEntity<AiMessageResponse> generateMessage(
            @Valid @RequestBody AiMessageRequest request) {
        return ResponseEntity.ok(geminiService.generateDebtMessage(request));
    }

    /** POST /api/ai/assistant/chat — AI Chatbot hội thoại tài chính thông minh. */
    @PostMapping("/assistant/chat")
    public ResponseEntity<AiAssistantResponse> chat(
            @Valid @RequestBody AiAssistantRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(aiAssistantService.chat(userId, request));
    }

    /** POST /api/ai/assistant/confirm-goal — 1-chạm tạo Hũ Tiết Kiệm từ kế hoạch AI đề xuất. */
    @PostMapping("/assistant/confirm-goal")
    public ResponseEntity<SavingsGoalResponse> confirmGoal(
            @RequestBody AiAssistantResponse.GoalPlanData goalPlanData) {
        UUID userId = SecurityUtils.getCurrentUserId();

        SavingsGoalRequest req =
                SavingsGoalRequest.builder()
                        .name(goalPlanData.getGoalName())
                        .targetAmount(goalPlanData.getTargetAmount())
                        .deadlineDate(
                                goalPlanData.getDeadlineDate() != null
                                        ? LocalDate.parse(goalPlanData.getDeadlineDate())
                                        : LocalDate.now()
                                                .plusMonths(
                                                        goalPlanData.getTargetMonths() != null
                                                                ? goalPlanData.getTargetMonths()
                                                                : 3))
                        .build();
        return ResponseEntity.ok(savingsGoalService.createSavingsGoal(userId, req));
    }

    /**
     * POST /api/ai/assistant/confirm-financial-plan — 1-chạm tạo toàn bộ Ngân sách & Ghi nhận Thu
     * nhập
     */
    @PostMapping("/assistant/confirm-financial-plan")
    public ResponseEntity<java.util.Map<String, Object>> confirmFinancialPlan(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false")
                    boolean asExpenses,
            @RequestBody AiAssistantResponse.FinancialPlanData planData) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(
                aiAssistantService.confirmFinancialPlan(userId, planData, asExpenses));
    }
}
