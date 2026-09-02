package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.ForgotPasswordRequest;
import com.example.sharemoney.dto.request.LoginRequest;
import com.example.sharemoney.dto.request.RefreshTokenRequest;
import com.example.sharemoney.dto.request.RegisterRequest;
import com.example.sharemoney.dto.request.ResetPasswordRequest;
import com.example.sharemoney.dto.response.AuthResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.RefreshToken;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.CustomUserDetails;
import com.example.sharemoney.security.JwtUtil;
import com.example.sharemoney.service.EmailService;
import com.example.sharemoney.service.OtpService;
import com.example.sharemoney.service.RefreshTokenService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user =
                User.builder()
                        .name(request.getName())
                        .email(request.getEmail())
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .build();

        User savedUser = userRepository.save(user);

        String accessToken = jwtUtil.generateToken(new CustomUserDetails(savedUser));
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(savedUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        AuthResponse.builder()
                                .token(accessToken)
                                .accessToken(accessToken)
                                .refreshToken(refreshToken.getToken())
                                .tokenType("Bearer")
                                .user(toUserSummary(savedUser))
                                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication =
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                    request.getEmail(), request.getPassword()));

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            User user = userDetails.getUser();
            String accessToken = jwtUtil.generateToken(userDetails);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

            return ResponseEntity.ok(
                    AuthResponse.builder()
                            .token(accessToken)
                            .accessToken(accessToken)
                            .refreshToken(refreshToken.getToken())
                            .tokenType("Bearer")
                            .user(toUserSummary(user))
                            .build());
        } catch (AuthenticationException e) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService
                .findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(
                        user -> {
                            String newAccessToken =
                                    jwtUtil.generateToken(new CustomUserDetails(user));
                            // Cơ chế Token Rotation: Thu hồi token cũ và sinh refresh token mới
                            refreshTokenService.revokeToken(requestRefreshToken);
                            RefreshToken newRefreshToken =
                                    refreshTokenService.createRefreshToken(user);

                            return ResponseEntity.ok(
                                    AuthResponse.builder()
                                            .token(newAccessToken)
                                            .accessToken(newAccessToken)
                                            .refreshToken(newRefreshToken.getToken())
                                            .tokenType("Bearer")
                                            .user(toUserSummary(user))
                                            .build());
                        })
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshTokenRequest request) {
        if (request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {
            refreshTokenService.revokeToken(request.getRefreshToken());
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        userRepository
                .findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String otpCode = otpService.generateOtp(email);
        emailService.sendOtpEmail(email, otpCode);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Mã xác thực OTP đã được gửi tới email " + email,
                        "expiresInSeconds", 300));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 1. Xác thực OTP
        otpService.validateOtp(email, request.getOtp());

        // 2. Cập nhật mật khẩu mới mã hóa BCrypt
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("[Auth] Đặt lại mật khẩu thành công cho user: {}", email);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới."));
    }

    // ──── Private Helpers ────

    private UserSummaryResponse toUserSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .bankQrUrl(user.getBankQrUrl())
                .bankBin(user.getBankBin())
                .bankAccountNo(user.getBankAccountNo())
                .bankAccountName(user.getBankAccountName())
                .savingsBankBin(user.getSavingsBankBin())
                .savingsBankAccountNo(user.getSavingsBankAccountNo())
                .savingsBankAccountName(user.getSavingsBankAccountName())
                .build();
    }
}
