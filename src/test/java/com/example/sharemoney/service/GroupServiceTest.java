package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.AddMemberRequest;
import com.example.sharemoney.dto.request.CreateGroupRequest;
import com.example.sharemoney.dto.response.GroupDetailResponse;
import com.example.sharemoney.dto.response.GroupResponse;
import com.example.sharemoney.entity.Group;
import com.example.sharemoney.entity.GroupMember;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.GroupRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.security.SecurityUtils;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock private GroupRepository groupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private GroupService groupService;

    private UUID userId;
    private User user;
    private Group group;
    private UUID groupId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        groupId = UUID.randomUUID();

        user = User.builder()
                .id(userId)
                .name("Nguyen Van A")
                .email("vana@example.com")
                .avatarUrl("https://example.com/avatar.jpg")
                .build();

        group = Group.builder()
                .id(groupId)
                .name("Nhóm Bạn Thân")
                .description("Chia tiền ăn chơi")
                .avatarUrl("https://example.com/group.jpg")
                .owner(user)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Tạo nhóm mới thành công")
    void testCreateGroup_Success() {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("Nhóm Bạn Thân");
        req.setDescription("Chia tiền ăn chơi");

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(groupRepository.save(any(Group.class))).thenAnswer(inv -> {
                Group g = inv.getArgument(0);
                g.setId(groupId);
                return g;
            });

            GroupResponse response = groupService.createGroup(req);

            assertNotNull(response);
            assertEquals("Nhóm Bạn Thân", response.getName());
            assertEquals(1, response.getMemberCount());
            verify(groupRepository).save(any(Group.class));
            verify(groupMemberRepository).save(any(GroupMember.class));
        }
    }

    @Test
    @DisplayName("Tạo nhóm mới: Kèm danh sách thành viên ban đầu")
    void testCreateGroup_WithAdditionalMembers() {
        UUID memberId = UUID.randomUUID();
        User memberUser = User.builder().id(memberId).name("Tran Thi B").email("b@example.com").build();

        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("Nhóm Du Lịch");
        req.setMemberIds(List.of(memberId));

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(userRepository.findById(memberId)).thenReturn(Optional.of(memberUser));
            when(groupRepository.save(any(Group.class))).thenAnswer(inv -> {
                Group g = inv.getArgument(0);
                g.setId(groupId);
                return g;
            });

            GroupResponse response = groupService.createGroup(req);

            assertNotNull(response);
            assertEquals(2, response.getMemberCount());
            verify(groupMemberRepository, times(2)).save(any(GroupMember.class));
        }
    }

    @Test
    @DisplayName("Lấy danh sách nhóm của User")
    void testGetUserGroups_Success() {
        GroupMember gm = GroupMember.builder().id(UUID.randomUUID()).group(group).user(user).role("owner").build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(groupMemberRepository.findByUser_Id(userId)).thenReturn(List.of(gm));
        List<Object[]> counts = java.util.Collections.singletonList(new Object[]{groupId, 3L});
        when(groupMemberRepository.countMembersByGroupIds(List.of(groupId))).thenReturn(counts);

        List<GroupResponse> responses = groupService.getUserGroups(userId);

        assertEquals(1, responses.size());
        assertEquals("Nhóm Bạn Thân", responses.get(0).getName());
        assertEquals(3, responses.get(0).getMemberCount());
    }

    @Test
    @DisplayName("Lấy chi tiết nhóm: Thành công cho chủ nhóm (Owner)")
    void testGetGroupDetail_AsOwner_Success() {
        GroupMember gm = GroupMember.builder().id(UUID.randomUUID()).group(group).user(user).role("owner").build();

        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.findByGroup_Id(groupId)).thenReturn(List.of(gm));

        GroupDetailResponse response = groupService.getGroupDetail(groupId, userId);

        assertNotNull(response);
        assertEquals("Nhóm Bạn Thân", response.getName());
        assertEquals(1, response.getMembers().size());
        assertEquals("owner", response.getMembers().get(0).getRole());
    }

    @Test
    @DisplayName("Lấy chi tiết nhóm: Không tìm thấy nhóm -> GROUP_NOT_FOUND")
    void testGetGroupDetail_GroupNotFound_ThrowsException() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> groupService.getGroupDetail(groupId, userId));
        assertEquals(ErrorCode.GROUP_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Lấy chi tiết nhóm: Không phải thành viên -> NOT_GROUP_MEMBER")
    void testGetGroupDetail_NotMember_ThrowsException() {
        UUID strangerId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, strangerId)).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> groupService.getGroupDetail(groupId, strangerId));
        assertEquals(ErrorCode.NOT_GROUP_MEMBER, ex.getErrorCode());
    }

    @Test
    @DisplayName("Thêm thành viên vào nhóm: Thành công")
    void testAddMember_Success() {
        UUID newUserId = UUID.randomUUID();
        User newUser = User.builder().id(newUserId).name("Le Van C").email("c@example.com").build();
        AddMemberRequest req = new AddMemberRequest();
        req.setUserId(newUserId);

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
            when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)).thenReturn(true);
            when(userRepository.findById(newUserId)).thenReturn(Optional.of(newUser));
            when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, newUserId)).thenReturn(false);

            assertDoesNotThrow(() -> groupService.addMember(groupId, req));
            verify(groupMemberRepository).save(any(GroupMember.class));
        }
    }

    @Test
    @DisplayName("Thêm thành viên: Người thêm không phải thành viên nhóm -> NOT_GROUP_MEMBER")
    void testAddMember_NotGroupMember_ThrowsException() {
        UUID strangerId = UUID.randomUUID();
        UUID newUserId = UUID.randomUUID();
        AddMemberRequest req = new AddMemberRequest();
        req.setUserId(newUserId);

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(strangerId);

            when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
            when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, strangerId)).thenReturn(false);

            AppException ex = assertThrows(AppException.class, () -> groupService.addMember(groupId, req));
            assertEquals(ErrorCode.NOT_GROUP_MEMBER, ex.getErrorCode());
        }
    }

    @Test
    @DisplayName("Thêm thành viên: Người dùng đã trong nhóm -> ALREADY_GROUP_MEMBER")
    void testAddMember_UserAlreadyInGroup_ThrowsException() {
        UUID existingUserId = UUID.randomUUID();
        User existingUser = User.builder().id(existingUserId).name("Da Co").build();
        AddMemberRequest req = new AddMemberRequest();
        req.setUserId(existingUserId);

        try (MockedStatic<SecurityUtils> mockedSecurity = mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
            when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)).thenReturn(true);
            when(userRepository.findById(existingUserId)).thenReturn(Optional.of(existingUser));
            when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, existingUserId)).thenReturn(true);

            AppException ex = assertThrows(AppException.class, () -> groupService.addMember(groupId, req));
            assertEquals(ErrorCode.ALREADY_GROUP_MEMBER, ex.getErrorCode());
        }
    }
}
