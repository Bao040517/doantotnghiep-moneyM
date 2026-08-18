package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class GeminiServiceTest {

    private GeminiService geminiService;

    @BeforeEach
    void setUp() {
        geminiService = new GeminiService();
        // Không cấu hình API key để kiểm thử cơ chế fallback heuristic generator
        ReflectionTestUtils.setField(geminiService, "apiKey", "");
        ReflectionTestUtils.setField(geminiService, "apiUrl", "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
    }

    @Test
    @DisplayName("Tạo tin nhắn nhắc nợ phong cách FUNNY (Hài hước) qua Heuristic Fallback thành công")
    void testGenerateDebtMessageFunny() {
        AiMessageRequest request = new AiMessageRequest();
        request.setDebtorName("Trần Văn B");
        request.setAmount(new BigDecimal("150000"));
        request.setMood("FUNNY");

        AiMessageResponse response = geminiService.generateDebtMessage(request);

        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertFalse(response.getMessage().isBlank());
        assertTrue(response.getMessage().contains("Trần Văn B"));
        assertTrue(response.getMessage().contains("150.000"));
    }

    @Test
    @DisplayName("Tạo tin nhắn nhắc nợ phong cách POLITE (Lịch sự) qua Heuristic Fallback thành công")
    void testGenerateDebtMessagePolite() {
        AiMessageRequest request = new AiMessageRequest();
        request.setDebtorName("Nguyễn Thị C");
        request.setAmount(new BigDecimal("300000"));
        request.setMood("POLITE");

        AiMessageResponse response = geminiService.generateDebtMessage(request);

        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().contains("Nguyễn Thị C"));
        assertTrue(response.getMessage().contains("300.000"));
    }

    @Test
    @DisplayName("Tạo tin nhắn nhắc nợ phong cách POETIC (Thơ ca) qua Heuristic Fallback thành công")
    void testGenerateDebtMessagePoetic() {
        AiMessageRequest request = new AiMessageRequest();
        request.setDebtorName("Hoàng Nam");
        request.setAmount(new BigDecimal("500000"));
        request.setMood("POETIC");

        AiMessageResponse response = geminiService.generateDebtMessage(request);

        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().contains("Hoàng Nam"));
        assertTrue(response.getMessage().contains("500.000"));
    }

    @Test
    @DisplayName("Tạo tin nhắn nhắc nợ phong cách AGGRESSIVE (Đòi gấp) qua Heuristic Fallback thành công")
    void testGenerateDebtMessageAggressive() {
        AiMessageRequest request = new AiMessageRequest();
        request.setDebtorName("Lê Tuấn");
        request.setAmount(new BigDecimal("2000000"));
        request.setMood("AGGRESSIVE");

        AiMessageResponse response = geminiService.generateDebtMessage(request);

        assertNotNull(response);
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().contains("Lê Tuấn"));
        assertTrue(response.getMessage().contains("2.000.000"));
    }
}
