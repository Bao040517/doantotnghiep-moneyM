package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.LoginRequest;
import com.example.sharemoney.dto.request.RegisterRequest;
import com.example.sharemoney.dto.response.AuthResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.CustomUserDetails;
import com.example.sharemoney.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(new CustomUserDetails(user));

        return AuthResponse.builder()
                .token(token)
                .user(toUserSummary(user))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(), request.getPassword()));

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            String token = jwtUtil.generateToken(userDetails);

            return AuthResponse.builder()
                    .token(token)
                    .user(toUserSummary(userDetails.getUser()))
                    .build();
        } catch (AuthenticationException e) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
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
