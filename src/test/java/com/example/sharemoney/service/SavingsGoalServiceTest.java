package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.FundSavingsGoalRequest;
import com.example.sharemoney.dto.request.SavingsGoalRequest;
import com.example.sharemoney.dto.response.AutoAllocateResponse;
import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.dto.response.SavingsGoalResponse;
import com.example.sharemoney.dto.response.UserDebtSummaryResponse;
import com.example.sharemoney.entity.*;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SavingsGoalServiceTest {

    @Mock private SavingsGoalRepository savingsGoalRepository;
    @Mock private UserRepository userRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private CategoryService categoryService;
    @Mock private NotificationService notificationService;
    @Mock private BudgetService budgetService;
    @Mock private DebtService debtService;

    @InjectMocks private SavingsGoalService savingsGoalService;

    private UUID userId;
    private User user;
    private Wallet wallet;
    private SavingsGoal goal;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder().id(userId).name("Test User").email("test@example.com").build();
        wallet = Wallet.builder().id(UUID.randomUUID()).user(user).name("Ví chính").balance(new BigDecimal("10000000")).isLiability(false).build();
        goal = SavingsGoal.builder().id(UUID.randomUUID()).user(user).name("Mua Macbook").targetAmount(new BigDecimal("20000000")).currentAmount(new BigDecimal("5000000")).status(SavingsGoalStatus.IN_PROGRESS).build();
    }

    @Test
    void testGetUserSavingsGoals_Success() {
        when(savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId)).thenReturn(List.of(goal));

        List<SavingsGoalResponse> responses = savingsGoalService.getUserSavingsGoals(userId);

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals("Mua Macbook", responses.get(0).getName());
    }

    @Test
    void testCreateSavingsGoal_Success() {
        SavingsGoalRequest req = new SavingsGoalRequest();
        req.setName("Đi du lịch");
        req.setTargetAmount(new BigDecimal("15000000"));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(savingsGoalRepository.save(any(SavingsGoal.class))).thenAnswer(i -> i.getArgument(0));

        SavingsGoalResponse resp = savingsGoalService.createSavingsGoal(userId, req);

        assertNotNull(resp);
        assertEquals("Đi du lịch", resp.getName());
    }

    @Test
    void testAutoAllocateSavingsGoals_Success() {
        when(budgetService.getBudgetSummary(eq(userId), anyInt(), anyInt())).thenReturn(Collections.emptyList());
        when(debtService.getUserDebtSummary(userId)).thenReturn(UserDebtSummaryResponse.builder().totalOwing(BigDecimal.ZERO).totalOwed(BigDecimal.ZERO).build());
        when(walletRepository.sumBalanceByUserId(userId)).thenReturn(new BigDecimal("10000000"));
        when(savingsGoalRepository.findByUser_IdOrderByCreatedAtDesc(userId)).thenReturn(List.of(goal));
        when(walletRepository.findByUser_IdAndIsLiability(userId, false)).thenReturn(List.of(wallet));
        when(walletRepository.findById(any())).thenReturn(Optional.of(wallet));
        when(categoryService.getOrCreateCategory(any(), anyString(), any(), anyString()))
                .thenReturn(Category.builder().id(UUID.randomUUID()).name("Mục tiêu tiết kiệm").type(TransactionType.EXPENSE).build());

        AutoAllocateResponse resp = savingsGoalService.autoAllocateSavingsGoals(userId);

        assertNotNull(resp);
        assertTrue(resp.getTotalAllocated().compareTo(BigDecimal.ZERO) > 0);
        assertEquals(1, resp.getAllocatedGoals().size());
    }

    @Test
    void testAutoAllocateSavingsGoals_SafetyReserveViolation_ThrowsException() {
        // Mock requiredReserve (unpaid budget 12.000.000) > wallet balance (10.000.000)
        BudgetSummaryResponse b = BudgetSummaryResponse.builder().limitAmount(new BigDecimal("15000000")).spentAmount(new BigDecimal("3000000")).build();
        when(budgetService.getBudgetSummary(eq(userId), anyInt(), anyInt())).thenReturn(List.of(b));
        when(debtService.getUserDebtSummary(userId)).thenReturn(UserDebtSummaryResponse.builder().totalOwing(new BigDecimal("2000000")).totalOwed(BigDecimal.ZERO).build());
        when(walletRepository.sumBalanceByUserId(userId)).thenReturn(new BigDecimal("10000000"));

        AppException ex = assertThrows(AppException.class, () -> savingsGoalService.autoAllocateSavingsGoals(userId));
        assertEquals(ErrorCode.SAFETY_RESERVE_VIOLATION, ex.getErrorCode());
    }
}
