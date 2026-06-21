package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.NotificationResponse;
import com.example.sharemoney.entity.Notification;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.NotificationRepository;
import com.example.sharemoney.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /** Hàm chính để các Service khác gọi khi muốn thông báo (Ví dụ: Nhắc nợ, Thêm chi tiêu) */
    @Transactional
    public void sendNotification(UUID userId, String message, String type) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 1. Lưu vào Database
        Notification notification =
                Notification.builder().user(user).message(message).type(type).isRead(false).build();
        notificationRepository.save(notification);

        // 2. Chuyển sang DTO
        NotificationResponse response =
                NotificationResponse.builder()
                        .id(notification.getId())
                        .message(notification.getMessage())
                        .type(notification.getType())
                        .isRead(notification.isRead())
                        // Do mới save, createdAt có thể null, lấy thời điểm hiện tại cho DTO
                        .createdAt(java.time.LocalDateTime.now())
                        .build();

        // 3. Bắn STOMP message tới kênh riêng của user: /topic/user/{userId}
        String destination = "/topic/user/" + userId.toString();
        messagingTemplate.convertAndSend(destination, response);
    }

    /** Lấy danh sách thông báo của user */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(UUID userId) {
        return notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(
                        n ->
                                NotificationResponse.builder()
                                        .id(n.getId())
                                        .message(n.getMessage())
                                        .type(n.getType())
                                        .isRead(n.isRead())
                                        .createdAt(n.getCreatedAt())
                                        .build())
                .toList();
    }

    /** Đánh dấu 1 thông báo là đã đọc */
    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification =
                notificationRepository
                        .findById(notificationId)
                        .orElseThrow(
                                () ->
                                        new AppException(
                                                ErrorCode.INTERNAL_ERROR)); // Có thể dùng NOT_FOUND

        // Đảm bảo chỉ người sở hữu mới được đánh dấu
        if (!notification.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }
}
