package com.example.sharemoney.event;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DebtSettledEvent {
    private UUID settlementExpenseId;
    private UUID debtorId;
    private UUID creditorId;
    private BigDecimal amount;
}
