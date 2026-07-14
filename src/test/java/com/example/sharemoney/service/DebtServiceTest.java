package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.entity.*;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests cho DebtService — tập trung vào thuật toán Greedy Settlement.
 * Đây là logic quan trọng nhất (tính toán nợ chéo).
 */
@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock private ExpenseSplitRepository expenseSplitRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private UserRepository userRepository;
    @Mock private VietQrService vietQrService;
    @Mock private NotificationService notificationService;
    @Mock private com.example.sharemoney.repository.ExpenseRepository expenseRepository;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Mock private PaymentRepository paymentRepository;

    @InjectMocks
    private DebtService debtService;

    private UUID groupId;
    private UUID userAId, userBId, userCId;
    private User userA, userB, userC;
    private Group group;

    @BeforeEach
    void setUp() {
        groupId = UUID.randomUUID();
        userAId = UUID.randomUUID();
        userBId = UUID.randomUUID();
        userCId = UUID.randomUUID();

        userA = User.builder().id(userAId).name("A").email("a@test.com").passwordHash("x").build();
        userB = User.builder().id(userBId).name("B").email("b@test.com").passwordHash("x").build();
        userC = User.builder().id(userCId).name("C").email("c@test.com").passwordHash("x").build();

        group = Group.builder().id(groupId).name("Test Group").build();
    }

    // ─── Helper: tạo ExpenseSplit giả ───
    private ExpenseSplit createSplit(User payer, User debtor, BigDecimal amount) {
        Expense expense = Expense.builder()
                .id(UUID.randomUUID())
                .group(group)
                .payer(payer)
                .title("Test Expense")
                .amount(amount)
                .build();

        return ExpenseSplit.builder()
                .id(UUID.randomUUID())
                .expense(expense)
                .user(debtor)
                .amountOwed(amount)
                .isSettled(false)
                .build();
    }

    private void mockGroupExists() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
    }

    private void mockMembership(UUID userId) {
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)).thenReturn(true);
    }

    private void mockAllMembers(User... users) {
        List<GroupMember> members = new ArrayList<>();
        for (User u : users) {
            GroupMember gm = GroupMember.builder().user(u).group(group).build();
            members.add(gm);
        }
        when(groupMemberRepository.findByGroup_Id(groupId)).thenReturn(members);
    }

    // ═══════════════════════════════════════════════════════════
    // TEST CASES
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Test 1: A trả 100k cho B → B nợ A 100k → 1 giao dịch")
    void testSimpleTwoPersonDebt() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB);

        // A trả 100k, B nợ A 100k
        ExpenseSplit split = createSplit(userA, userB, new BigDecimal("100000"));
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(List.of(split));

        var result = debtService.calculateGroupDebts(groupId, userAId);

        assertNotNull(result);
        assertEquals(groupId, result.getGroupId());
        assertEquals(1, result.getTransactions().size());

        var tx = result.getTransactions().get(0);
        assertEquals(userBId, tx.getFrom().getId()); // B trả
        assertEquals(userAId, tx.getTo().getId());   // cho A
        assertEquals(0, new BigDecimal("100000").compareTo(tx.getAmount()));
    }

    @Test
    @DisplayName("Test 2: A trả 150k chia 3 → B nợ 50k, C nợ 50k → 2 giao dịch")
    void testThreePersonDebt_OnePayerTwoDebtors() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB, userC);

        // A trả 150k, chia đều → B nợ 50k, C nợ 50k
        ExpenseSplit splitB = createSplit(userA, userB, new BigDecimal("50000"));
        ExpenseSplit splitC = createSplit(userA, userC, new BigDecimal("50000"));
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(List.of(splitB, splitC));

        var result = debtService.calculateGroupDebts(groupId, userAId);

        assertEquals(2, result.getTransactions().size());

        // Tổng tiền trả phải bằng 100k
        BigDecimal totalPayment = result.getTransactions().stream()
                .map(t -> t.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("100000").compareTo(totalPayment));
    }

    @Test
    @DisplayName("Test 3: Nợ chéo — Greedy tối ưu: A=-100k, B=-50k, C=+150k → 2 giao dịch")
    void testCrossDebt_GreedyMinimizes() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB, userC);

        // C trả 150k → A nợ 100k, B nợ 50k
        ExpenseSplit splitA = createSplit(userC, userA, new BigDecimal("100000"));
        ExpenseSplit splitB = createSplit(userC, userB, new BigDecimal("50000"));
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(List.of(splitA, splitB));

        var result = debtService.calculateGroupDebts(groupId, userAId);

        // Greedy nên tạo 2 giao dịch: A→C 100k, B→C 50k
        assertEquals(2, result.getTransactions().size());

        // Tất cả đều trả cho C
        for (var tx : result.getTransactions()) {
            assertEquals(userCId, tx.getTo().getId());
        }
    }

    @Test
    @DisplayName("Test 4: Tất cả đã settled → 0 giao dịch")
    void testAllSettled_NoTransactions() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB);

        // Không có split chưa thanh toán
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(Collections.emptyList());

        var result = debtService.calculateGroupDebts(groupId, userAId);

        assertNotNull(result);
        assertTrue(result.getTransactions().isEmpty());
    }

    @Test
    @DisplayName("Test 5: Sai số làm tròn < 0.01 → bỏ qua")
    void testEpsilonRounding() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB);

        // Tạo nợ rất nhỏ (0.005 đồng — dưới epsilon)
        ExpenseSplit split = createSplit(userA, userB, new BigDecimal("0.005"));
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(List.of(split));

        var result = debtService.calculateGroupDebts(groupId, userAId);

        // Nợ dưới epsilon phải bị bỏ qua
        assertTrue(result.getTransactions().isEmpty());
    }

    @Test
    @DisplayName("Test 6: Net Balance tính đúng — payer được cộng, debtor bị trừ")
    void testCalculateNetBalances() {
        mockGroupExists();
        mockMembership(userAId);
        mockAllMembers(userA, userB, userC);

        // A trả 300k → B nợ 100k, C nợ 200k
        ExpenseSplit splitB = createSplit(userA, userB, new BigDecimal("100000"));
        ExpenseSplit splitC = createSplit(userA, userC, new BigDecimal("200000"));
        when(expenseSplitRepository.findByExpense_Group_IdAndIsSettledFalse(groupId))
                .thenReturn(List.of(splitB, splitC));

        var result = debtService.calculateGroupDebts(groupId, userAId);

        // Kiểm tra memberBalances
        var balances = result.getMemberBalances();
        assertEquals(3, balances.size());

        // Tìm balance của A (creditor: +300k)
        var balanceA = balances.stream()
                .filter(b -> b.getUser().getId().equals(userAId))
                .findFirst().orElseThrow();
        assertTrue(balanceA.getBalance().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("Test 7: Không phải thành viên nhóm → FORBIDDEN")
    void testNotGroupMember_ThrowsException() {
        mockGroupExists();
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userAId)).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> debtService.calculateGroupDebts(groupId, userAId));
        assertEquals(ErrorCode.NOT_GROUP_MEMBER, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 8: Nhóm không tồn tại → NOT_FOUND")
    void testGroupNotFound_ThrowsException() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> debtService.calculateGroupDebts(groupId, userAId));
        assertEquals(ErrorCode.GROUP_NOT_FOUND, ex.getErrorCode());
    }
}
