package com.example.sharemoney.dto.request;

import com.example.sharemoney.entity.LoanType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateExternalLoanRequest {
    private LoanType type;
    private String counterpartyName;
    private BigDecimal principalAmount;
    private Double interestRate;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String description;
    private Boolean isSettled;
}
