package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.FinancialHealthDTO;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.FinancialHealthService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/financial-health")
@RequiredArgsConstructor
public class FinancialHealthController {

    private final FinancialHealthService financialHealthService;

    @GetMapping
    public ResponseEntity<FinancialHealthDTO> getFinancialHealth() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(financialHealthService.calculateHealthScore(userId));
    }
}
