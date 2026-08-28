package com.example.sharemoney.service;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class ExpoPushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Bắn Native Push Notification ra màn hình khóa của điện thoại thông qua Expo Push API (APNs /
     * FCM). Chạy bất đồng bộ để đảm bảo tốc độ phản hồi API 0ms cho client.
     */
    @Async
    public void sendPushNotification(
            String pushToken, String title, String body, Map<String, Object> data) {
        if (pushToken == null || pushToken.isBlank()) {
            log.debug("[EXPO PUSH] Bỏ qua vì user chưa đăng ký pushToken");
            return;
        }

        if (!pushToken.startsWith("ExponentPushToken[")
                && !pushToken.startsWith("ExpoPushToken[")) {
            log.warn("[EXPO PUSH] Token không hợp lệ: {}", pushToken);
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> payload = new HashMap<>();
            payload.put("to", pushToken);
            payload.put("title", title != null ? title : "💰 ShareMoney");
            payload.put("body", body);
            payload.put("sound", "default");
            payload.put("priority", "high");
            payload.put("channelId", "default");
            if (data != null) {
                payload.put("data", data);
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response =
                    restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);

            log.info(
                    "[EXPO PUSH SUCCESS] Đã gửi thông báo tới {}: Title='{}', Status={}",
                    pushToken,
                    title,
                    response.getStatusCode());
        } catch (Exception e) {
            log.error(
                    "[EXPO PUSH ERROR] Không thể gửi push notification tới {}: {}",
                    pushToken,
                    e.getMessage());
        }
    }
}
