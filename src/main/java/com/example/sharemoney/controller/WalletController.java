package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.TotalBalanceResponse;
import com.example.sharemoney.dto.response.WalletResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    /** GET /api/wallets/me - Lấy hoặc tự động tạo ví mặc định cho user */
    @GetMapping("/me")
    public ResponseEntity<WalletResponse> getMyWallet() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.getOrCreateDefaultWallet(userId));
    }

    /** GET /api/wallets/total-balance - Lấy tổng số dư của tất cả các ví */
    @GetMapping("/total-balance")
    public ResponseEntity<TotalBalanceResponse> getTotalBalance() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(walletService.getTotalBalance(userId));
    }
}
