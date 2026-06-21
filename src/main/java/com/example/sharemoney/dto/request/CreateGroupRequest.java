package com.example.sharemoney.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateGroupRequest {

    @NotBlank(message = "Tên nhóm không được để trống.")
    @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự.")
    private String name;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự.")
    private String description;
}
