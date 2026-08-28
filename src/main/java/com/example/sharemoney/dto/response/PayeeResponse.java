package com.example.sharemoney.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayeeResponse {

    private UUID id;

    /** Tên gợi nhớ do người dùng đặt */
    private String name;

    /** Mã BIN Napas247 */
    private String bankBin;

    /** Tên ngân hàng */
    private String bankName;

    /** Số tài khoản ngân hàng */
    private String bankAccount;

    /** Tên chủ tài khoản */
    private String accountName;

    /** Số điện thoại */
    private String phone;

    private LocalDateTime createdAt;

    /**
     * Nguồn dữ liệu — "saved" (danh bạ đã lưu) hoặc "group_member" (bạn bè trong nhóm). Chỉ dùng ở
     * endpoint /suggestions, không lưu vào DB.
     */
    private String source;
}
