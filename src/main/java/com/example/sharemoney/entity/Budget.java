package com.example.sharemoney.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(
        name = "budgets",
        uniqueConstraints = {
            @UniqueConstraint(columnNames = {"user_id", "category_id", "month", "year", "name"})
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(length = 255)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "limit_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal limitAmount;

    @Column(nullable = false)
    private int month;

    @Column(nullable = false)
    private int year;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @Builder.Default
    private BudgetType type = BudgetType.FLEXIBLE;

    @Column(name = "is_recurring", nullable = false)
    private boolean isRecurring;

    @Column(name = "due_day_of_month")
    private Integer dueDayOfMonth;

    @Column(name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = false;

    @Column(name = "payee_bank_bin")
    private String payeeBankBin;

    @Column(name = "payee_bank_account")
    private String payeeBankAccount;

    @Column(name = "payee_account_name")
    private String payeeAccountName;

    /**
     * FK mềm tới bảng payees.id (nullable).
     * Nếu được gán, frontend biết bypass PayeeSelector và vào thẳng QR.
     */
    @Column(name = "payee_id")
    private UUID payeeId;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
