package com.example.sharemoney.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Kênh thông báo gửi từ Server -> Client sẽ bắt đầu bằng /topic
        config.enableSimpleBroker("/topic");

        // Kênh gửi từ Client -> Server sẽ bắt đầu bằng /app
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Client sẽ kết nối tới ws://domain/ws
        // Chỉ cho phép origins cụ thể (bảo mật hơn so với "*")
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000", "http://localhost:3001")
                .withSockJS(); // SockJS là fallback nếu browser không support WebSocket nguyên thuỷ
    }
}
