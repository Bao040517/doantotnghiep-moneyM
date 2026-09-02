package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.UpdateAvatarRequest;
import com.example.sharemoney.dto.request.UpdatePhoneRequest;
import com.example.sharemoney.dto.request.UpdateProfileRequest;
import com.example.sharemoney.dto.request.UpdateQrRequest;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.BankLookupService;
import jakarta.validation.Valid;
import java.text.Normalizer;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final BankLookupService bankLookupService;

    @GetMapping("/me")
    public ResponseEntity<UserSummaryResponse> getMyProfile() {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return ResponseEntity.ok(toUserSummary(user));
    }

    private void validateBankAccount(String bin, String accountNo, String accountName) {
        boolean hasAnyValue = bin != null || accountNo != null || accountName != null;
        if (!hasAnyValue) return;

        if (bin == null || accountNo == null || accountName == null || accountName.isBlank()) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_NOT_VERIFIED);
        }

        var lookup = bankLookupService.lookupAccount(bin, accountNo);
        if (!lookup.isVerified()
                || lookup.getAccountName() == null
                || !normalizeName(lookup.getAccountName()).equals(normalizeName(accountName))) {
            throw new AppException(ErrorCode.BANK_ACCOUNT_NOT_VERIFIED);
        }
    }

    private String normalizeName(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D")
                .replaceAll("\\s+", "")
                .toUpperCase();
    }

    @GetMapping("/search")
    public ResponseEntity<UserSummaryResponse> searchByPhone(@RequestParam String phone) {
        User user =
                userRepository
                        .findByPhone(phone)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(toUserSummary(user));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserSummaryResponse> getUserById(@PathVariable UUID userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return ResponseEntity.ok(toUserSummary(user));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserSummaryResponse> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }

        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            userRepository
                    .findByPhone(request.getPhone().trim())
                    .ifPresent(
                            existingUser -> {
                                if (!existingUser.getId().equals(userId)) {
                                    throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
                                }
                            });
            user.setPhone(request.getPhone().trim());
        }

        userRepository.save(user);
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

        userRepository
                .findByPhone(request.getPhone())
                .ifPresent(
                        existingUser -> {
                            if (!existingUser.getId().equals(userId)) {
                                throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
                            }
                        });

        user.setPhone(request.getPhone());
        userRepository.save(user);

        return ResponseEntity.ok(toUserSummary(user));
    }

    @PutMapping("/me/avatar")
    public ResponseEntity<UserSummaryResponse> updateMyAvatar(
            @Valid @RequestBody UpdateAvatarRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        user.setAvatarUrl(request.getAvatarUrl());
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

        validateBankAccount(
                request.getBankBin(), request.getBankAccountNo(), request.getBankAccountName());
        validateBankAccount(
                request.getSavingsBankBin(),
                request.getSavingsBankAccountNo(),
                request.getSavingsBankAccountName());

        user.setBankQrUrl(request.getBankQrUrl());
        if (request.getBankBin() != null) user.setBankBin(request.getBankBin());
        if (request.getBankAccountNo() != null) user.setBankAccountNo(request.getBankAccountNo());
        if (request.getBankAccountName() != null)
            user.setBankAccountName(request.getBankAccountName());
        if (request.getSavingsBankBin() != null)
            user.setSavingsBankBin(request.getSavingsBankBin());
        if (request.getSavingsBankAccountNo() != null)
            user.setSavingsBankAccountNo(request.getSavingsBankAccountNo());
        if (request.getSavingsBankAccountName() != null)
            user.setSavingsBankAccountName(request.getSavingsBankAccountName());

        userRepository.save(user);

        return ResponseEntity.ok(toUserSummary(user));
    }

    @PostMapping("/me/push-token")
    public ResponseEntity<Void> updateMyPushToken(@RequestBody Map<String, String> request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String pushToken = request.get("pushToken");
        user.setPushToken(pushToken);
        userRepository.save(user);

        return ResponseEntity.noContent().build();
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
                .bankAccountName(user.getBankAccountName())
                .savingsBankBin(user.getSavingsBankBin())
                .savingsBankAccountNo(user.getSavingsBankAccountNo())
                .savingsBankAccountName(user.getSavingsBankAccountName())
                .build();
    }
}
