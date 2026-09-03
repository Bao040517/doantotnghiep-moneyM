package com.example.sharemoney.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Một khoản chi tiêu chung trong nhóm. paid_by: người trả trước, chia tiền cho những người trong
 * splits.
 */
@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by", nullable = false)
    private User payer;

    @Column(nullable = false, length = 200)
    private String title;

    /** Tổng số tiền của khoản chi (VND). Dùng BigDecimal để tránh lỗi làm tròn floating-point. */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 50)
    private String category;

    /** Cờ đánh dấu khoản chi đang có yêu cầu chỉnh sửa từ thành viên nhóm */
    @Column(name = "is_pending_revision")
    @Builder.Default
    private Boolean isPendingRevision = false;

    /** Thành viên gửi yêu cầu chỉnh sửa */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revision_requester_id")
    private User revisionRequester;

    /** Ghi chú / lý do yêu cầu chỉnh sửa */
    @Column(name = "revision_note", length = 500)
    private String revisionNote;

    /** Tiêu đề đề xuất */
    @Column(name = "proposed_title", length = 200)
    private String proposedTitle;

    /** Số tiền đề xuất */
    @Column(name = "proposed_amount", precision = 15, scale = 2)
    private BigDecimal proposedAmount;

    /**
     * orphanRemoval = true: khi splits bị remove khỏi list, JPA tự xoá record trong DB — dùng khi
     * UPDATE expense. CascadeType.ALL: khi xoá Expense, tự xoá toàn bộ splits.
     */
    @Builder.Default
    @ToString.Exclude
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExpenseSplit> splits = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
