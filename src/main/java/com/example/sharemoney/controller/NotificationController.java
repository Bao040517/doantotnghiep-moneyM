package com.example.sharemoney.controller;

import com.example.sharemoney.dto.response.NotificationResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.NotificationService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** GET /api/notifications Lấy danh sách lịch sử thông báo của user đang đăng nhập */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getUserNotifications() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    /** POST /api/notifications/{id}/read Đánh dấu 1 thông báo là đã đọc */
    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        UUID userId = SecurityUtils.getCurrentUserId();
        notificationService.markAsRead(id, userId);
        return ResponseEntity.noContent().build();
    }
}
