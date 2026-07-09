package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

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
