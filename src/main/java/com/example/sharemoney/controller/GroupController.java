package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.AddMemberRequest;
import com.example.sharemoney.dto.request.CreateGroupRequest;
import com.example.sharemoney.dto.response.GroupDetailResponse;
import com.example.sharemoney.dto.response.GroupResponse;
import com.example.sharemoney.dto.response.UserDebtSummaryResponse;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.GroupService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final com.example.sharemoney.service.DebtService debtService;

    /** POST /api/groups Tạo nhóm mới. */
    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@Valid @RequestBody CreateGroupRequest req) {
        GroupResponse response = groupService.createGroup(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** GET /api/groups Lấy danh sách nhóm của user đang đăng nhập. */
    @GetMapping
    public ResponseEntity<List<GroupResponse>> getUserGroups() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(groupService.getUserGroups(userId));
    }

    /** GET /api/groups/past-members Lấy danh sách người quen (từng chung nhóm). */
    @GetMapping("/past-members")
    public ResponseEntity<List<com.example.sharemoney.dto.response.UserSummaryResponse>>
            getPastMembers() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(groupService.getPastMembers(userId));
    }

    /** GET /api/groups/{groupId} Lấy chi tiết 1 nhóm (phải là thành viên). */
    @GetMapping("/{groupId}")
    public ResponseEntity<GroupDetailResponse> getGroupDetail(@PathVariable UUID groupId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(groupService.getGroupDetail(groupId, userId));
    }

    /** PUT /api/groups/{groupId}/avatar Cập nhật ảnh đại diện nhóm. */
    @org.springframework.web.bind.annotation.PutMapping("/{groupId}/avatar")
    public ResponseEntity<GroupDetailResponse> updateGroupAvatar(
            @PathVariable UUID groupId,
            @Valid @RequestBody com.example.sharemoney.dto.request.UpdateAvatarRequest req) {
        return ResponseEntity.ok(groupService.updateGroupAvatar(groupId, req.getAvatarUrl()));
    }

    /** GET /api/groups/{groupId}/preview Xem trước thông tin nhóm qua mã QR trước khi tham gia. */
    @GetMapping("/{groupId}/preview")
    public ResponseEntity<com.example.sharemoney.dto.response.GroupPreviewResponse> getGroupPreview(
            @PathVariable UUID groupId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(groupService.getGroupPreview(groupId, userId));
    }

    /** POST /api/groups/{groupId}/join Tự tham gia nhóm qua mã QR / liên kết mời. */
    @PostMapping("/{groupId}/join")
    public ResponseEntity<GroupResponse> joinGroup(@PathVariable UUID groupId) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(groupService.joinGroup(groupId, userId));
    }

    /** POST /api/groups/{groupId}/members Thêm thành viên vào nhóm. */
    @PostMapping("/{groupId}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable UUID groupId, @Valid @RequestBody AddMemberRequest req) {
        groupService.addMember(groupId, req);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * GET /api/groups/debts/summary Trả về tổng số tiền user đang nợ (totalOwing) và được nợ
     * (totalOwed) xuyên suốt tất cả các nhóm. Dùng để tính Safe-to-Spend trên WalletTab.
     */
    @GetMapping("/debts/summary")
    public ResponseEntity<UserDebtSummaryResponse> getMyDebtSummary() {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(debtService.getUserDebtSummary(userId));
    }
}
