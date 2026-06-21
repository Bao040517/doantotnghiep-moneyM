package com.example.sharemoney.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {

    private UUID id;
    private String message;
    private String type;
    private boolean isRead;
    private LocalDateTime createdAt;
}
