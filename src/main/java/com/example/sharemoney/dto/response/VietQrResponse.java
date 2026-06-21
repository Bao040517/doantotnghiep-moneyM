package com.example.sharemoney.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VietQrResponse {

    /** URL hình ảnh QR Code, Frontend chỉ cần gắn vào thẻ <img src="..."> */
    private String qrUrl;

    /** Thông báo hỗ trợ nếu user chưa thiết lập ngân hàng */
    private String message;
}
