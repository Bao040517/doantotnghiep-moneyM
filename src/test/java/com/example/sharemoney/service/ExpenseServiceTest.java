package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.CreateExpenseRequest;
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
 * Unit tests cho ExpenseService — kiểm tra thuật toán chia tiền (equal/custom), sửa/xóa expense, và
 * event publishing.
 */
@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock private ExpenseRepository expenseRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private GroupMemberRepository groupMemberRepository;
    @Mock private UserRepository userRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks private ExpenseService expenseService;

    private UUID groupId, userAId, userBId, userCId;
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

    private void mockGroupAndMembers() {
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(group));
        when(groupMemberRepository.existsByGroup_IdAndUser_Id(eq(groupId), any())).thenReturn(true);
        when(userRepository.findById(userAId)).thenReturn(Optional.of(userA));
        when(userRepository.findById(userBId)).thenReturn(Optional.of(userB));
        when(userRepository.findById(userCId)).thenReturn(Optional.of(userC));
    }

    private CreateExpenseRequest buildExpenseRequest(BigDecimal amount, List<UUID> splitUserIds) {
        CreateExpenseRequest req = new CreateExpenseRequest();
        req.setAmount(amount);
        req.setTitle("Test Expense");
        req.setCategory("Ăn uống");
        req.setPaidBy(userAId);
        req.setSplitUserIds(splitUserIds);
        return req;
    }

    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Test 1: 300k ÷ 3 = 100k mỗi người (equal split)")
    void testCreateExpense_EqualSplit() {
        mockGroupAndMembers();
        when(expenseRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Expense e = inv.getArgument(0);
                            try {
                                var idField = Expense.class.getDeclaredField("id");
                                idField.setAccessible(true);
                                idField.set(e, UUID.randomUUID());
                            } catch (Exception ignored) {
                            }
                            return e;
                        });

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("300000"), List.of(userAId, userBId, userCId));

        var result = expenseService.createExpense(groupId, req, userAId);

        assertNotNull(result);
        assertEquals(3, result.getSplits().size());

        // Tất cả split phải bằng 100k
        for (var split : result.getSplits()) {
            assertEquals(0, new BigDecimal("100000").compareTo(split.getAmountOwed()));
        }
    }

    @Test
    @DisplayName("Test 2: 100k ÷ 3 → phần dư +1 vào người đầu tiên")
    void testCreateExpense_EqualSplit_Remainder() {
        mockGroupAndMembers();
        when(expenseRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Expense e = inv.getArgument(0);
                            try {
                                var idField = Expense.class.getDeclaredField("id");
                                idField.setAccessible(true);
                                idField.set(e, UUID.randomUUID());
                            } catch (Exception ignored) {
                            }
                            return e;
                        });

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("100000"), List.of(userAId, userBId, userCId));

        var result = expenseService.createExpense(groupId, req, userAId);

        assertEquals(3, result.getSplits().size());

        // Tổng phải bằng đúng 100k (kiểm tra không mất tiền do làm tròn)
        BigDecimal total =
                result.getSplits().stream()
                        .map(s -> s.getAmountOwed())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("100000").compareTo(total));
    }

    @Test
    @DisplayName("Test 3: Custom split — A=50k, B=30k, C=20k")
    void testCreateExpense_CustomSplit() {
        mockGroupAndMembers();
        when(expenseRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Expense e = inv.getArgument(0);
                            try {
                                var idField = Expense.class.getDeclaredField("id");
                                idField.setAccessible(true);
                                idField.set(e, UUID.randomUUID());
                            } catch (Exception ignored) {
                            }
                            return e;
                        });

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("100000"), List.of(userAId, userBId, userCId));

        // Custom amounts
        Map<UUID, BigDecimal> splitAmounts = new HashMap<>();
        splitAmounts.put(userAId, new BigDecimal("50000"));
        splitAmounts.put(userBId, new BigDecimal("30000"));
        splitAmounts.put(userCId, new BigDecimal("20000"));
        req.setSplitAmounts(splitAmounts);

        var result = expenseService.createExpense(groupId, req, userAId);

        assertEquals(3, result.getSplits().size());

        // Tổng custom = 100k
        BigDecimal total =
                result.getSplits().stream()
                        .map(s -> s.getAmountOwed())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("100000").compareTo(total));
    }

    @Test
    @DisplayName("Test 4: Custom split tổng ≠ amount → CUSTOM_SPLIT_MISMATCH")
    void testCreateExpense_CustomSplit_Mismatch() {
        mockGroupAndMembers();

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("100000"), List.of(userBId, userCId));

        Map<UUID, BigDecimal> splitAmounts = new HashMap<>();
        splitAmounts.put(userBId, new BigDecimal("60000"));
        splitAmounts.put(userCId, new BigDecimal("50000")); // Tổng = 110k ≠ 100k
        req.setSplitAmounts(splitAmounts);

        AppException ex =
                assertThrows(
                        AppException.class,
                        () -> expenseService.createExpense(groupId, req, userAId));
        assertEquals(ErrorCode.CUSTOM_SPLIT_MISMATCH, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 5: Sửa expense đã settled → EXPENSE_ALREADY_SETTLED")
    void testUpdateExpense_AlreadySettled() {
        UUID expenseId = UUID.randomUUID();

        ExpenseSplit settledSplit =
                ExpenseSplit.builder()
                        .id(UUID.randomUUID())
                        .user(userB)
                        .amountOwed(new BigDecimal("50000"))
                        .isSettled(true) // Đã thanh toán
                        .build();

        Expense expense =
                Expense.builder()
                        .id(expenseId)
                        .group(group)
                        .payer(userA)
                        .title("Test")
                        .amount(new BigDecimal("100000"))
                        .category("Ăn uống")
                        .build();
        expense.getSplits().add(settledSplit);

        when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(expense));

        com.example.sharemoney.dto.request.UpdateExpenseRequest req =
                new com.example.sharemoney.dto.request.UpdateExpenseRequest();
        req.setAmount(new BigDecimal("200000"));
        req.setTitle("Updated");
        req.setPaidBy(userAId);

        AppException ex =
                assertThrows(
                        AppException.class,
                        () -> expenseService.updateExpense(groupId, expenseId, req, userAId));
        assertEquals(ErrorCode.EXPENSE_ALREADY_SETTLED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 6: Xóa SETTLEMENT expense → CANNOT_MODIFY_SYSTEM_EXPENSE")
    void testDeleteExpense_SystemExpense_Blocked() {
        UUID expenseId = UUID.randomUUID();
        Expense expense =
                Expense.builder()
                        .id(expenseId)
                        .group(group)
                        .payer(userA)
                        .title("Settlement")
                        .amount(new BigDecimal("100000"))
                        .category("SETTLEMENT") // System expense
                        .build();

        when(groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userAId)).thenReturn(true);
        when(expenseRepository.findById(expenseId)).thenReturn(Optional.of(expense));

        AppException ex =
                assertThrows(
                        AppException.class,
                        () -> expenseService.deleteExpense(groupId, expenseId, userAId));
        assertEquals(ErrorCode.CANNOT_MODIFY_SYSTEM_EXPENSE, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 7: Tạo expense → event được publish")
    void testCreateExpense_PublishesEvent() {
        mockGroupAndMembers();
        when(expenseRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Expense e = inv.getArgument(0);
                            try {
                                var idField = Expense.class.getDeclaredField("id");
                                idField.setAccessible(true);
                                idField.set(e, UUID.randomUUID());
                            } catch (Exception ignored) {
                            }
                            return e;
                        });

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("300000"), List.of(userBId, userCId));

        expenseService.createExpense(groupId, req, userAId);

        // Verify event published (cho PfmEventListener)
        verify(eventPublisher)
                .publishEvent(any(com.example.sharemoney.event.ExpenseCreatedEvent.class));
    }

    @Test
    @DisplayName("Test 8: Tạo expense với linkedTransactionId → không publish event")
    void testCreateExpense_LinkedTransaction_NoEvent() {
        mockGroupAndMembers();

        UUID linkedTxId = UUID.randomUUID();
        Wallet payerWallet = Wallet.builder().id(UUID.randomUUID()).user(userA).build();
        Transaction linkedTx =
                Transaction.builder()
                        .id(linkedTxId)
                        .wallet(payerWallet)
                        .amount(new BigDecimal("300000"))
                        .build();

        when(transactionRepository.findById(linkedTxId)).thenReturn(Optional.of(linkedTx));
        when(expenseRepository.save(any()))
                .thenAnswer(
                        inv -> {
                            Expense e = inv.getArgument(0);
                            try {
                                var idField = Expense.class.getDeclaredField("id");
                                idField.setAccessible(true);
                                idField.set(e, UUID.randomUUID());
                            } catch (Exception ignored) {
                            }
                            return e;
                        });

        CreateExpenseRequest req =
                buildExpenseRequest(new BigDecimal("300000"), List.of(userBId, userCId));
        req.setLinkedTransactionId(linkedTxId);

        expenseService.createExpense(groupId, req, userAId);

        // KHÔNG publish event vì transaction đã có sẵn
        verify(eventPublisher, never())
                .publishEvent(any(com.example.sharemoney.event.ExpenseCreatedEvent.class));
    }
}
