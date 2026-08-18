package com.example.sharemoney.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
        name = "payees",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "bank_account"})})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Tên gợi nhớ do người dùng đặt, VD: "Cô Lan chủ nhà" */
    @Column(nullable = false)
    private String name;

    /** Mã BIN ngân hàng Napas247, VD: "970422" = MBBank */
    @Column(name = "bank_bin", length = 20)
    private String bankBin;

    /** Tên hiển thị ngân hàng, VD: "MBBank" */
    @Column(name = "bank_name", length = 100)
    private String bankName;

    /** Số tài khoản ngân hàng (unique per user) */
    @Column(name = "bank_account", length = 50)
    private String bankAccount;

    /** Tên chủ tài khoản (ALL CAPS), VD: "NGUYEN VAN A" */
    @Column(name = "account_name", length = 200)
    private String accountName;

    /** Số điện thoại (tùy chọn) */
    @Column(name = "phone", length = 20)
    private String phone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
