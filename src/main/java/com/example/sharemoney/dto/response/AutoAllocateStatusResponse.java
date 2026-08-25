package com.example.sharemoney.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AutoAllocateStatusResponse {
    private boolean hasAllocatedThisMonth;
    private int month;
    private int year;
    private String message;
}
