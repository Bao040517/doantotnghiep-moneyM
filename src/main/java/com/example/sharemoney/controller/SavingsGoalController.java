package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.FundSavingsGoalRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.request.WithdrawSavingsGoalRequest;
import com.example.sharemoney.dto.response.SavingsGoalResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.SavingsGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/savings-goals")
@RequiredArgsConstructor
public class SavingsGoalController {

    private final SavingsGoalService savingsGoalService;

    @GetMapping
    public ResponseEntity<List<SavingsGoalResponse>> getUserSavingsGoals() {
        return ResponseEntity.ok(savingsGoalService.getUserSavingsGoals(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<SavingsGoalResponse> createSavingsGoal(
            @Valid @RequestBody SavingsGoalRequest request) {
        return ResponseEntity.ok(savingsGoalService.createSavingsGoal(SecurityUtils.getCurrentUserId(), request));
    }

    @PutMapping("/{goalId}")
    public ResponseEntity<SavingsGoalResponse> updateSavingsGoal(
            @PathVariable UUID goalId,
            @Valid @RequestBody SavingsGoalRequest request) {
        return ResponseEntity.ok(savingsGoalService.updateSavingsGoal(SecurityUtils.getCurrentUserId(), goalId, request));
    }

    @PostMapping("/{goalId}/fund")
    public ResponseEntity<SavingsGoalResponse> fundSavingsGoal(
            @PathVariable UUID goalId,
            @Valid @RequestBody FundSavingsGoalRequest request) {
        return ResponseEntity.ok(savingsGoalService.fundSavingsGoal(SecurityUtils.getCurrentUserId(), goalId, request));
    }

    @PostMapping("/{goalId}/withdraw")
    public ResponseEntity<SavingsGoalResponse> withdrawSavingsGoal(
            @PathVariable UUID goalId,
            @Valid @RequestBody WithdrawSavingsGoalRequest request) {
        return ResponseEntity.ok(savingsGoalService.withdrawSavingsGoal(SecurityUtils.getCurrentUserId(), goalId, request));
    }

    @DeleteMapping("/{goalId}")
    public ResponseEntity<Void> deleteSavingsGoal(
            @PathVariable UUID goalId) {
        savingsGoalService.deleteSavingsGoal(SecurityUtils.getCurrentUserId(), goalId);
        return ResponseEntity.ok().build();
    }
}
