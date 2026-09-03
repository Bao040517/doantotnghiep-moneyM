package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestExpenseRevisionRequest {

    @Size(max = 200, message = "Tiêu đề đề xuất không quá 200 ký tự")
    private String proposedTitle;

    private BigDecimal proposedAmount;

    @Size(max = 500, message = "Lý do chỉnh sửa không quá 500 ký tự")
    private String revisionNote;
}
