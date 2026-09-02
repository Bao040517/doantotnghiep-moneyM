package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.entity.RefreshToken;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.RefreshTokenRepository;
import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks private RefreshTokenService refreshTokenService;

    private User user;

    @BeforeEach
    void setUp() throws Exception {
        user =
                User.builder()
                        .id(UUID.randomUUID())
                        .name("Nguyen Van A")
                        .email("vana@example.com")
                        .build();

        Field durationField = RefreshTokenService.class.getDeclaredField("refreshTokenDurationMs");
        durationField.setAccessible(true);
        durationField.set(refreshTokenService, 604800000L); // 7 days
    }

    @Test
    @DisplayName("Tạo Refresh Token mới thành công")
    void testCreateRefreshToken_Success() {
        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        RefreshToken token = refreshTokenService.createRefreshToken(user);

        assertNotNull(token);
        assertNotNull(token.getToken());
        assertFalse(token.isRevoked());
        assertTrue(token.getExpiryDate().isAfter(Instant.now()));
        assertEquals(user, token.getUser());
    }

    @Test
    @DisplayName("Kiểm tra hạn Refresh Token: Token hợp lệ -> Trả về token")
    void testVerifyExpiration_ValidToken_ReturnsToken() {
        RefreshToken token =
                RefreshToken.builder()
                        .token("valid_token")
                        .user(user)
                        .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                        .revoked(false)
                        .build();

        RefreshToken result = refreshTokenService.verifyExpiration(token);

        assertNotNull(result);
        assertEquals("valid_token", result.getToken());
    }

    @Test
    @DisplayName("Kiểm tra hạn Refresh Token: Token đã bị thu hồi -> INVALID_REFRESH_TOKEN")
    void testVerifyExpiration_RevokedToken_ThrowsException() {
        RefreshToken token =
                RefreshToken.builder()
                        .token("revoked_token")
                        .user(user)
                        .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                        .revoked(true)
                        .build();

        AppException ex =
                assertThrows(AppException.class, () -> refreshTokenService.verifyExpiration(token));
        assertEquals(ErrorCode.INVALID_REFRESH_TOKEN, ex.getErrorCode());
    }

    @Test
    @DisplayName("Kiểm tra hạn Refresh Token: Token đã quá hạn -> REFRESH_TOKEN_EXPIRED")
    void testVerifyExpiration_ExpiredToken_ThrowsException() {
        RefreshToken token =
                RefreshToken.builder()
                        .token("expired_token")
                        .user(user)
                        .expiryDate(Instant.now().minus(1, ChronoUnit.DAYS))
                        .revoked(false)
                        .build();

        AppException ex =
                assertThrows(AppException.class, () -> refreshTokenService.verifyExpiration(token));
        assertEquals(ErrorCode.REFRESH_TOKEN_EXPIRED, ex.getErrorCode());
        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    @DisplayName("Thu hồi 1 token cụ thể")
    void testRevokeToken_Success() {
        RefreshToken token =
                RefreshToken.builder().token("active_token").user(user).revoked(false).build();

        when(refreshTokenRepository.findByToken("active_token")).thenReturn(Optional.of(token));

        refreshTokenService.revokeToken("active_token");

        assertTrue(token.isRevoked());
        verify(refreshTokenRepository).save(token);
    }

    @Test
    @DisplayName("Thu hồi tất cả token của User khi Logout")
    void testRevokeAllUserTokens_Success() {
        refreshTokenService.revokeAllUserTokens(user);
        verify(refreshTokenRepository).deleteByUser(user);
    }
}
