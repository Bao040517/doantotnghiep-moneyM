package com.example.sharemoney.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateQrRequest {

    private String bankQrUrl;

    private String bankBin;
    private String bankAccountNo;
}
