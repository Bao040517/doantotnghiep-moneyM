package com.example.sharemoney.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(unique = true, length = 20)
    private String phone;

    /** Mã BIN ngân hàng (VD: 970422 là MBBank) dùng cho VietQR */
    @Column(name = "bank_bin", length = 20)
    private String bankBin;

    /** Số tài khoản ngân hàng */
    @Column(name = "bank_account_no", length = 50)
    private String bankAccountNo;

    /** Tên chủ tài khoản ngân hàng chính */
    @Column(name = "bank_account_name", length = 100)
    private String bankAccountName;

    /** Mã QR cá nhân (ngân hàng) do user tự upload */
    @Column(name = "bank_qr_url", length = 500)
    private String bankQrUrl;

    /** Mã BIN ngân hàng Ví tiết kiệm */
    @Column(name = "savings_bank_bin", length = 20)
    private String savingsBankBin;

    /** Số tài khoản Ví tiết kiệm */
    @Column(name = "savings_bank_account_no", length = 50)
    private String savingsBankAccountNo;

    /** Tên chủ tài khoản Ví tiết kiệm */
    @Column(name = "savings_bank_account_name", length = 100)
    private String savingsBankAccountName;

    /** Expo Push Token để nhận thông báo đẩy Native ra màn hình khóa (APNs / FCM) */
    @Column(name = "push_token", length = 255)
    private String pushToken;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
