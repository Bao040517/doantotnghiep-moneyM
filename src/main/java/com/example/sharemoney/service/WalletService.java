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
    public List<WalletResponse> getAllWallets(UUID userId) {
        List<Wallet> wallets = walletRepository.findByUser_IdAndIsLiability(userId, false);
        if (wallets.isEmpty()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            Wallet newWallet = Wallet.builder()
                    .user(user)
                    .name("Tiền mặt")
                    .balance(BigDecimal.ZERO)
                    .currency("VND")
                    .build();

            walletRepository.save(newWallet);
            wallets = List.of(newWallet);
        }
        return wallets.stream().map(this::toResponse).toList();
    }

    @Transactional
    public WalletResponse createWallet(UUID userId, com.example.sharemoney.dto.request.CreateWalletRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Wallet newWallet = Wallet.builder()
                .user(user)
                .name(req.getName())
                .balance(req.getBalance())
                .currency(req.getCurrency() != null ? req.getCurrency() : "VND")
                .bankBin(req.getBankBin())
                .bankAccountNo(req.getBankAccountNo())
                .bankAccountName(req.getBankAccountName())
                .build();

        walletRepository.save(newWallet);
        return toResponse(newWallet);
    }

    @Transactional
    public WalletResponse updateWallet(UUID userId, UUID walletId, com.example.sharemoney.dto.request.UpdateWalletRequest req) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));

        if (!wallet.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        wallet.setName(req.getName());
        wallet.setBankBin(req.getBankBin());
        wallet.setBankAccountNo(req.getBankAccountNo());
        wallet.setBankAccountName(req.getBankAccountName());

        walletRepository.save(wallet);
        return toResponse(wallet);
    }

    @Transactional
    public void deleteWallet(UUID userId, UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));

        if (!wallet.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        
        // Cố tình cho phép xóa, nếu có cascade thì các transaction cũng bị xóa hoặc lỗi
        // Tốt nhất là dùng trạng thái isDeleted, nhưng tạm thời support hard delete
        walletRepository.delete(wallet);
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
                .bankBin(wallet.getBankBin())
                .bankAccountNo(wallet.getBankAccountNo())
                .bankAccountName(wallet.getBankAccountName())
                .build();
    }
}
