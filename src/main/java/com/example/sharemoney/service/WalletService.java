package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.TotalBalanceResponse;
import com.example.sharemoney.dto.response.WalletResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    @Transactional
    public WalletResponse getOrCreateDefaultWallet(UUID userId) {
        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (!wallets.isEmpty()) {
            return toResponse(wallets.get(0));
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Wallet newWallet = Wallet.builder()
                .user(user)
                .name("Ví mặc định")
                .balance(BigDecimal.ZERO)
                .currency("VND")
                .build();

        walletRepository.save(newWallet);
        return toResponse(newWallet);
    }

    @Transactional(readOnly = true)
    public TotalBalanceResponse getTotalBalance(UUID userId) {
        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        BigDecimal total = wallets.stream()
                .map(Wallet::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new TotalBalanceResponse(total);
    }

    private WalletResponse toResponse(Wallet wallet) {
        return WalletResponse.builder()
                .id(wallet.getId())
                .name(wallet.getName())
                .balance(wallet.getBalance())
                .currency(wallet.getCurrency())
                .build();
    }
}
