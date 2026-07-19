package com.example.sharemoney.event;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ExpenseUpdatedEvent {
    private final UUID expenseId;
    private final UUID payerId;
    private final BigDecimal amount;
    private final String title;
    private final String categoryName;
}
