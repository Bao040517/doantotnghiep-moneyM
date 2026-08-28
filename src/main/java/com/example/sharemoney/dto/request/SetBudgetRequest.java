package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Data;

@Data
public class SetBudgetRequest {

    private UUID id;

    private String name;

    @NotNull(message = "Danh mục không được để trống") private UUID categoryId;

    @NotNull(message = "Số tiền không được để trống") @Positive(message = "Số tiền phải lớn hơn 0") private BigDecimal limitAmount;

    private int month; // 0 = tháng hiện tại

    private int year; // 0 = năm hiện tại

    private String type = "FLEXIBLE";

    private boolean isRecurring;

    private Integer dueDayOfMonth;

    @com.fasterxml.jackson.annotation.JsonProperty("isMandatory")
    private boolean isMandatory;

    private String payeeBankBin;

    private String payeeBankAccount;

    private String payeeAccountName;

    /**
     * ID người thụ hưởng đã lưu trong danh bạ (từ bảng payees). Nếu gửi kèm, hệ thống sẽ tự fill
     * thông tin ngân hàng.
     */
    private UUID payeeId;
}
