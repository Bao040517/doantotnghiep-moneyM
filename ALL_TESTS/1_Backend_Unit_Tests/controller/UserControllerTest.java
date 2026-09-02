package com.example.sharemoney.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.BankLookupResponse;
import com.example.sharemoney.dto.request.UpdateAvatarRequest;
import com.example.sharemoney.dto.request.UpdatePhoneRequest;
import com.example.sharemoney.dto.request.UpdateQrRequest;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.BankLookupService;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserRepository userRepository;
    @Mock private BankLookupService bankLookupService;

    @InjectMocks private UserController userController;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user =
                User.builder()
                        .id(userId)
                        .name("Nguyen Van A")
                        .email("vana@example.com")
                        .phone("0987654321")
                        .avatarUrl("https://example.com/avatar.png")
                        .build();
    }

    @Test
    @DisplayName("Lấy thông tin cá nhân hiện tại (GET /api/users/me)")
    void testGetMyProfile_Success() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ResponseEntity<UserSummaryResponse> response = userController.getMyProfile();

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("Nguyen Van A", response.getBody().getName());
            assertEquals("vana@example.com", response.getBody().getEmail());
        }
    }

    @Test
    @DisplayName("Tìm kiếm user theo số điện thoại (GET /api/users/search)")
    void testSearchByPhone_Success() {
        when(userRepository.findByPhone("0987654321")).thenReturn(Optional.of(user));

        ResponseEntity<UserSummaryResponse> response = userController.searchByPhone("0987654321");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("0987654321", response.getBody().getPhone());
    }

    @Test
    @DisplayName("Tìm kiếm user theo SĐT không tồn tại -> USER_NOT_FOUND")
    void testSearchByPhone_NotFound_ThrowsException() {
        when(userRepository.findByPhone("0000000000")).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(AppException.class, () -> userController.searchByPhone("0000000000"));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Cập nhật số điện thoại thành công (PUT /api/users/me/phone)")
    void testUpdateMyPhone_Success() {
        UpdatePhoneRequest req = new UpdatePhoneRequest();
        req.setPhone("0912345678");

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userRepository.findByPhone("0912345678")).thenReturn(Optional.empty());

            ResponseEntity<UserSummaryResponse> response = userController.updateMyPhone(req);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("0912345678", response.getBody().getPhone());
            verify(userRepository).save(user);
        }
    }

    @Test
    @DisplayName("Cập nhật số điện thoại bị trùng với người khác -> PHONE_ALREADY_EXISTS")
    void testUpdateMyPhone_PhoneAlreadyExists_ThrowsException() {
        UUID otherUserId = UUID.randomUUID();
        User otherUser = User.builder().id(otherUserId).phone("0912345678").build();
        UpdatePhoneRequest req = new UpdatePhoneRequest();
        req.setPhone("0912345678");

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userRepository.findByPhone("0912345678")).thenReturn(Optional.of(otherUser));

            AppException ex =
                    assertThrows(AppException.class, () -> userController.updateMyPhone(req));
            assertEquals(ErrorCode.PHONE_ALREADY_EXISTS, ex.getErrorCode());
            verify(userRepository, never()).save(user);
        }
    }

    @Test
    @DisplayName("Cập nhật ảnh đại diện (PUT /api/users/me/avatar)")
    void testUpdateMyAvatar_Success() {
        UpdateAvatarRequest req = new UpdateAvatarRequest();
        req.setAvatarUrl("https://example.com/new_avatar.png");

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ResponseEntity<UserSummaryResponse> response = userController.updateMyAvatar(req);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("https://example.com/new_avatar.png", response.getBody().getAvatarUrl());
            verify(userRepository).save(user);
        }
    }

    @Test
    @DisplayName("Cập nhật thông tin VietQR / Tài khoản ngân hàng (PUT /api/users/me/qr)")
    void testUpdateMyQr_Success() {
        UpdateQrRequest req = new UpdateQrRequest();
        req.setBankQrUrl("https://qr.vietqr.io/image.png");
        req.setBankBin("970436");
        req.setBankAccountNo("123456789");
        req.setBankAccountName("NGUYEN VAN A");

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(bankLookupService.lookupAccount("970436", "123456789"))
                    .thenReturn(
                            BankLookupResponse.builder()
                                    .bin("970436")
                                    .accountNumber("123456789")
                                    .accountName("NGUYEN VAN A")
                                    .verified(true)
                                    .build());

            ResponseEntity<UserSummaryResponse> response = userController.updateMyQr(req);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("970436", response.getBody().getBankBin());
            assertEquals("123456789", response.getBody().getBankAccountNo());
            verify(userRepository).save(user);
        }
    }

    @Test
    @DisplayName("Cập nhật Push Token thiết bị (POST /api/users/me/push-token)")
    void testUpdateMyPushToken_Success() {
        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            ResponseEntity<Void> response =
                    userController.updateMyPushToken(Map.of("pushToken", "ExponentPushToken[123]"));

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            assertEquals("ExponentPushToken[123]", user.getPushToken());
            verify(userRepository).save(user);
        }
    }

    @Test
    @DisplayName("Lấy thông tin User theo ID qua mã QR (GET /api/users/{userId})")
    void testGetUserById_Success() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ResponseEntity<UserSummaryResponse> response = userController.getUserById(userId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Nguyen Van A", response.getBody().getName());
        assertEquals(userId, response.getBody().getId());
    }

    @Test
    @DisplayName("Lấy thông tin User theo ID không tồn tại -> USER_NOT_FOUND")
    void testGetUserById_NotFound_ThrowsException() {
        UUID nonExistId = UUID.randomUUID();
        when(userRepository.findById(nonExistId)).thenReturn(Optional.empty());

        AppException ex =
                assertThrows(AppException.class, () -> userController.getUserById(nonExistId));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }
}
