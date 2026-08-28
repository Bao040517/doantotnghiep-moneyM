package com.example.sharemoney.dto.response;

import com.example.sharemoney.entity.SavingsGoalStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SavingsGoalResponse {
    private UUID id;
    private String name;
    private BigDecimal targetAmount;
    private BigDecimal currentAmount;
    private LocalDate deadlineDate;
    private SavingsGoalStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String warningMessage;
}
