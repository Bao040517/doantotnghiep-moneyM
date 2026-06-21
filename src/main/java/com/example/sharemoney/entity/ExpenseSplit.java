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
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Chi tiết phần chia tiền của từng thành viên cho một khoản chi tiêu. Khi Expense được tạo, Service
 * sẽ tự động tạo các ExpenseSplit tương ứng.
 */
@Entity
@Table(name = "expense_splits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Số tiền user này phải trả cho khoản chi này. */
    @Column(name = "amount_owed", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountOwed;

    /** true = đã thanh toán xong phần này. */
    @Builder.Default
    @Column(name = "is_settled", nullable = false)
    private boolean isSettled = false;
}
