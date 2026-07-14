package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.SetBudgetRequest;
import com.example.sharemoney.entity.*;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests cho BudgetService — kiểm tra CRUD budget, recurring, status calculation.
 */
@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock private BudgetRepository budgetRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private UserRepository userRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private SavingsGoalRepository savingsGoalRepository;

    @InjectMocks
    private BudgetService budgetService;

    private UUID userId, categoryId;
    private User user;
    private Category category;
    private int currentMonth, currentYear;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        categoryId = UUID.randomUUID();

        user = User.builder().id(userId).name("TestUser").email("test@test.com").passwordHash("x").build();
        category = Category.builder()
                .id(categoryId)
                .name("Ăn uống")
                .type(TransactionType.EXPENSE)
                .iconName("🍔")
                .user(user)
                .build();

        currentMonth = LocalDate.now().getMonthValue();
        currentYear = LocalDate.now().getYear();
    }

    private SetBudgetRequest buildBudgetRequest(BigDecimal limit) {
        SetBudgetRequest req = new SetBudgetRequest();
        req.setCategoryId(categoryId);
        req.setLimitAmount(limit);
        req.setName("Budget ăn uống");
        req.setMonth(currentMonth);
        req.setYear(currentYear);
        req.setType("FLEXIBLE");
        return req;
    }

    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Test 1: Tạo mới budget → thành công")
    void testSetBudget_CreateNew() {
        SetBudgetRequest req = buildBudgetRequest(new BigDecimal("2000000"));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(budgetRepository.save(any())).thenAnswer(inv -> {
            Budget b = inv.getArgument(0);
            try {
                var idField = Budget.class.getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(b, UUID.randomUUID());
            } catch (Exception ignored) {}
            return b;
        });
        when(transactionRepository.sumExpenseByCategoryAndMonth(userId, categoryId, currentYear, currentMonth))
                .thenReturn(BigDecimal.ZERO);

        var result = budgetService.setBudget(userId, req);

        assertNotNull(result);
        assertEquals("Budget ăn uống", result.getName());
        assertEquals(0, new BigDecimal("2000000").compareTo(result.getLimitAmount()));
        assertEquals(0, result.getPercentage());
        assertEquals("OK", result.getStatus());
    }

    @Test
    @DisplayName("Test 2: Cập nhật budget có sẵn")
    void testSetBudget_UpdateExisting() {
        UUID budgetId = UUID.randomUUID();
        Budget existing = Budget.builder()
                .id(budgetId)
                .user(user)
                .category(category)
                .limitAmount(new BigDecimal("1000000"))
                .name("Budget cũ")
                .month(currentMonth)
                .year(currentYear)
                .type(BudgetType.FLEXIBLE)
                .build();

        SetBudgetRequest req = buildBudgetRequest(new BigDecimal("3000000"));
        req.setId(budgetId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(budgetRepository.findById(budgetId)).thenReturn(Optional.of(existing));
        when(budgetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.sumExpenseByCategoryAndMonth(userId, categoryId, currentYear, currentMonth))
                .thenReturn(new BigDecimal("500000"));

        var result = budgetService.setBudget(userId, req);

        assertNotNull(result);
        assertEquals(0, new BigDecimal("3000000").compareTo(result.getLimitAmount()));
    }

    @Test
    @DisplayName("Test 3: Cập nhật budget của người khác → UNAUTHORIZED")
    void testSetBudget_UnauthorizedUser() {
        UUID budgetId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        User otherUser = User.builder().id(otherUserId).name("Other").email("other@test.com").passwordHash("x").build();

        Budget existing = Budget.builder()
                .id(budgetId)
                .user(otherUser) // Budget thuộc user khác
                .category(category)
                .limitAmount(new BigDecimal("1000000"))
                .month(currentMonth)
                .year(currentYear)
                .type(BudgetType.FLEXIBLE)
                .build();

        SetBudgetRequest req = buildBudgetRequest(new BigDecimal("2000000"));
        req.setId(budgetId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(budgetRepository.findById(budgetId)).thenReturn(Optional.of(existing));

        AppException ex = assertThrows(AppException.class,
                () -> budgetService.setBudget(userId, req));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 4: Xóa budget → thành công")
    void testDeleteBudget() {
        UUID budgetId = UUID.randomUUID();
        Budget budget = Budget.builder()
                .id(budgetId)
                .user(user)
                .category(category)
                .limitAmount(new BigDecimal("1000000"))
                .month(currentMonth)
                .year(currentYear)
                .type(BudgetType.FLEXIBLE)
                .build();

        when(budgetRepository.findById(budgetId)).thenReturn(Optional.of(budget));

        assertDoesNotThrow(() -> budgetService.deleteBudget(userId, budgetId));
        verify(budgetRepository).delete(budget);
    }

    @Test
    @DisplayName("Test 5: Budget recurring → tự nhân bản sang tháng mới")
    void testGetBudgetSummary_WithRecurring() {
        int prevMonth = currentMonth == 1 ? 12 : currentMonth - 1;
        int prevYear = currentMonth == 1 ? currentYear - 1 : currentYear;

        Budget recurringBudget = Budget.builder()
                .id(UUID.randomUUID())
                .user(user)
                .category(category)
                .limitAmount(new BigDecimal("2000000"))
                .name("Budget monthly")
                .month(prevMonth)
                .year(prevYear)
                .type(BudgetType.FLEXIBLE)
                .isRecurring(true)
                .build();

        // Tháng trước có budget recurring, tháng này chưa có
        when(budgetRepository.findByUser_IdAndMonthAndYear(userId, prevMonth, prevYear))
                .thenReturn(List.of(recurringBudget));
        when(budgetRepository.findByUser_IdAndMonthAndYear(userId, currentMonth, currentYear))
                .thenReturn(new ArrayList<>()); // Chưa có budget tháng này
        when(budgetRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Budget b = inv.getArgument(0);
            try {
                var idField = Budget.class.getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(b, UUID.randomUUID());
            } catch (Exception ignored) {}
            return b;
        });
        when(transactionRepository.sumExpenseByCategoryAndMonth(eq(userId), eq(categoryId), anyInt(), anyInt()))
                .thenReturn(BigDecimal.ZERO);

        var result = budgetService.getBudgetSummary(userId, currentYear, currentMonth);

        // Budget từ tháng trước phải được clone sang tháng này
        assertFalse(result.isEmpty());
        verify(budgetRepository).saveAndFlush(any(Budget.class));
    }

    @Test
    @DisplayName("Test 6: Budget status — OK/WARNING/OVER theo percentage")
    void testBudgetStatus_OK_WARNING_OVER() {
        UUID budgetId = UUID.randomUUID();
        Budget budget = Budget.builder()
                .id(budgetId)
                .user(user)
                .category(category)
                .limitAmount(new BigDecimal("1000000")) // 1 triệu
                .name("Test status")
                .month(currentMonth)
                .year(currentYear)
                .type(BudgetType.FLEXIBLE)
                .build();

        // Trường hợp OK (50%)
        when(budgetRepository.findByUser_IdAndMonthAndYear(userId, currentMonth - 1 == 0 ? 12 : currentMonth - 1,
                currentMonth - 1 == 0 ? currentYear - 1 : currentYear))
                .thenReturn(Collections.emptyList());
        when(budgetRepository.findByUser_IdAndMonthAndYear(userId, currentMonth, currentYear))
                .thenReturn(List.of(budget));
        when(transactionRepository.sumExpenseByCategoryAndMonth(userId, categoryId, currentYear, currentMonth))
                .thenReturn(new BigDecimal("500000")); // 50%

        var results = budgetService.getBudgetSummary(userId, currentYear, currentMonth);
        assertEquals(1, results.size());
        assertEquals("OK", results.get(0).getStatus());
        assertEquals(50, results.get(0).getPercentage());
    }

    @Test
    @DisplayName("Test 7: Safe-to-Spend tính đúng công thức")
    void testSafeToSpend_Calculation() {
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.INCOME), any(), any()))
                .thenReturn(new BigDecimal("10000000")); // Thu nhập 10 triệu
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.EXPENSE), any(), any()))
                .thenReturn(new BigDecimal("3000000")); // Chi tiêu 3 triệu (tất cả flexible)
        when(budgetRepository.findByUser_IdAndMonthAndYear(eq(userId), anyInt(), anyInt()))
                .thenReturn(Collections.emptyList()); // Không có bill

        var result = budgetService.getSafeToSpend(userId, currentYear, currentMonth);

        assertNotNull(result);
        assertEquals(0, new BigDecimal("10000000").compareTo(result.getTotalIncome()));
        // Raw safe = 10M - 0 (bills) - 3M (flexible) = 7M
        // Savings = 7M * 0.4 = 2.8M
        // Safe total = 7M - 2.8M = 4.2M
        assertEquals(0, new BigDecimal("4200000.00").compareTo(result.getSafeBalanceTotal()));
        assertTrue(result.getDaysLeft() > 0);
    }
}
