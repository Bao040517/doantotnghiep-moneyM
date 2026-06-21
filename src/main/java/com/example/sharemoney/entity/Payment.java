package com.example.sharemoney.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Giao dịch thanh toán giữa 2 thành viên trong nhóm. Được tạo khi Greedy algorithm xác định ai cần
 * trả cho ai bao nhiêu. status: "pending" | "completed"
 *
 * @deprecated Entity này hiện chưa được sử dụng trong bất kỳ Service/Repository nào.
 * Hệ thống đang dùng ConcurrentHashMap in-memory (DebtService.pendingPayments) thay thế.
 * Dữ liệu pending sẽ mất khi server restart. Cần migrate sang dùng bảng này trong tương lai.
 */
@Deprecated
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_id", nullable = false)
    private User payer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    /**
     * Trạng thái: "pending" hoặc "completed". Sẽ update thành "completed" khi nhận tín hiệu Webhook
     * thanh toán.
     */
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "pending";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
