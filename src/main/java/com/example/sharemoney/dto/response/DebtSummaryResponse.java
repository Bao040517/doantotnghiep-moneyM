package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/**
 * Kết quả thuật toán Greedy — tóm tắt nợ của cả nhóm. Bao gồm: - memberBalances: số dư ròng của
 * từng thành viên - transactions: danh sách giao dịch tối thiểu để thanh toán hết nợ
 */
@Getter
@Builder
public class DebtSummaryResponse {

    private UUID groupId;

    /**
     * Số dư ròng của từng thành viên. balance > 0: người này đang được nợ (creditor) balance < 0:
     * người này đang nợ người khác (debtor) balance = 0: đã hòa vốn
     */
    private List<MemberBalance> memberBalances;

    /** Danh sách giao dịch thanh toán tối giản do Greedy algorithm sinh ra */
    private List<SettlementTransaction> transactions;

    @Getter
    @Builder
    public static class MemberBalance {
        private UserSummaryResponse user;
        private BigDecimal balance;
    }

    @Getter
    @Builder
    public static class SettlementTransaction {
        private UserSummaryResponse from; // người trả
        private UserSummaryResponse to; // người nhận
        private BigDecimal amount;
    }
}
