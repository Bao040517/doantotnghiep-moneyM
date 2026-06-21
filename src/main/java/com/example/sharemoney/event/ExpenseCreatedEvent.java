package com.example.sharemoney.event;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ExpenseCreatedEvent {
    private UUID expenseId;
    private UUID payerId;
    private BigDecimal amount;
    private String title;
    private String categoryName;
}
