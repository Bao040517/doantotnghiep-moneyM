package com.example.sharemoney.security;

import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    /** Lấy UUID của user đang đăng nhập hiện tại từ Spring Security Context. */
    public static UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getId();
        }
        throw new AppException(ErrorCode.UNAUTHORIZED);
    }
}
