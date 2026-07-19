package com.example.sharemoney.dto.request;

import com.example.sharemoney.entity.LoanType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

@Data
public class CreateExternalLoanRequest {
    @NotNull(message = "Loan type is required") private LoanType type;

    @NotBlank(message = "Counterparty name is required")
    private String counterpartyName;

    @NotNull(message = "Principal amount is required") private BigDecimal principalAmount;

    @NotNull(message = "Interest rate is required") private Double interestRate;

    private LocalDate startDate;

    private LocalDate dueDate;

    private String description;
}
