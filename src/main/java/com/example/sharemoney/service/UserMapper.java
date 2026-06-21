package com.example.sharemoney.service;

import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.User;

/**
 * Utility class dùng chung để map User entity → UserSummaryResponse.
 * Loại bỏ các hàm private toUserSummary() trùng lặp trong DebtService, ExpenseService, GroupService.
 */
public final class UserMapper {

    private UserMapper() {
        // Utility class — không cho phép khởi tạo
    }

    public static UserSummaryResponse toUserSummary(User user) {
        if (user == null) return null;
        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .bankQrUrl(user.getBankQrUrl())
                .bankBin(user.getBankBin())
                .bankAccountNo(user.getBankAccountNo())
                .build();
    }
}
