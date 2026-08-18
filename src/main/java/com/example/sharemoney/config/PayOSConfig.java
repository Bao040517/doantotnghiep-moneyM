package com.example.sharemoney.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Setter
public class PayOSConfig {

    @Value("${payos.client-id:f0eb6860-35ac-443b-abe4-420c5bf8914e}")
    private String clientId;

    @Value("${payos.api-key:692788be-837f-4ad0-9026-5e5acd25e85b}")
    private String apiKey;

    @Value("${payos.checksum-key:e003b853f0539e62a405c40711a39f0c8f47c70f1da499cbb97e7342409649ca}")
    private String checksumKey;

    @Value("${payos.return-url:https://your-domain.com/payment-success}")
    private String returnUrl;

    @Value("${payos.cancel-url:https://your-domain.com/payment-cancel}")
    private String cancelUrl;
}
