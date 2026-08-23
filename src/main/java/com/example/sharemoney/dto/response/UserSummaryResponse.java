package com.example.sharemoney.dto.response;

import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/** Tóm tắt thông tin user — dùng trong các response lồng nhau */
@Getter
@Builder
public class UserSummaryResponse {

    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String avatarUrl;
    private String bankQrUrl;
    private String bankBin;
    private String bankAccountNo;
    private String bankAccountName;
    private String savingsBankBin;
    private String savingsBankAccountNo;
    private String savingsBankAccountName;
}
