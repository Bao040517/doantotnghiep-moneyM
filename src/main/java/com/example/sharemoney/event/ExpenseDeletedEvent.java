package com.example.sharemoney.event;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ExpenseDeletedEvent {
    private final UUID expenseId;
}
