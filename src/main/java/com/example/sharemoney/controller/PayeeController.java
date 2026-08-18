package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.SavePayeeRequest;
import com.example.sharemoney.dto.response.PayeeResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.PayeeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payees")
@RequiredArgsConstructor
public class PayeeController {

    private final PayeeService payeeService;

    /**
     * GET /api/payees
     * Lấy toàn bộ danh bạ người nhận đã lưu của user hiện tại.
     */
    @GetMapping
    public ResponseEntity<List<PayeeResponse>> getPayees() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(payeeService.getPayees(userId));
    }

    /**
     * GET /api/payees/suggestions
     * Danh sách gợi ý thông minh: Saved Payees + Bạn bè trong nhóm có STK.
     * Được dedup theo số tài khoản.
     */
    @GetMapping("/suggestions")
    public ResponseEntity<List<PayeeResponse>> getSuggestions() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(payeeService.getSuggestions(userId));
    }

    /**
     * POST /api/payees
     * Lưu người nhận mới hoặc cập nhật (upsert theo bankAccount).
     * Trả về thông tin đã lưu.
     */
    @PostMapping
    public ResponseEntity<PayeeResponse> savePayee(@Valid @RequestBody SavePayeeRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(payeeService.saveOrUpdate(userId, req));
    }

    /**
     * DELETE /api/payees/{id}
     * Xóa người nhận khỏi danh bạ (kiểm tra quyền sở hữu).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayee(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        payeeService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
