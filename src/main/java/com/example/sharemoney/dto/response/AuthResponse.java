package com.example.sharemoney.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    /**
     * Token truy cập chính (Bearer JWT), giữ tên 'token' để tương thích ngược 100% với frontend cũ
     */
    private String token;

    /** Access Token ngắn hạn (15 phút) */
    private String accessToken;

    /** Refresh Token dài hạn (7 ngày) dùng để cấp lại Access Token mới */
    private String refreshToken;

    @Builder.Default private String tokenType = "Bearer";

    private UserSummaryResponse user;
}
