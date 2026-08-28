package com.example.sharemoney.service;

import com.example.sharemoney.entity.RefreshToken;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh-token.expiration:604800000}")
    private Long refreshTokenDurationMs;

    private final RefreshTokenRepository refreshTokenRepository;

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByTokenAndRevokedFalse(token);
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        // Sinh token ngẫu nhiên độ an toàn cao
        String tokenString =
                UUID.randomUUID().toString().replace("-", "")
                        + UUID.randomUUID().toString().replace("-", "");

        RefreshToken refreshToken =
                RefreshToken.builder()
                        .user(user)
                        .token(tokenString)
                        .expiryDate(Instant.now().plusMillis(refreshTokenDurationMs))
                        .revoked(false)
                        .build();

        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.isRevoked()) {
            log.warn(
                    "[RefreshToken] Token is already revoked for user: {}",
                    token.getUser().getEmail());
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        if (token.getExpiryDate().isBefore(Instant.now())) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            log.warn("[RefreshToken] Token expired for user: {}", token.getUser().getEmail());
            throw new AppException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        return token;
    }

    @Transactional
    public void revokeToken(String tokenString) {
        refreshTokenRepository
                .findByToken(tokenString)
                .ifPresent(
                        token -> {
                            token.setRevoked(true);
                            refreshTokenRepository.save(token);
                            log.info(
                                    "[RefreshToken] Revoked token for user: {}",
                                    token.getUser().getEmail());
                        });
    }

    @Transactional
    public void revokeAllUserTokens(User user) {
        refreshTokenRepository.deleteByUser(user);
        log.info("[RefreshToken] Revoked all refresh tokens for user: {}", user.getEmail());
    }
}
