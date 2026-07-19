package com.example.sharemoney.dto;

import com.example.sharemoney.entity.LoanType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExternalLoanDTO {
    private UUID id;
    private LoanType type;
    private String counterpartyName;
    private BigDecimal principalAmount;
    private Double interestRate;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String description;
    private boolean isSettled;
}
