package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAvatarRequest {

    @NotBlank(message = "URL hoặc dữ liệu ảnh đại diện không được để trống.")
    private String avatarUrl;
}
