package com.example.sharemoney.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
 * Đơn thanh toán trực tuyến qua cổng VNPay.
 * Dùng để đối soát, quản lý trạng thái thanh toán và ngăn ngừa giao dịch trùng lặp (Idempotency).
 */
@Entity
@Table(
    name = "payment_orders",
    indexes = {
        @Index(name = "idx_payment_orders_txn_ref", columnList = "txn_ref", unique = true),
        @Index(name = "idx_payment_orders_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @jakarta.persistence.Version
    private Long version;

    /**
     * Mã tham chiếu đơn hàng gửi sang VNPay (vnp_TxnRef), duy nhất 100%.
     */
    @Column(name = "txn_ref", nullable = false, unique = true, length = 64)
    private String txnRef;

    /**
     * Người thực hiện thanh toán.
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * Loại giao dịch thanh toán: BUDGET (Chi tiêu ngân sách) hoặc DEBT (Trả nợ nhóm).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PaymentOrderType type;

    /**
     * Số tiền thanh toán (VNĐ).
     */
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    // --- Thông tin dành cho giao dịch BUDGET ---
    @Column(name = "wallet_id")
    private UUID walletId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "budget_id")
    private UUID budgetId;

    // --- Thông tin dành cho giao dịch DEBT ---
    @Column(name = "group_id")
    private UUID groupId;

    @Column(name = "creditor_id")
    private UUID creditorId;

    /**
     * Trạng thái thanh toán của đơn hàng.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentOrderStatus status = PaymentOrderStatus.PENDING;

    /**
     * Mã giao dịch ghi nhận tại hệ thống VNPay (vnp_TransactionNo).
     */
    @Column(name = "vnp_transaction_no", length = 64)
    private String vnpTransactionNo;

    @Column(name = "vnp_bank_code", length = 32)
    private String vnpBankCode;

    @Column(name = "vnp_card_type", length = 32)
    private String vnpCardType;

    @Column(name = "vnp_pay_date", length = 32)
    private String vnpPayDate;

    @Column(name = "vnp_response_code", length = 10)
    private String vnpResponseCode;

    @Column(name = "vnp_order_info", length = 255)
    private String vnpOrderInfo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
