package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.GoogleLoginRequest;
import com.example.sharemoney.dto.request.LoginRequest;
import com.example.sharemoney.dto.request.RefreshTokenRequest;
import com.example.sharemoney.dto.request.RegisterRequest;
import com.example.sharemoney.dto.response.AuthResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.RefreshToken;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.CustomUserDetails;
import com.example.sharemoney.security.JwtUtil;
import com.example.sharemoney.service.RefreshTokenService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.validation.Valid;
import java.util.Collections;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${google.oauth2.client-id:NOT_SET}")
    private String googleClientId;

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

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request) {
        GoogleIdToken.Payload payload = verifyGoogleIdToken(request.getIdToken());

        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String picture = (String) payload.get("picture");

        // Tìm user hoặc tạo mới nếu chưa có
        User user =
                userRepository
                        .findByEmail(email)
                        .orElseGet(
                                () -> {
                                    log.info(
                                            "[Google OAuth] Tạo tài khoản mới cho: {} ({})",
                                            name,
                                            email);
                                    User newUser =
                                            User.builder()
                                                    .email(email)
                                                    .name(
                                                            name != null && !name.isBlank()
                                                                    ? name
                                                                    : email.split("@")[0])
                                                    .passwordHash(
                                                            passwordEncoder.encode(
                                                                    UUID.randomUUID().toString()))
                                                    .avatarUrl(picture)
                                                    .build();
                                    return userRepository.save(newUser);
                                });

        // Cập nhật avatar từ Google nếu user chưa có avatar
        if ((user.getAvatarUrl() == null || user.getAvatarUrl().contains("dicebear"))
                && picture != null
                && !picture.isBlank()) {
            user.setAvatarUrl(picture);
            userRepository.save(user);
        }

        String accessToken = jwtUtil.generateToken(new CustomUserDetails(user));
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        log.info("[Google OAuth] Đăng nhập thành công: {} ({})", user.getName(), email);

        return ResponseEntity.ok(
                AuthResponse.builder()
                        .token(accessToken)
                        .accessToken(accessToken)
                        .refreshToken(refreshToken.getToken())
                        .tokenType("Bearer")
                        .user(toUserSummary(user))
                        .build());
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

    // ──── Private Helpers ────

    private GoogleIdToken.Payload verifyGoogleIdToken(String idTokenString) {
        try {
            GoogleIdTokenVerifier verifier =
                    new GoogleIdTokenVerifier.Builder(
                                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                            .setAudience(Collections.singletonList(googleClientId))
                            .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new AppException(ErrorCode.GOOGLE_AUTH_FAILED);
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new AppException(ErrorCode.GOOGLE_AUTH_FAILED);
            }

            return payload;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Google OAuth] Token verification failed", e);
            throw new AppException(ErrorCode.GOOGLE_AUTH_FAILED);
        }
    }

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
