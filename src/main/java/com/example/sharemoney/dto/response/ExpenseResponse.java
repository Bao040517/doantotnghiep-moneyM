package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/** Response cho danh sách khoản chi (list view) */
@Getter
@Builder
public class ExpenseResponse {

    private UUID id;
    private String title;
    private BigDecimal amount;
    private String category;
    private UserSummaryResponse payer;
    private int splitCount;
    private LocalDateTime createdAt;
    private BigDecimal currentUserSplitAmount;
    private boolean isPendingRevision;
}
