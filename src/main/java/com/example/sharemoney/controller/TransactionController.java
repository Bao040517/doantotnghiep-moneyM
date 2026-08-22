package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.dto.request.UpdateTransactionRequest;
import com.example.sharemoney.dto.response.CashflowSummaryResponse;
import com.example.sharemoney.dto.response.CategoryBreakdownResponse;
import com.example.sharemoney.dto.response.MonthlySummaryResponse;
import com.example.sharemoney.dto.response.TransactionResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.TransactionService;
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
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /** GET /api/transactions - Lấy toàn bộ giao dịch (Phân trang) */
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<TransactionResponse>>
            getMyTransactions(
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "20") int size) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(transactionService.getUserTransactions(userId, page, size));
    }

    /** GET /api/transactions/uncategorized/count - Đếm giao dịch chưa phân loại */
    @GetMapping("/uncategorized/count")
    public ResponseEntity<Long> getUncategorizedCount() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(transactionService.getUncategorizedCount(userId));
    }

    /** GET /api/transactions/uncategorized - Lấy giao dịch chưa phân loại */
    @GetMapping("/uncategorized")
    public ResponseEntity<List<TransactionResponse>> getUncategorizedTransactions() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(transactionService.getUncategorizedTransactions(userId));
    }

    /** GET /api/transactions/monthly?year=2026&month=6 - Lấy giao dịch theo tháng */
    @GetMapping("/monthly")
    public ResponseEntity<List<TransactionResponse>> getByMonth(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(transactionService.getTransactionsByMonth(userId, y, m));
    }

    /** POST /api/transactions/{walletId} - Tạo giao dịch mới */
    @PostMapping("/{walletId}")
    public ResponseEntity<TransactionResponse> createTransaction(
            @PathVariable UUID walletId, @Valid @RequestBody CreateTransactionRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.createTransaction(userId, walletId, req));
    }

    /** PUT /api/transactions/{id} - Sửa giao dịch */
    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> updateTransaction(
            @PathVariable UUID id, @Valid @RequestBody UpdateTransactionRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(transactionService.updateTransaction(userId, id, req));
    }

    /** DELETE /api/transactions/{id} - Xóa giao dịch */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        transactionService.deleteTransaction(userId, id);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/transactions/summary/monthly - Báo cáo tháng (6 tháng) */
    @GetMapping("/summary/monthly")
    public ResponseEntity<MonthlySummaryResponse> getMonthlySummary(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(transactionService.getMonthlySummary(userId, y, m));
    }

    /** GET /api/transactions/summary/category?year=&month= - Báo cáo danh mục */
    @GetMapping("/summary/category")
    public ResponseEntity<List<CategoryBreakdownResponse>> getCategoryBreakdown(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(transactionService.getCategoryBreakdown(userId, y, m));
    }

    /** GET /api/transactions/summary/income-category?year=&month= - Báo cáo danh mục thu nhập */
    @GetMapping("/summary/income-category")
    public ResponseEntity<List<CategoryBreakdownResponse>> getIncomeCategoryBreakdown(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(transactionService.getIncomeCategoryBreakdown(userId, y, m));
    }

    /** GET /api/transactions/summary/cashflow?year=&month= - Báo cáo biến động dòng tiền thực tế (Tuần / Tháng / Năm) */
    @GetMapping("/summary/cashflow")
    public ResponseEntity<CashflowSummaryResponse> getCashflowSummary(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        UUID userId = SecurityUtils.getCurrentUserId();
        int y = year == 0 ? LocalDate.now().getYear() : year;
        int m = month == 0 ? LocalDate.now().getMonthValue() : month;
        return ResponseEntity.ok(transactionService.getCashflowSummary(userId, y, m));
    }
}
