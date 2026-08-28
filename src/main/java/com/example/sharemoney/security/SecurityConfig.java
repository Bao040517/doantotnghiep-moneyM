package com.example.sharemoney.security;

import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RateLimitingFilter rateLimitingFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(
                                                (request, response, authException) -> {
                                                    response.setStatus(
                                                            jakarta.servlet.http.HttpServletResponse
                                                                    .SC_UNAUTHORIZED);
                                                    response.setContentType(
                                                            org.springframework.http.MediaType
                                                                    .APPLICATION_JSON_VALUE);
                                                    response.setCharacterEncoding("UTF-8");
                                                    response.getWriter()
                                                            .write(
                                                                    "{\"code\":401,\"message\":\"Chưa xác thực hoặc phiên đăng nhập đã hết hạn.\"}");
                                                })
                                        .accessDeniedHandler(
                                                (request, response, accessDeniedException) -> {
                                                    response.setStatus(
                                                            jakarta.servlet.http.HttpServletResponse
                                                                    .SC_FORBIDDEN);
                                                    response.setContentType(
                                                            org.springframework.http.MediaType
                                                                    .APPLICATION_JSON_VALUE);
                                                    response.setCharacterEncoding("UTF-8");
                                                    response.getWriter()
                                                            .write(
                                                                    "{\"code\":403,\"message\":\"Không có quyền truy cập.\"}");
                                                }))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers("/api/auth/**")
                                        .permitAll() // Cho phép truy cập không cần token
                                        .requestMatchers(
                                                "/api/vnpay/portal/**",
                                                "/api/vnpay/vnpay-ipn",
                                                "/api/vnpay/vnpay-return")
                                        .permitAll() // Cho phép Cổng thanh toán Web và Webhook
                                        // VNPay (không bao gồm simulate-success)
                                        .requestMatchers("/api/payos/webhook")
                                        .permitAll() // Chỉ cho phép Webhook PayOS
                                        // (create-payment-link yêu cầu JWT)
                                        .requestMatchers("/ws/**")
                                        .permitAll() // Cho phép WebSocket kết nối
                                        .requestMatchers(
                                                "/v3/api-docs/**",
                                                "/swagger-ui/**",
                                                "/swagger-ui.html",
                                                "/error")
                                        .permitAll() // Cho phép Swagger UI & Error page
                                        .anyRequest()
                                        .authenticated() // Các API còn lại yêu cầu token
                        )
                .sessionManagement(
                        session ->
                                session.sessionCreationPolicy(
                                        SessionCreationPolicy
                                                .STATELESS) // Không lưu session (REST API)
                        )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitingFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // Dùng BCrypt để băm mật khẩu
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(
                Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
