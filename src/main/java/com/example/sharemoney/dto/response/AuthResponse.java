package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {

    private String token;
    private UserSummaryResponse user;
}
