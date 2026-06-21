package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdatePhoneRequest {

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;
}
