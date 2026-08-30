package com.example.sharemoney.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.LoginRequest;
import com.example.sharemoney.dto.request.RefreshTokenRequest;
import com.example.sharemoney.dto.request.RegisterRequest;
import com.example.sharemoney.dto.response.AuthResponse;
import com.example.sharemoney.entity.RefreshToken;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.CustomUserDetails;
import com.example.sharemoney.security.JwtUtil;
import com.example.sharemoney.service.RefreshTokenService;
import jakarta.validation.ValidatorFactory;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtil jwtUtil;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks private AuthController authController;

    private User user;
    private RefreshToken refreshToken;

    @BeforeEach
    void setUp() {
        user =
                User.builder()
                        .id(UUID.randomUUID())
                        .name("Nguyen Van A")
                        .email("vana@example.com")
                        .passwordHash("encoded_pwd")
                        .build();

        refreshToken =
                RefreshToken.builder()
                        .id(UUID.randomUUID())
                        .token("refresh_token_123")
                        .user(user)
                        .expiryDate(Instant.now().plus(7, ChronoUnit.DAYS))
                        .revoked(false)
                        .build();
    }

    @Test
    @DisplayName(
            "API Register: Đăng ký thành công -> Trả về 201 Created kèm AccessToken và RefreshToken")
    void testRegister_Success() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("vana@gmail.com");
        req.setPassword("Password@123");

        when(userRepository.existsByEmail("vana@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("Password@123")).thenReturn("encoded_pwd");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(jwtUtil.generateToken(any(CustomUserDetails.class))).thenReturn("access_token_123");
        when(refreshTokenService.createRefreshToken(any(User.class))).thenReturn(refreshToken);

        ResponseEntity<AuthResponse> response = authController.register(req);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("access_token_123", response.getBody().getAccessToken());
        assertEquals("refresh_token_123", response.getBody().getRefreshToken());
        assertEquals("Nguyen Van A", response.getBody().getUser().getName());
    }

    @Test
    @DisplayName("API Register: Email đã tồn tại -> Ném EMAIL_ALREADY_EXISTS")
    void testRegister_EmailAlreadyExists_ThrowsException() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("vana@gmail.com");
        req.setPassword("Password@123");

        when(userRepository.existsByEmail("vana@gmail.com")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> authController.register(req));
        assertEquals(ErrorCode.EMAIL_ALREADY_EXISTS, ex.getErrorCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("API Login: Đăng nhập thành công -> Trả về 200 OK kèm tokens")
    void testLogin_Success() {
        LoginRequest req = new LoginRequest();
        req.setEmail("vana@example.com");
        req.setPassword("Password@123");

        CustomUserDetails userDetails = new CustomUserDetails(user);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(userDetails);

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(auth);
        when(jwtUtil.generateToken(userDetails)).thenReturn("new_access_token");
        when(refreshTokenService.createRefreshToken(user)).thenReturn(refreshToken);

        ResponseEntity<AuthResponse> response = authController.login(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("new_access_token", response.getBody().getAccessToken());
        assertEquals("refresh_token_123", response.getBody().getRefreshToken());
    }

    @Test
    @DisplayName("API Login: Sai thông tin đăng nhập -> Ném INVALID_CREDENTIALS")
    void testLogin_InvalidCredentials_ThrowsException() {
        LoginRequest req = new LoginRequest();
        req.setEmail("vana@example.com");
        req.setPassword("WrongPassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        AppException ex = assertThrows(AppException.class, () -> authController.login(req));
        assertEquals(ErrorCode.INVALID_CREDENTIALS, ex.getErrorCode());
    }

    @Test
    @DisplayName("API Refresh Token: Làm mới token thành công và áp dụng Token Rotation")
    void testRefreshToken_Success() {
        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("old_refresh_token");

        RefreshToken newRefreshToken =
                RefreshToken.builder().token("new_refresh_token_456").user(user).build();

        when(refreshTokenService.findByToken("old_refresh_token"))
                .thenReturn(Optional.of(refreshToken));
        when(refreshTokenService.verifyExpiration(refreshToken)).thenReturn(refreshToken);
        when(jwtUtil.generateToken(any(CustomUserDetails.class)))
                .thenReturn("refreshed_access_token");
        when(refreshTokenService.createRefreshToken(user)).thenReturn(newRefreshToken);

        ResponseEntity<AuthResponse> response = authController.refreshToken(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("refreshed_access_token", response.getBody().getAccessToken());
        assertEquals("new_refresh_token_456", response.getBody().getRefreshToken());
        verify(refreshTokenService).revokeToken("old_refresh_token");
    }

    @Test
    @DisplayName("API Refresh Token: Token không hợp lệ -> Ném INVALID_REFRESH_TOKEN")
    void testRefreshToken_InvalidToken_ThrowsException() {
        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("fake_token");

        when(refreshTokenService.findByToken("fake_token")).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> authController.refreshToken(req));
        assertEquals(ErrorCode.INVALID_REFRESH_TOKEN, ex.getErrorCode());
    }

    @Test
    @DisplayName("API Logout: Thu hồi refresh token")
    void testLogout_WithToken_RevokesToken() {
        RefreshTokenRequest req = new RefreshTokenRequest();
        req.setRefreshToken("token_to_revoke");

        ResponseEntity<Void> response = authController.logout(req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(refreshTokenService).revokeToken("token_to_revoke");
    }

    @Test
    @DisplayName(
            "Validation RegisterRequest: Gmail hợp lệ + Mật khẩu có cả chữ và số -> Hợp lệ 100%")
    void testRegisterRequestValidation_Valid() {
        ValidatorFactory factory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        jakarta.validation.Validator validator = factory.getValidator();

        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("user.test123_abc@gmail.com");
        req.setPassword("Password123");

        java.util.Set<jakarta.validation.ConstraintViolation<RegisterRequest>> violations =
                validator.validate(req);
        assertTrue(
                violations.isEmpty(),
                "Dữ liệu chuẩn Gmail và mật khẩu chữ+số không được có lỗi validation");
    }

    @Test
    @DisplayName(
            "Validation RegisterRequest: Email không phải @gmail.com -> Báo lỗi định dạng Gmail")
    void testRegisterRequestValidation_InvalidEmailNotGmail() {
        ValidatorFactory factory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        jakarta.validation.Validator validator = factory.getValidator();

        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("user@yahoo.com");
        req.setPassword("Password123");

        java.util.Set<jakarta.validation.ConstraintViolation<RegisterRequest>> violations =
                validator.validate(req);
        assertFalse(violations.isEmpty());
        assertTrue(
                violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
    }

    @Test
    @DisplayName("Validation RegisterRequest: Mật khẩu chỉ có chữ cái -> Báo lỗi thiếu chữ số")
    void testRegisterRequestValidation_PasswordOnlyLetters() {
        ValidatorFactory factory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        jakarta.validation.Validator validator = factory.getValidator();

        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("user@gmail.com");
        req.setPassword("PasswordOnly");

        java.util.Set<jakarta.validation.ConstraintViolation<RegisterRequest>> violations =
                validator.validate(req);
        assertFalse(violations.isEmpty());
        assertTrue(
                violations.stream()
                        .anyMatch(v -> v.getPropertyPath().toString().equals("password")));
    }

    @Test
    @DisplayName("Validation RegisterRequest: Mật khẩu chỉ có chữ số -> Báo lỗi thiếu chữ cái")
    void testRegisterRequestValidation_PasswordOnlyNumbers() {
        ValidatorFactory factory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        jakarta.validation.Validator validator = factory.getValidator();

        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("user@gmail.com");
        req.setPassword("12345678");

        java.util.Set<jakarta.validation.ConstraintViolation<RegisterRequest>> violations =
                validator.validate(req);
        assertFalse(violations.isEmpty());
        assertTrue(
                violations.stream()
                        .anyMatch(v -> v.getPropertyPath().toString().equals("password")));
    }

    @Test
    @DisplayName("Validation RegisterRequest: Mật khẩu dưới 6 ký tự -> Báo lỗi độ dài")
    void testRegisterRequestValidation_PasswordTooShort() {
        ValidatorFactory factory = jakarta.validation.Validation.buildDefaultValidatorFactory();
        jakarta.validation.Validator validator = factory.getValidator();

        RegisterRequest req = new RegisterRequest();
        req.setName("Nguyen Van A");
        req.setEmail("user@gmail.com");
        req.setPassword("Ab1");

        java.util.Set<jakarta.validation.ConstraintViolation<RegisterRequest>> violations =
                validator.validate(req);
        assertFalse(violations.isEmpty());
        assertTrue(
                violations.stream()
                        .anyMatch(v -> v.getPropertyPath().toString().equals("password")));
    }
}
