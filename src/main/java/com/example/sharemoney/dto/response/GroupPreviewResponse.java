package com.example.sharemoney.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupPreviewResponse {
    private UUID id;
    private String name;
    private String description;
    private String avatarUrl;
    private UserSummaryResponse owner;
    private int memberCount;
    private boolean isJoined;
    private LocalDateTime createdAt;
}
