package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.SetBudgetRequest;
import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.BudgetService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {
    private final BudgetService budgetService;

    /** POST /api/budgets — Tạo hoặc cập nhật ngân sách */
    @PostMapping
    public ResponseEntity<BudgetSummaryResponse> setBudget(
            @Valid @RequestBody SetBudgetRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.OK).body(budgetService.setBudget(userId, req));
    }

    /** GET /api/budgets/summary?year=&month= — Tổng quan ngân sách tháng */
    @GetMapping("/summary")
    public ResponseEntity<List<BudgetSummaryResponse>> getSummary(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(budgetService.getBudgetSummary(userId, y, m));
    }

    /** GET /api/budgets/safe-to-spend?year=&month= */
    @GetMapping("/safe-to-spend")
    public ResponseEntity<com.example.sharemoney.dto.response.SafeToSpendResponse> getSafeToSpend(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(budgetService.getSafeToSpend(userId, y, m));
    }

    /** DELETE /api/budgets/{id} — Xóa ngân sách */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        budgetService.deleteBudget(userId, id);
        return ResponseEntity.noContent().build();
    }

    /** PATCH /api/budgets/{id}/mandatory -> Toggle isMandatory */
    @PatchMapping("/{id}/mandatory")
    public ResponseEntity<Void> toggleMandatory(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        budgetService.toggleMandatory(userId, id);
        return ResponseEntity.ok().build();
    }
}
