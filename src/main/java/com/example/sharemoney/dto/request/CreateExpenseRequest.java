package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateExpenseRequest {

    /** ID người thanh toán — hỗ trợ tính năng "nhập hộ" (chọn người trả khác người tạo). */
    @NotNull(message = "paidBy không được để trống.") private UUID paidBy;

    @NotBlank(message = "Tiêu đề khoản chi không được để trống.")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự.")
    private String title;

    @NotNull(message = "Số tiền không được để trống.") @DecimalMin(value = "1", message = "Số tiền phải lớn hơn 0.")
    private BigDecimal amount;

    @Size(max = 50, message = "Category tối đa 50 ký tự.")
    private String category;

    /**
     * Danh sách userId được chia tiền (không bao gồm người trả). Nếu bỏ trống, hệ thống sẽ tự động
     * chia đều cho tất cả thành viên trong nhóm.
     */
    private List<UUID> splitUserIds;

    /**
     * Tùy chọn: Số tiền nợ cụ thể cho từng người (Custom Split / Itemized Split). Key = userId,
     * Value = số tiền nợ. Nếu có dữ liệu, hệ thống sẽ sử dụng số tiền này thay vì chia đều.
     */
    private Map<UUID, BigDecimal> splitAmounts;

    /** Tùy chọn: ID của giao dịch cá nhân nếu muốn liên kết. */
    private UUID linkedTransactionId;
}
