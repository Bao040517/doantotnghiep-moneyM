package com.example.sharemoney.controller;

import com.example.sharemoney.dto.ExternalLoanDTO;
import com.example.sharemoney.dto.request.CreateExternalLoanRequest;
import com.example.sharemoney.dto.request.UpdateExternalLoanRequest;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.service.ExternalLoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/external-loans")
@RequiredArgsConstructor
public class ExternalLoanController {

    private final ExternalLoanService externalLoanService;

    @GetMapping
    public ResponseEntity<List<ExternalLoanDTO>> getUserLoans(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(externalLoanService.getUserLoans(user.getId()));
    }

    @PostMapping
    public ResponseEntity<ExternalLoanDTO> createLoan(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateExternalLoanRequest request) {
        return ResponseEntity.ok(externalLoanService.createLoan(user.getId(), request));
    }

    @PutMapping("/{loanId}")
    public ResponseEntity<ExternalLoanDTO> updateLoan(
            @AuthenticationPrincipal User user,
            @PathVariable UUID loanId,
            @RequestBody UpdateExternalLoanRequest request) {
        return ResponseEntity.ok(externalLoanService.updateLoan(loanId, user.getId(), request));
    }

    @DeleteMapping("/{loanId}")
    public ResponseEntity<Void> deleteLoan(
            @AuthenticationPrincipal User user,
            @PathVariable UUID loanId) {
        externalLoanService.deleteLoan(loanId, user.getId());
        return ResponseEntity.noContent().build();
    }
}
