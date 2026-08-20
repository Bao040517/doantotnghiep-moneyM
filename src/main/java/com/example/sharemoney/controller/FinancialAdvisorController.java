package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.FinancialAdviceResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.FinancialAdvisorService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/advisor")
@RequiredArgsConstructor
public class FinancialAdvisorController {

    private final FinancialAdvisorService advisorService;

    @GetMapping("/insights")
    public ResponseEntity<FinancialAdviceResponse> getInsights(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(advisorService.analyze(userId, year, month));
    }

    @org.springframework.web.bind.annotation.PostMapping("/rebalance/apply")
    public ResponseEntity<com.example.sharemoney.dto.response.RebalanceApplyResponse> applyRebalance(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @org.springframework.web.bind.annotation.RequestBody(required = false) com.example.sharemoney.dto.request.RebalanceApplyRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(advisorService.applyRebalance(userId, year, month, request));
    }
}


