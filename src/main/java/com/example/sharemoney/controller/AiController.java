package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.AiMessageRequest;
import com.example.sharemoney.dto.response.AiMessageResponse;
import com.example.sharemoney.service.GeminiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;

    /**
     * POST /api/ai/generate-message Gọi Google Gemini API để tạo tin nhắn đòi nợ theo phong cách
     * (mood).
     */
    @PostMapping("/generate-message")
    public ResponseEntity<AiMessageResponse> generateMessage(
            @Valid @RequestBody AiMessageRequest request) {
        return ResponseEntity.ok(geminiService.generateDebtMessage(request));
    }
}
