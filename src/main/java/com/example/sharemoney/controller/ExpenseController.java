package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.CreateExpenseRequest;
import com.example.sharemoney.dto.request.UpdateExpenseRequest;
import com.example.sharemoney.dto.response.ExpenseDetailResponse;
import com.example.sharemoney.dto.response.ExpenseResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.ExpenseService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/groups/{groupId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    /** POST /api/groups/{groupId}/expenses Tạo khoản chi mới + tự động chia tiền. */
    @PostMapping
    public ResponseEntity<ExpenseDetailResponse> createExpense(
            @PathVariable UUID groupId, @Valid @RequestBody CreateExpenseRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(expenseService.createExpense(groupId, req, userId));
    }

    /**
     * GET /api/groups/{groupId}/expenses Danh sách khoản chi của nhóm (chỉ thành viên) - Phân
     * trang.
     */
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<ExpenseResponse>> getGroupExpenses(
            @PathVariable UUID groupId,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "20") int size) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getGroupExpenses(groupId, userId, page, size));
    }

    /** GET /api/groups/{groupId}/expenses/export Xuất dữ liệu khoản chi ra CSV. */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportGroupExpenses(@PathVariable UUID groupId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        byte[] csvData = expenseService.exportGroupExpensesToCsv(groupId, userId);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set(
                org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=expenses.csv");
        headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8");

        return ResponseEntity.ok().headers(headers).body(csvData);
    }

    /** GET /api/groups/{groupId}/expenses/{expenseId} Chi tiết 1 khoản chi kèm danh sách splits. */
    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseDetailResponse> getExpenseDetail(
            @PathVariable UUID groupId, @PathVariable UUID expenseId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(expenseService.getExpenseDetail(groupId, expenseId, userId));
    }

    /** PUT /api/groups/{groupId}/expenses/{expenseId} Sửa khoản chi: xoá splits cũ → tạo lại. */
    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseDetailResponse> updateExpense(
            @PathVariable UUID groupId,
            @PathVariable UUID expenseId,
            @Valid @RequestBody UpdateExpenseRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(expenseService.updateExpense(groupId, expenseId, req, userId));
    }

    /** DELETE /api/groups/{groupId}/expenses/{expenseId} Xoá khoản chi (cascade xoá splits). */
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable UUID groupId, @PathVariable UUID expenseId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        expenseService.deleteExpense(groupId, expenseId, userId);
        return ResponseEntity.noContent().build();
    }
}
