package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Getter;

/**
 * Tóm tắt nợ xuyên suốt TẤT CẢ các nhóm của một user. Dùng cho API GET /api/groups/debts/summary
 * Được dùng bởi WalletTab để tính Safe-to-Spend.
 */
@Getter
@Builder
public class UserDebtSummaryResponse {

    /** Tổng số tiền người khác đang nợ user này (user là chủ nợ). */
    private BigDecimal totalOwed;

    /** Tổng số tiền user này đang nợ người khác (user là con nợ). */
    private BigDecimal totalOwing;

    /** Danh sách chi tiết các khoản nợ nhóm của user này. */
    private java.util.List<DebtDetail> details;

    @Getter
    @Builder
    public static class DebtDetail {
        private java.util.UUID groupId;
        private String groupName;
        private UserSummaryResponse counterparty;
        private BigDecimal amount;
        private String type; // "OWED" (người ta nợ mình) hoặc "OWING" (mình nợ người ta)
    }
}
