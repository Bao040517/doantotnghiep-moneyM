package com.example.sharemoney.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.sharemoney.dto.request.AiAssistantRequest;
import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.request.ScanQrReceiptRequest;
import com.example.sharemoney.dto.response.AiAssistantResponse;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.dto.response.SavingsGoalResponse;
import com.example.sharemoney.dto.response.ScanReceiptResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.AiAssistantService;
import com.example.sharemoney.service.GeminiService;
import com.example.sharemoney.service.QrReceiptService;
import com.example.sharemoney.service.ReceiptScanService;
import com.example.sharemoney.service.SavingsGoalService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiControllerTest {

    @Mock private GeminiService geminiService;

    @Mock private ReceiptScanService receiptScanService;

    @Mock private QrReceiptService qrReceiptService;

    @Mock private AiAssistantService aiAssistantService;

    @Mock private SavingsGoalService savingsGoalService;

    @InjectMocks private AiController aiController;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Endpoint POST /api/ai/assistant/chat - Gọi chat AI thành công")
    void testChatEndpoint() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            AiAssistantRequest request =
                    AiAssistantRequest.builder()
                            .message("Muốn mua iPhone 16 Pro Max 30 triệu trong 3 tháng")
                            .build();

            AiAssistantResponse expectedResponse =
                    AiAssistantResponse.builder()
                            .reply("Kế hoạch mua iPhone 16 Pro Max...")
                            .intent("PLAN_SAVINGS_GOAL")
                            .build();

            when(aiAssistantService.chat(eq(userId), eq(request))).thenReturn(expectedResponse);

            ResponseEntity<AiAssistantResponse> response = aiController.chat(request);

            assertEquals(200, response.getStatusCode().value());
            assertNotNull(response.getBody());
            assertEquals("PLAN_SAVINGS_GOAL", response.getBody().getIntent());
            assertEquals("Kế hoạch mua iPhone 16 Pro Max...", response.getBody().getReply());
            verify(aiAssistantService).chat(eq(userId), eq(request));
        }
    }

    @Test
    @DisplayName(
            "Endpoint POST /api/ai/assistant/confirm-goal - 1-chạm tạo Hũ Tiết Kiệm từ AI Plan")
    void testConfirmGoalEndpoint() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            AiAssistantResponse.GoalPlanData goalData =
                    AiAssistantResponse.GoalPlanData.builder()
                            .goalName("iPhone 16 Pro Max")
                            .targetAmount(new BigDecimal("30000000"))
                            .targetMonths(3)
                            .deadlineDate("2026-11-28")
                            .build();

            SavingsGoalResponse createdGoal =
                    SavingsGoalResponse.builder()
                            .id(UUID.randomUUID())
                            .name("iPhone 16 Pro Max")
                            .targetAmount(new BigDecimal("30000000"))
                            .currentAmount(BigDecimal.ZERO)
                            .deadlineDate(LocalDate.parse("2026-11-28"))
                            .build();

            when(savingsGoalService.createSavingsGoal(eq(userId), any(SavingsGoalRequest.class)))
                    .thenReturn(createdGoal);

            ResponseEntity<SavingsGoalResponse> response = aiController.confirmGoal(goalData);

            assertEquals(200, response.getStatusCode().value());
            assertNotNull(response.getBody());
            assertEquals("iPhone 16 Pro Max", response.getBody().getName());
            assertEquals(new BigDecimal("30000000"), response.getBody().getTargetAmount());
            verify(savingsGoalService).createSavingsGoal(eq(userId), any(SavingsGoalRequest.class));
        }
    }

    @Test
    @DisplayName("Endpoint POST /api/ai/generate-message - Sinh tin nhắn đòi nợ theo mood")
    void testGenerateDebtMessageEndpoint() {
        AiMessageRequest request = new AiMessageRequest();
        request.setDebtorName("Trần Văn B");
        request.setAmount(new BigDecimal("200000"));
        request.setMood("FUNNY");

        AiMessageResponse expected =
                AiMessageResponse.builder()
                        .message("Trần Văn B ơi, 200.000đ của mình đâu rồi nè!")
                        .build();

        when(geminiService.generateDebtMessage(request)).thenReturn(expected);

        ResponseEntity<AiMessageResponse> response = aiController.generateMessage(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(
                "Trần Văn B ơi, 200.000đ của mình đâu rồi nè!", response.getBody().getMessage());
        verify(geminiService).generateDebtMessage(request);
    }

    @Test
    @DisplayName("Endpoint POST /api/ai/scan-qr-receipt - Quét hóa đơn điện tử qua QR URL")
    void testScanQrReceiptEndpoint() {
        ScanQrReceiptRequest request = new ScanQrReceiptRequest();
        request.setUrl("https://hoadon.vnpt.vn/lookup?id=12345");

        ScanReceiptResponse expected =
                ScanReceiptResponse.builder()
                        .amount(new BigDecimal("450000"))
                        .note("Hóa đơn VNPT")
                        .build();

        when(qrReceiptService.scanReceiptFromUrl("https://hoadon.vnpt.vn/lookup?id=12345"))
                .thenReturn(expected);

        ResponseEntity<ScanReceiptResponse> response = aiController.scanQrReceipt(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(new BigDecimal("450000"), response.getBody().getAmount());
        assertEquals("Hóa đơn VNPT", response.getBody().getNote());
        verify(qrReceiptService).scanReceiptFromUrl("https://hoadon.vnpt.vn/lookup?id=12345");
    }
}
