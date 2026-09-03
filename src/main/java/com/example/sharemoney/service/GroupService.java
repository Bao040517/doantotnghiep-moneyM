package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.AddMemberRequest;
import com.example.sharemoney.dto.request.CreateGroupRequest;
import com.example.sharemoney.dto.response.GroupDetailResponse;
import com.example.sharemoney.dto.response.GroupPreviewResponse;
import com.example.sharemoney.dto.response.GroupResponse;
import com.example.sharemoney.dto.response.UserSummaryResponse;
import com.example.sharemoney.entity.Group;
import com.example.sharemoney.entity.GroupMember;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.ExpenseRepository;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.GroupRepository;
import com.example.sharemoney.repository.PaymentRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final DebtService debtService;

    // ─────────────────────────────────────────────────────────────
    // Tạo nhóm mới + tự động thêm người tạo làm "owner"
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GroupResponse createGroup(CreateGroupRequest req) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        User owner =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Group group =
                Group.builder()
                        .name(req.getName())
                        .description(req.getDescription())
                        .avatarUrl(req.getAvatarUrl())
                        .owner(owner)
                        .build();
        groupRepository.save(group);

        GroupMember ownerMember =
                GroupMember.builder().group(group).user(owner).role("owner").build();
        groupMemberRepository.save(ownerMember);

        int count = 1;
        if (req.getMemberIds() != null && !req.getMemberIds().isEmpty()) {
            for (UUID memberId : req.getMemberIds()) {
                if (memberId.equals(owner.getId())) continue;
                User memberUser = userRepository.findById(memberId).orElse(null);
                if (memberUser != null) {
                    GroupMember gm =
                            GroupMember.builder()
                                    .group(group)
                                    .user(memberUser)
                                    .role("member")
                                    .build();
                    groupMemberRepository.save(gm);
                    count++;

                    // Gửi thông báo Realtime & Push Notification cho thành viên được thêm vào nhóm
                    String message =
                            String.format(
                                    "%s đã thêm bạn vào nhóm \"%s\".",
                                    owner.getName(), group.getName());
                    notificationService.sendNotification(
                            memberUser.getId(), message, "GROUP_MEMBER_ADDED");
                }
            }
        }

        return toGroupResponse(group, count, 0, 0);
    }

    // ─────────────────────────────────────────────────────────────
    // Lấy danh sách thành viên từng chung nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getPastMembers(UUID userId) {
        List<User> pastMembers = groupMemberRepository.findPastMembers(userId);
        return pastMembers.stream().map(this::toUserSummary).toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Lấy danh sách nhóm mà user đang tham gia
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<GroupResponse> getUserGroups(UUID userId) {
        userRepository
                .findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<com.example.sharemoney.entity.GroupMember> memberships =
                groupMemberRepository.findByUser_Id(userId);
        if (memberships.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<UUID> groupIds = memberships.stream().map(gm -> gm.getGroup().getId()).toList();
        List<Object[]> memberCounts = groupMemberRepository.countMembersByGroupIds(groupIds);
        java.util.Map<UUID, Long> countMap =
                memberCounts.stream()
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        arr -> (UUID) arr[0], arr -> (Long) arr[1]));

        List<Object[]> pendingCounts = expenseRepository.countPendingRevisionsByGroupIds(groupIds);
        java.util.Map<UUID, Long> pendingMap =
                pendingCounts.stream()
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        arr -> (UUID) arr[0], arr -> (Long) arr[1]));

        List<Object[]> pendingPaymentCounts = paymentRepository.countPendingPaymentsByGroupIds(groupIds);
        java.util.Map<UUID, Long> pendingPaymentMap =
                pendingPaymentCounts.stream()
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        arr -> (UUID) arr[0], arr -> (Long) arr[1]));

        return memberships.stream()
                .map(
                        gm -> {
                            Group g = gm.getGroup();
                            int count = countMap.getOrDefault(g.getId(), 0L).intValue();
                            int pendingCount = pendingMap.getOrDefault(g.getId(), 0L).intValue();
                            int pendingPaymentCount = pendingPaymentMap.getOrDefault(g.getId(), 0L).intValue();
                            return toGroupResponse(g, count, pendingCount, pendingPaymentCount);
                        })
                .toList();
    }

    // ─────────────────────────────────────────────────────────────
    // Lấy chi tiết 1 nhóm (kiểm tra user có phải thành viên không)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public GroupDetailResponse getGroupDetail(UUID groupId, UUID userId) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        boolean isOwner = group.getOwner() != null && group.getOwner().getId().equals(userId);
        boolean isMember = groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId);

        if (!isOwner && !isMember) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        List<GroupDetailResponse.MemberResponse> members =
                groupMemberRepository.findByGroup_Id(groupId).stream()
                        .map(
                                gm ->
                                        GroupDetailResponse.MemberResponse.builder()
                                                .id(gm.getId())
                                                .user(toUserSummary(gm.getUser()))
                                                .role(gm.getRole())
                                                .joinedAt(gm.getJoinedAt())
                                                .build())
                        .toList();

        int pendingCount = (int) expenseRepository.countByGroup_IdAndIsPendingRevisionTrue(groupId);
        int pendingPaymentCount = (int) paymentRepository.countByGroup_IdAndStatus(groupId, "pending");

        return GroupDetailResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .owner(toUserSummary(group.getOwner()))
                .members(members)
                .pendingRevisionCount(pendingCount)
                .pendingPaymentCount(pendingPaymentCount)
                .hasPendingPayment(pendingPaymentCount > 0)
                .createdAt(group.getCreatedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Cập nhật ảnh đại diện nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GroupDetailResponse updateGroupAvatar(UUID groupId, String avatarUrl) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        group.setAvatarUrl(avatarUrl);
        groupRepository.save(group);

        return getGroupDetail(groupId, currentUserId);
    }

    // ─────────────────────────────────────────────────────────────
    // Thêm thành viên vào nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void addMember(UUID groupId, AddMemberRequest req) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        // Validate: chỉ thành viên nhóm mới được thêm người mới
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        User newUser =
                userRepository
                        .findById(req.getUserId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, newUser.getId())) {
            throw new AppException(ErrorCode.ALREADY_GROUP_MEMBER);
        }

        GroupMember member =
                GroupMember.builder().group(group).user(newUser).role("member").build();
        groupMemberRepository.save(member);

        // Gửi thông báo Realtime & Push Notification cho thành viên vừa được thêm
        User currentAdder = userRepository.findById(currentUserId).orElse(null);
        String adderName =
                (currentAdder != null && currentAdder.getName() != null)
                        ? currentAdder.getName()
                        : "Một thành viên";
        String message =
                String.format("%s đã thêm bạn vào nhóm \"%s\".", adderName, group.getName());
        notificationService.sendNotification(newUser.getId(), message, "GROUP_MEMBER_ADDED");
    }

    // ─────────────────────────────────────────────────────────────
    // Xem trước thông tin nhóm (dùng cho quét mã QR tham gia nhóm)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public GroupPreviewResponse getGroupPreview(UUID groupId, UUID currentUserId) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        boolean isJoined = groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId);
        int memberCount = groupMemberRepository.findByGroup_Id(groupId).size();

        return GroupPreviewResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .owner(toUserSummary(group.getOwner()))
                .memberCount(memberCount)
                .isJoined(isJoined)
                .createdAt(group.getCreatedAt())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // Người dùng tự tham gia nhóm qua mã QR / liên kết mời
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public GroupResponse joinGroup(UUID groupId, UUID currentUserId) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        boolean isAlreadyMember =
                groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId);

        if (!isAlreadyMember) {
            GroupMember member =
                    GroupMember.builder().group(group).user(currentUser).role("member").build();
            groupMemberRepository.save(member);

            // Báo cho chủ nhóm nếu có thành viên mới tự quét mã QR tham gia
            if (group.getOwner() != null && !group.getOwner().getId().equals(currentUser.getId())) {
                String message =
                        String.format(
                                "%s đã tham gia vào nhóm \"%s\" qua mã QR / liên kết mời.",
                                currentUser.getName(), group.getName());
                notificationService.sendNotification(
                        group.getOwner().getId(), message, "GROUP_MEMBER_ADDED");
            }
        }

        int memberCount = groupMemberRepository.findByGroup_Id(groupId).size();
        int pendingCount = (int) expenseRepository.countByGroup_IdAndIsPendingRevisionTrue(groupId);
        int pendingPaymentCount = (int) paymentRepository.countByGroup_IdAndStatus(groupId, "pending");
        return toGroupResponse(group, memberCount, pendingCount, pendingPaymentCount);
    }

    // ─────────────────────────────────────────────────────────────
    // Xóa thành viên khỏi nhóm hoặc tự rời nhóm
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void removeMember(UUID groupId, UUID memberIdToDelete, UUID requesterId) {
        Group group =
                groupRepository
                        .findById(groupId)
                        .orElseThrow(() -> new AppException(ErrorCode.GROUP_NOT_FOUND));

        GroupMember memberToDelete =
                groupMemberRepository
                        .findByGroup_IdAndUser_Id(groupId, memberIdToDelete)
                        .orElseThrow(() -> new AppException(ErrorCode.MEMBER_NOT_FOUND));

        boolean isOwner = group.getOwner() != null && group.getOwner().getId().equals(requesterId);
        boolean isSelf = requesterId.equals(memberIdToDelete);

        if (!isOwner && !isSelf) {
            throw new AppException(ErrorCode.NOT_GROUP_MEMBER);
        }

        // Không cho phép xóa chủ nhóm
        if (group.getOwner() != null && group.getOwner().getId().equals(memberIdToDelete)) {
            if (isSelf) {
                throw new AppException(ErrorCode.OWNER_CANNOT_LEAVE);
            } else {
                throw new AppException(ErrorCode.CANNOT_REMOVE_OWNER);
            }
        }

        // KIỂM TRA QUY TẮC CÔNG NỢ BẰNG 0 (Zero Debt Balance Rule)
        com.example.sharemoney.dto.response.DebtSummaryResponse debts =
                debtService.calculateGroupDebts(groupId, requesterId);

        java.math.BigDecimal memberBalance = java.math.BigDecimal.ZERO;
        if (debts != null && debts.getMemberBalances() != null) {
            memberBalance =
                    debts.getMemberBalances().stream()
                            .filter(mb -> mb != null && mb.getUser() != null && memberIdToDelete.equals(mb.getUser().getId()))
                            .findFirst()
                            .map(com.example.sharemoney.dto.response.DebtSummaryResponse.MemberBalance::getBalance)
                            .orElse(java.math.BigDecimal.ZERO);
        }

        if (memberBalance != null && memberBalance.compareTo(java.math.BigDecimal.ZERO) != 0) {
            throw new AppException(ErrorCode.DEBT_NOT_SETTLED);
        }

        groupMemberRepository.delete(memberToDelete);

        // Gửi thông báo cho thành viên bị xóa
        if (isOwner && !isSelf) {
            String message =
                    String.format("Bạn đã được xóa khỏi nhóm \"%s\".", group.getName());
            notificationService.sendNotification(
                    memberIdToDelete, message, "GROUP_MEMBER_REMOVED");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helper methods
    // ─────────────────────────────────────────────────────────────
    private GroupResponse toGroupResponse(
            Group group, int memberCount, int pendingRevisionCount, int pendingPaymentCount) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .avatarUrl(group.getAvatarUrl())
                .owner(toUserSummary(group.getOwner()))
                .memberCount(memberCount)
                .pendingRevisionCount(pendingRevisionCount)
                .pendingPaymentCount(pendingPaymentCount)
                .hasPendingPayment(pendingPaymentCount > 0)
                .createdAt(group.getCreatedAt())
                .build();
    }

    private UserSummaryResponse toUserSummary(User user) {
        return UserMapper.toUserSummary(user);
    }
}
