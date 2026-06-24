package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.RemindDebtRequest;
import com.example.sharemoney.dto.response.DebtSummaryResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.DebtService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups/{groupId}/debts")
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    /**
     * GET /api/groups/{groupId}/debts
     *
     * <p>Trả về: - memberBalances: số dư ròng từng thành viên - transactions: danh sách giao dịch
     * tối giản (Greedy output)
     */
    @GetMapping
    public ResponseEntity<DebtSummaryResponse> getGroupDebts(@PathVariable UUID groupId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(debtService.calculateGroupDebts(groupId, userId));
    }

    /**
     * POST /api/groups/{groupId}/debts/remind Gửi yêu cầu nhắc nợ tới 1 thành viên cụ thể (Tích hợp
     * WebSocket và Email)
     */
    @PostMapping("/remind")
    public ResponseEntity<Void> remindDebt(
            @PathVariable UUID groupId, @Valid @RequestBody RemindDebtRequest request) {
        UUID creditorId = SecurityUtils.getCurrentUserId();
        debtService.remindDebt(groupId, request, creditorId);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/groups/{groupId}/debts/notify-payment
     * Con nợ báo cáo đã chuyển tiền
     */
    @PostMapping("/notify-payment")
    public ResponseEntity<Void> notifyPayment(
            @PathVariable UUID groupId, @Valid @RequestBody com.example.sharemoney.dto.request.SettleDebtRequest request) {
        UUID debtorId = SecurityUtils.getCurrentUserId();
        debtService.notifyPayment(groupId, debtorId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/groups/{groupId}/debts/approve-settle
     * Chủ nợ xác nhận đã nhận tiền (triệt tiêu nợ)
     */
    @PostMapping("/approve-settle")
    public ResponseEntity<Void> approveSettle(
            @PathVariable UUID groupId, @Valid @RequestBody com.example.sharemoney.dto.request.ApproveSettleRequest request) {
        UUID creditorId = SecurityUtils.getCurrentUserId();
        debtService.approveSettle(groupId, creditorId, request);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/groups/{groupId}/debts/pending
     * Lấy danh sách ID của những người nợ đã bấm "Báo đã chuyển tiền"
     */
    @GetMapping("/pending")
    public ResponseEntity<List<String>> getPendingDebtors(@PathVariable UUID groupId) {
        UUID creditorId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(debtService.getPendingDebtors(groupId, creditorId));
    }

    /**
     * GET /api/groups/{groupId}/debts/pending-sent
     * Lấy danh sách ID của những chủ nợ mà người dùng (với tư cách là con nợ) đã bấm "Báo đã chuyển tiền"
     */
    @GetMapping("/pending-sent")
    public ResponseEntity<List<String>> getPendingSent(@PathVariable UUID groupId) {
        UUID debtorId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(debtService.getPendingSent(groupId, debtorId));
    }
}
