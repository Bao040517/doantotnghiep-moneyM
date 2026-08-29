package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.SavePayeeRequest;
import com.example.sharemoney.dto.response.PayeeResponse;
import com.example.sharemoney.entity.Group;
import com.example.sharemoney.entity.GroupMember;
import com.example.sharemoney.entity.Payee;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.PayeeRepository;
import com.example.sharemoney.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PayeeServiceTest {

    @Mock private PayeeRepository payeeRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupMemberRepository groupMemberRepository;

    @InjectMocks private PayeeService payeeService;

    private UUID userId;
    private User user;
    private Payee payee;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .name("Nguyen Van A")
                .email("vana@example.com")
                .build();

        payee = Payee.builder()
                .id(UUID.randomUUID())
                .user(user)
                .name("Tran Thi B")
                .bankBin("970436")
                .bankName("Vietcombank")
                .bankAccount("123456789")
                .accountName("TRAN THI B")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách người nhận đã lưu")
    void testGetPayees_Success() {
        when(payeeRepository.findByUser_IdOrderByCreatedAtDesc(userId)).thenReturn(List.of(payee));

        List<PayeeResponse> responses = payeeService.getPayees(userId);

        assertEquals(1, responses.size());
        assertEquals("Tran Thi B", responses.get(0).getName());
        assertEquals("123456789", responses.get(0).getBankAccount());
        assertEquals("saved", responses.get(0).getSource());
    }

    @Test
    @DisplayName("Gợi ý người nhận thông minh: Kết hợp danh bạ lưu và thành viên nhóm")
    void testGetSuggestions_CombinesSavedAndGroupMembers() {
        UUID friendId = UUID.randomUUID();
        User friend = User.builder()
                .id(friendId)
                .name("Le Van C")
                .bankBin("970422")
                .bankAccountNo("99998888")
                .build();

        Group group = Group.builder().id(UUID.randomUUID()).name("Nhóm Test").build();
        GroupMember myMembership = GroupMember.builder().id(UUID.randomUUID()).group(group).user(user).build();
        GroupMember friendMembership = GroupMember.builder().id(UUID.randomUUID()).group(group).user(friend).build();

        when(payeeRepository.findByUser_IdOrderByCreatedAtDesc(userId)).thenReturn(List.of(payee));
        when(groupMemberRepository.findByUser_Id(userId)).thenReturn(List.of(myMembership));
        when(groupMemberRepository.findByGroup_Id(group.getId())).thenReturn(List.of(myMembership, friendMembership));

        List<PayeeResponse> suggestions = payeeService.getSuggestions(userId);

        assertEquals(2, suggestions.size());
        assertTrue(suggestions.stream().anyMatch(s -> "saved".equals(s.getSource()) && "123456789".equals(s.getBankAccount())));
        assertTrue(suggestions.stream().anyMatch(s -> "group_member".equals(s.getSource()) && "99998888".equals(s.getBankAccount())));
    }

    @Test
    @DisplayName("Lưu người nhận mới khi chưa tồn tại STK")
    void testSaveOrUpdate_CreatesNewWhenNotFound() {
        SavePayeeRequest req = new SavePayeeRequest();
        req.setName("Hoang Van D");
        req.setBankBin("970415");
        req.setBankName("VietinBank");
        req.setBankAccount("000111222");
        req.setAccountName("HOANG VAN D");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(payeeRepository.findByUser_IdAndBankAccount(userId, "000111222")).thenReturn(Optional.empty());
        when(payeeRepository.save(any(Payee.class))).thenAnswer(inv -> inv.getArgument(0));

        PayeeResponse response = payeeService.saveOrUpdate(userId, req);

        assertNotNull(response);
        assertEquals("Hoang Van D", response.getName());
        assertEquals("000111222", response.getBankAccount());
        verify(payeeRepository).save(any(Payee.class));
    }

    @Test
    @DisplayName("Cập nhật thông tin người nhận khi đã có STK")
    void testSaveOrUpdate_UpdatesExistingWhenFound() {
        SavePayeeRequest req = new SavePayeeRequest();
        req.setName("Tran Thi B Da Sua");
        req.setBankBin("970436");
        req.setBankAccount("123456789");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(payeeRepository.findByUser_IdAndBankAccount(userId, "123456789")).thenReturn(Optional.of(payee));
        when(payeeRepository.save(any(Payee.class))).thenAnswer(inv -> inv.getArgument(0));

        PayeeResponse response = payeeService.saveOrUpdate(userId, req);

        assertNotNull(response);
        assertEquals("Tran Thi B Da Sua", response.getName());
        verify(payeeRepository).save(payee);
    }

    @Test
    @DisplayName("Xóa người nhận: Thành công")
    void testDelete_Success() {
        UUID payeeId = payee.getId();
        when(payeeRepository.findById(payeeId)).thenReturn(Optional.of(payee));

        assertDoesNotThrow(() -> payeeService.delete(userId, payeeId));
        verify(payeeRepository).delete(payee);
    }

    @Test
    @DisplayName("Xóa người nhận: Không tìm thấy -> PAYEE_NOT_FOUND")
    void testDelete_NotFound_ThrowsException() {
        UUID randomPayeeId = UUID.randomUUID();
        when(payeeRepository.findById(randomPayeeId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> payeeService.delete(userId, randomPayeeId));
        assertEquals(ErrorCode.PAYEE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Xóa người nhận: Không thuộc sở hữu của User -> UNAUTHORIZED")
    void testDelete_Unauthorized_ThrowsException() {
        UUID otherUserId = UUID.randomUUID();
        UUID payeeId = payee.getId();
        when(payeeRepository.findById(payeeId)).thenReturn(Optional.of(payee));

        AppException ex = assertThrows(AppException.class, () -> payeeService.delete(otherUserId, payeeId));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }
}
