package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Notification;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    List<Notification> findByUser_IdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    /** Kiểm tra trùng notification cùng type trong ngày (cho smart budget alert) */
    boolean existsByUser_IdAndTypeAndCreatedAtAfter(
            UUID userId, String type, java.time.LocalDateTime after);
}
