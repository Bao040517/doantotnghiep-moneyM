package com.example.sharemoney.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.UUID;

@Getter
@AllArgsConstructor
public class ExpenseDeletedEvent {
    private final UUID expenseId;
}
