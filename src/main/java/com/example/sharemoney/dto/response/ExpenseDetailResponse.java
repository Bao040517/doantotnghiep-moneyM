package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/** Response chi tiết 1 khoản chi — bao gồm danh sách splits */
@Getter
@Builder
public class ExpenseDetailResponse {

    private UUID id;
    private String title;
    private BigDecimal amount;
    private String category;
    private UserSummaryResponse payer;
    private List<SplitResponse> splits;
    private LocalDateTime createdAt;

    private boolean isPendingRevision;
    private UserSummaryResponse revisionRequester;
    private String revisionNote;
    private String proposedTitle;
    private BigDecimal proposedAmount;
    private boolean canDelete;
    private boolean canEditDirectly;

    @Getter
    @Builder
    public static class SplitResponse {
        private UUID id;
        private UserSummaryResponse user;
        private BigDecimal amountOwed;
        private boolean isSettled;
    }
}
