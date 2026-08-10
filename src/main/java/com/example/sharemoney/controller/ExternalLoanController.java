package com.example.sharemoney.controller;

import com.example.sharemoney.dto.ExternalLoanDTO;
import com.example.sharemoney.dto.request.CreateExternalLoanRequest;
import com.example.sharemoney.dto.request.UpdateExternalLoanRequest;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.ExternalLoanService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/external-loans")
@RequiredArgsConstructor
public class ExternalLoanController {

    private final ExternalLoanService externalLoanService;

    @GetMapping
    public ResponseEntity<List<ExternalLoanDTO>> getUserLoans() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(externalLoanService.getUserLoans(userId));
    }

    @PostMapping
    public ResponseEntity<ExternalLoanDTO> createLoan(
            @Valid @RequestBody CreateExternalLoanRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(externalLoanService.createLoan(userId, request));
    }

    @PutMapping("/{loanId}")
    public ResponseEntity<ExternalLoanDTO> updateLoan(
            @PathVariable UUID loanId,
            @RequestBody UpdateExternalLoanRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(externalLoanService.updateLoan(loanId, userId, request));
    }

    @DeleteMapping("/{loanId}")
    public ResponseEntity<Void> deleteLoan(@PathVariable UUID loanId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        externalLoanService.deleteLoan(loanId, userId);
        return ResponseEntity.noContent().build();
    }
}
