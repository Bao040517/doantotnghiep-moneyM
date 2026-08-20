package com.example.sharemoney.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankLookupResponse {
    private String accountName;
    private String bin;
    private String accountNumber;
    private boolean verified;
    private String message;
}
