package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.FinancialHealthDTO;
import com.example.sharemoney.service.FinancialHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/financial-health")
@RequiredArgsConstructor
public class FinancialHealthController {

    private final FinancialHealthService financialHealthService;

    @GetMapping("/{userId}")
    public ResponseEntity<FinancialHealthDTO> getFinancialHealth(@PathVariable UUID userId) {
        return ResponseEntity.ok(financialHealthService.calculateHealthScore(userId));
    }
}
