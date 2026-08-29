package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.response.NotificationResponse;
import com.example.sharemoney.entity.Notification;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.NotificationRepository;
import com.example.sharemoney.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private ExpoPushService expoPushService;

    @InjectMocks private NotificationService notificationService;

    private UUID userId;
    private User user;
    private Notification notification;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .name("Nguyen Van A")
                .email("vana@example.com")
                .pushToken("ExponentPushToken[xxxx]")
                .build();

        notification = Notification.builder()
                .id(UUID.randomUUID())
                .user(user)
                .message("Bạn có khoản nợ mới cần thanh toán")
                .type("REMIND_DEBT")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Gửi thông báo: Lưu DB, bắn STOMP websocket và gửi Push notification")
    void testSendNotification_Success() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });

        notificationService.sendNotification(userId, "Bạn vừa nhận được tiền", "PAYMENT_RECEIVED");

        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/user/" + userId), any(NotificationResponse.class));
        verify(expoPushService).sendPushNotification(eq("ExponentPushToken[xxxx]"), anyString(), eq("Bạn vừa nhận được tiền"), anyMap());
    }

    @Test
    @DisplayName("Gửi thông báo: Không tìm thấy User -> Ném USER_NOT_FOUND")
    void testSendNotification_UserNotFound_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> 
            notificationService.sendNotification(userId, "Test", "WARNING")
        );
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Lấy danh sách thông báo của User")
    void testGetUserNotifications_Success() {
        when(notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId)).thenReturn(List.of(notification));

        List<NotificationResponse> responses = notificationService.getUserNotifications(userId);

        assertEquals(1, responses.size());
        assertEquals("Bạn có khoản nợ mới cần thanh toán", responses.get(0).getMessage());
        assertFalse(responses.get(0).isRead());
    }

    @Test
    @DisplayName("Đếm số lượng thông báo chưa đọc")
    void testGetUnreadCount_Success() {
        when(notificationRepository.countByUser_IdAndIsReadFalse(userId)).thenReturn(5L);

        long count = notificationService.getUnreadCount(userId);

        assertEquals(5L, count);
    }

    @Test
    @DisplayName("Đánh dấu thông báo đã đọc: Thành công")
    void testMarkAsRead_Success() {
        UUID notificationId = notification.getId();
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        notificationService.markAsRead(notificationId, userId);

        assertTrue(notification.isRead());
        verify(notificationRepository).save(notification);
    }

    @Test
    @DisplayName("Đánh dấu thông báo đã đọc: Không phải chủ sở hữu -> UNAUTHORIZED")
    void testMarkAsRead_Unauthorized_ThrowsException() {
        UUID otherUserId = UUID.randomUUID();
        UUID notificationId = notification.getId();
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        AppException ex = assertThrows(AppException.class, () -> 
            notificationService.markAsRead(notificationId, otherUserId)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Đánh dấu tất cả thông báo đã đọc")
    void testMarkAllAsRead_Success() {
        Notification n1 = Notification.builder().id(UUID.randomUUID()).user(user).isRead(false).build();
        Notification n2 = Notification.builder().id(UUID.randomUUID()).user(user).isRead(false).build();

        when(notificationRepository.findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(n1, n2));

        notificationService.markAllAsRead(userId);

        assertTrue(n1.isRead());
        assertTrue(n2.isRead());
        verify(notificationRepository).saveAll(List.of(n1, n2));
    }
}
