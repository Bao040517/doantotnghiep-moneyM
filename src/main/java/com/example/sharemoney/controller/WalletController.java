package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.TotalBalanceResponse;
import com.example.sharemoney.dto.response.WalletResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.WalletService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    /** GET /api/wallets - Lấy tất cả các ví (sẽ tự tạo ví Tiền mặt nếu chưa có) */
    @GetMapping
    public ResponseEntity<java.util.List<WalletResponse>> getAllWallets() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.getAllWallets(userId));
    }

    /** Để tương thích ngược, /me sẽ trả về danh sách ví hoặc ví đầu tiên */
    @GetMapping("/me")
    public ResponseEntity<java.util.List<WalletResponse>> getMyWallet() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.getAllWallets(userId));
    }

    @org.springframework.web.bind.annotation.PostMapping
    public ResponseEntity<WalletResponse> createWallet(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
                    com.example.sharemoney.dto.request.CreateWalletRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.createWallet(userId, req));
    }

    @org.springframework.web.bind.annotation.PutMapping("/{walletId}")
    public ResponseEntity<WalletResponse> updateWallet(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID walletId,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
                    com.example.sharemoney.dto.request.UpdateWalletRequest req) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.updateWallet(userId, walletId, req));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{walletId}")
    public ResponseEntity<Void> deleteWallet(
            @org.springframework.web.bind.annotation.PathVariable java.util.UUID walletId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        walletService.deleteWallet(userId, walletId);
        return ResponseEntity.noContent().build();
    }

    /** GET /api/wallets/total-balance - Lấy tổng số dư của tất cả các ví */
    @GetMapping("/total-balance")
    public ResponseEntity<TotalBalanceResponse> getTotalBalance() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.getTotalBalance(userId));
    }
}
