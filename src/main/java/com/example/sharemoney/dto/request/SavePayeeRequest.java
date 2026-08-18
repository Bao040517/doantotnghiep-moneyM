package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SavePayeeRequest {

    /** Tên gợi nhớ, VD: "Cô Lan chủ nhà", "EVN Hà Nội" */
    @NotBlank(message = "Tên người nhận không được để trống")
    private String name;

    /** Mã BIN Napas247, VD: "970422" = MBBank */
    private String bankBin;

    /** Tên ngân hàng rút gọn, VD: "MBBank" */
    private String bankName;

    /** Số tài khoản ngân hàng (bắt buộc) */
    @NotBlank(message = "Số tài khoản không được để trống")
    private String bankAccount;

    /** Tên chủ tài khoản (ALL CAPS) */
    private String accountName;

    /** Số điện thoại (tùy chọn) */
    private String phone;
}
