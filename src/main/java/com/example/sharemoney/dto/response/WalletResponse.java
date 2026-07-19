package com.example.sharemoney.dto.response;

import java.math.BigDecimal;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WalletResponse {
    private UUID id;
    private String name;
    private BigDecimal balance;
    private String currency;
    private String bankBin;
    private String bankAccountNo;
    private String bankAccountName;
}
