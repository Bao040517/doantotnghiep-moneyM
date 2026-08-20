package com.example.sharemoney.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;

/** Response chi tiết 1 nhóm — bao gồm danh sách thành viên */
@Getter
@Builder
public class GroupDetailResponse {

    private UUID id;
    private String name;
    private String description;
    private String avatarUrl;
    private UserSummaryResponse owner;
    private List<MemberResponse> members;
    private LocalDateTime createdAt;

    @Getter
    @Builder
    public static class MemberResponse {
        private UUID id;
        private UserSummaryResponse user;
        private String role;
        private LocalDateTime joinedAt;
    }
}
