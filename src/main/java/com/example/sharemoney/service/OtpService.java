package com.example.sharemoney.service;

import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OtpService {

    private static final long OTP_VALID_DURATION_MS = 5 * 60 * 1000; // 5 phút
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, OtpEntry> otpStorage = new ConcurrentHashMap<>();

    @Getter
    @Setter
    @AllArgsConstructor
    private static class OtpEntry {
        private String code;
        private long expiresAt;
        private int attempts;
    }

    /**
     * Sinh mã OTP ngẫu nhiên 6 chữ số và lưu vào bộ nhớ tạm trong 5 phút.
     */
    public String generateOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase();
        int randomNum = secureRandom.nextInt(1_000_000);
        String otpCode = String.format("%06d", randomNum);
        long expiresAt = System.currentTimeMillis() + OTP_VALID_DURATION_MS;

        otpStorage.put(normalizedEmail, new OtpEntry(otpCode, expiresAt, 0));
        log.info("[OTP Service] Đã sinh mã OTP cho {}: {} (Hết hạn sau 5 phút)", normalizedEmail, otpCode);

        return otpCode;
    }

    /**
     * Kiểm tra tính hợp lệ của mã OTP.
     * Ném ngoại lệ tương ứng nếu OTP không tồn tại, hết hạn, quá số lần thử hoặc không khớp.
     */
    public void validateOtp(String email, String inputOtp) {
        String normalizedEmail = email.trim().toLowerCase();
        OtpEntry entry = otpStorage.get(normalizedEmail);

        if (entry == null) {
            log.warn("[OTP Service] Không tìm thấy yêu cầu OTP cho {}", normalizedEmail);
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        if (System.currentTimeMillis() > entry.getExpiresAt()) {
            otpStorage.remove(normalizedEmail);
            log.warn("[OTP Service] Mã OTP của {} đã hết hạn", normalizedEmail);
            throw new AppException(ErrorCode.OTP_EXPIRED);
        }

        if (entry.getAttempts() >= MAX_ATTEMPTS) {
            otpStorage.remove(normalizedEmail);
            log.warn("[OTP Service] {} đã thử sai OTP quá {} lần", normalizedEmail, MAX_ATTEMPTS);
            throw new AppException(ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED);
        }

        if (!entry.getCode().equals(inputOtp.trim())) {
            entry.setAttempts(entry.getAttempts() + 1);
            log.warn("[OTP Service] Nhập sai OTP cho {} (Lần thử {}/{})", normalizedEmail, entry.getAttempts(), MAX_ATTEMPTS);
            throw new AppException(ErrorCode.OTP_INVALID);
        }

        // Khớp thành công -> Xóa mã OTP để tránh tái sử dụng
        otpStorage.remove(normalizedEmail);
        log.info("[OTP Service] Xác thực OTP thành công cho {}", normalizedEmail);
    }

    /**
     * Xóa mã OTP thủ công.
     */
    public void clearOtp(String email) {
        if (email != null) {
            otpStorage.remove(email.trim().toLowerCase());
        }
    }
}
