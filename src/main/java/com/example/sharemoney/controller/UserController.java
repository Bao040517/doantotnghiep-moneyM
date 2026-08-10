package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.UpdatePhoneRequest;
import com.example.sharemoney.dto.request.UpdateQrRequest;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.SecurityUtils;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor

public class UserController {

    private final UserRepository userRepository;

    @org.springframework.web.bind.annotation.GetMapping("/me")
    public ResponseEntity<UserSummaryResponse> getMyProfile() {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(toUserSummary(user));
    }

    @org.springframework.web.bind.annotation.GetMapping("/search")
    public ResponseEntity<UserSummaryResponse> searchByPhone(
            @org.springframework.web.bind.annotation.RequestParam String phone) {
        User user =
                userRepository
                        .findByPhone(phone)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(toUserSummary(user));
    }

    @PutMapping("/me/phone")
    public ResponseEntity<UserSummaryResponse> updateMyPhone(
            @Valid @RequestBody UpdatePhoneRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (userRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
        }

        user.setPhone(request.getPhone());
        userRepository.save(user);

        return ResponseEntity.ok(toUserSummary(user));
    }

    @PutMapping("/me/qr")
    public ResponseEntity<UserSummaryResponse> updateMyQr(
            @Valid @RequestBody UpdateQrRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        user.setBankQrUrl(request.getBankQrUrl());
        if (request.getBankBin() != null) user.setBankBin(request.getBankBin());
        if (request.getBankAccountNo() != null) user.setBankAccountNo(request.getBankAccountNo());

        userRepository.save(user);

        return ResponseEntity.ok(toUserSummary(user));
    }

    private UserSummaryResponse toUserSummary(User user) {
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
