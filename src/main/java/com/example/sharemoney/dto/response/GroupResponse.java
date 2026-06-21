package com.example.sharemoney.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/** Response cho danh sách nhóm (list view) */
@Getter
@Builder
public class GroupResponse {

    private UUID id;
    private String name;
    private String description;
    private UserSummaryResponse creator;
    private int memberCount;
    private LocalDateTime createdAt;
}
