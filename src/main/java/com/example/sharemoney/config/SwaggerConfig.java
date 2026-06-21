package com.example.sharemoney.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info =
                @Info(
                        title = "ShareMoney REST API Documentation",
                        version = "1.0",
                        description =
                                "Tài liệu API cho đồ án ShareMoney (Bao gồm AI Gemini, VietQR, và Thuật toán Greedy)"),
        security = @SecurityRequirement(name = "bearerAuth") // Mặc định mọi API đều gắn ổ khóa
        )
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT")
public class SwaggerConfig {
    // Class này chỉ dùng để chứa các Annotation cấu hình Swagger
}
