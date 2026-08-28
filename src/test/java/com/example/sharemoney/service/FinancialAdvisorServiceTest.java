package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.response.BudgetSummaryResponse;
import com.example.sharemoney.dto.response.FinancialAdviceResponse.*;
import com.example.sharemoney.dto.response.RebalanceApplyResponse;
import com.example.sharemoney.entity.Budget;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FinancialAdvisorServiceTest {

    @Mock private TransactionRepository transactionRepository;

    @Mock private BudgetRepository budgetRepository;

    @Mock private CategoryRepository categoryRepository;

    @Mock private WalletRepository walletRepository;

    @Mock private BudgetService budgetService;

    @Mock private DebtService debtService;

    @Mock private SavingsGoalRepository savingsGoalRepository;

    @InjectMocks private FinancialAdvisorService advisorService;

    private UUID userId;
    private UUID catFoodId;
    private UUID catClothId;
    private UUID catSocialId;
    private UUID catElectricId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        catFoodId = UUID.randomUUID();
        catClothId = UUID.randomUUID();
        catSocialId = UUID.randomUUID();
        catElectricId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Tái cân bằng: Khi không có danh mục nào tiêu lố -> hasOverspending = false")
    void testGenerateRebalancePlan_NoOverspending() {
        BudgetSummaryResponse food =
                BudgetSummaryResponse.builder()
                        .categoryId(catFoodId)
                        .categoryName("Ăn uống")
                        .limitAmount(new BigDecimal("2000000"))
                        .spentAmount(new BigDecimal("1500000"))
                        .build();

        BudgetSummaryResponse social =
                BudgetSummaryResponse.builder()
                        .categoryId(catSocialId)
                        .categoryName("Phí giao lưu")
                        .limitAmount(new BigDecimal("1000000"))
                        .spentAmount(new BigDecimal("800000"))
                        .build();

        RebalancePlan plan = advisorService.generateRebalancePlan(Arrays.asList(food, social));

        assertNotNull(plan);
        assertFalse(plan.isHasOverspending());
        assertEquals(BigDecimal.ZERO, plan.getTotalOverspent());
        assertTrue(plan.getOverspentItems().isEmpty());
        assertTrue(plan.getCompensationCuts().isEmpty());
    }

    @Test
    @DisplayName(
            "Tái cân bằng: Khi có khoản tiêu lố -> Tự động tính toán cắt giảm danh mục linh hoạt để bù vào")
    void testGenerateRebalancePlan_WithOverspending() {
        // Ăn uống: hạn mức 2.000.000, đã chi 2.500.000 -> Tiêu lố 500.000đ
        BudgetSummaryResponse food =
                BudgetSummaryResponse.builder()
                        .categoryId(catFoodId)
                        .categoryName("Ăn uống")
                        .limitAmount(new BigDecimal("2000000"))
                        .spentAmount(new BigDecimal("2500000"))
                        .build();

        // Phí giao lưu: hạn mức 1.500.000, đã chi 500.000 -> Còn dư 1.000.000đ (Linh hoạt)
        BudgetSummaryResponse social =
                BudgetSummaryResponse.builder()
                        .categoryId(catSocialId)
                        .categoryName("Phí giao lưu")
                        .limitAmount(new BigDecimal("1500000"))
                        .spentAmount(new BigDecimal("500000"))
                        .build();

        // Tiền điện: hạn mức 1.000.000, đã chi 600.000 -> Còn dư 400.000đ (CỐ ĐỊNH -> KHÔNG CẮT
        // GIẢM)
        BudgetSummaryResponse electric =
                BudgetSummaryResponse.builder()
                        .categoryId(catElectricId)
                        .categoryName("Tiền điện")
                        .limitAmount(new BigDecimal("1000000"))
                        .spentAmount(new BigDecimal("600000"))
                        .build();

        RebalancePlan plan =
                advisorService.generateRebalancePlan(Arrays.asList(food, social, electric));

        assertNotNull(plan);
        assertTrue(plan.isHasOverspending());
        assertEquals(new BigDecimal("500000"), plan.getTotalOverspent());
        assertEquals(1, plan.getOverspentItems().size());
        assertEquals("Ăn uống", plan.getOverspentItems().get(0).getCategoryName());
        assertEquals(
                new BigDecimal("500000"), plan.getOverspentItems().get(0).getOverspentAmount());

        // Kiểm tra phương án cắt giảm: chỉ cắt từ Phí giao lưu, KHÔNG cắt Tiền điện
        assertEquals(1, plan.getCompensationCuts().size());
        CompensateCutItem cut = plan.getCompensationCuts().get(0);
        assertEquals("Phí giao lưu", cut.getCategoryName());
        assertEquals(new BigDecimal("500000"), cut.getSuggestedCutAmount());
        assertEquals(
                new BigDecimal("1000000"),
                cut.getNewSuggestedLimit()); // 1.500.000 - 500.000 = 1.000.000
        assertEquals(new BigDecimal("500000"), plan.getTotalCompensated());
        assertEquals(BigDecimal.ZERO, plan.getRemainingDeficit());
    }

    @Test
    @DisplayName(
            "Tái cân bằng V2: Ưu tiên cắt giảm Tier 1 Luxury (Mua sắm) trước khi đụng vào Tier 2 Basic (Ăn uống)")
    void testGenerateRebalancePlan_TieredPriorityCut() {
        // Tiền nhà (Cố định): hạn mức 2.000.000, đã chi 2.300.000 -> Tiêu lố 300.000đ
        BudgetSummaryResponse house =
                BudgetSummaryResponse.builder()
                        .categoryId(UUID.randomUUID())
                        .categoryName("Tiền nhà")
                        .limitAmount(new BigDecimal("2000000"))
                        .spentAmount(new BigDecimal("2300000"))
                        .build();

        // Mua sắm (Tier 1 Luxury): hạn mức 1.000.000, đã chi 800.000 -> Còn dư 200.000đ
        BudgetSummaryResponse shopping =
                BudgetSummaryResponse.builder()
                        .categoryId(catClothId)
                        .categoryName("Mua sắm")
                        .limitAmount(new BigDecimal("1000000"))
                        .spentAmount(new BigDecimal("800000"))
                        .build();

        // Ăn uống (Tier 2 Basic): hạn mức 2.000.000, đã chi 1.000.000 -> Còn dư 1.000.000đ
        BudgetSummaryResponse food =
                BudgetSummaryResponse.builder()
                        .categoryId(catFoodId)
                        .categoryName("Ăn uống")
                        .limitAmount(new BigDecimal("2000000"))
                        .spentAmount(new BigDecimal("1000000"))
                        .build();

        RebalancePlan plan =
                advisorService.generateRebalancePlan(Arrays.asList(house, shopping, food));

        assertNotNull(plan);
        assertTrue(plan.isHasOverspending());
        assertEquals(new BigDecimal("300000"), plan.getTotalOverspent());

        // Tổng tiền cần bù là 300k:
        // Tier 1 (Mua sắm) còn dư 200k -> Bị cắt 180k (giữ lại 20k buffer để remaining > cutAmount)
        // Tier 2 (Ăn uống) còn dư 1.000k -> Cắt bổ sung 120k phần còn thiếu
        assertEquals(2, plan.getCompensationCuts().size());

        CompensateCutItem shoppingCut =
                plan.getCompensationCuts().stream()
                        .filter(c -> "Mua sắm".equals(c.getCategoryName()))
                        .findFirst()
                        .orElse(null);
        assertNotNull(shoppingCut);
        assertEquals(new BigDecimal("180000"), shoppingCut.getSuggestedCutAmount());
        assertEquals("TIER_1_LUXURY", shoppingCut.getTier());

        CompensateCutItem foodCut =
                plan.getCompensationCuts().stream()
                        .filter(c -> "Ăn uống".equals(c.getCategoryName()))
                        .findFirst()
                        .orElse(null);
        assertNotNull(foodCut);
        assertEquals(new BigDecimal("120000"), foodCut.getSuggestedCutAmount());
        assertEquals("TIER_2_BASIC", foodCut.getTier());

        assertEquals(new BigDecimal("300000"), plan.getTotalCompensated());
        assertEquals(BigDecimal.ZERO, plan.getRemainingDeficit());
    }

    @Test
    @DisplayName("Thực thi Tái cân bằng: Hỗ trợ Custom Override từ Client")
    void testApplyRebalance_WithCustomOverride() {
        com.example.sharemoney.dto.request.RebalanceApplyRequest request =
                com.example.sharemoney.dto.request.RebalanceApplyRequest.builder()
                        .cuts(
                                Collections.singletonList(
                                        com.example.sharemoney.dto.request.RebalanceApplyRequest
                                                .RebalanceCutOverride.builder()
                                                .categoryId(catSocialId.toString())
                                                .cutAmount(new BigDecimal("150000"))
                                                .newLimit(new BigDecimal("850000"))
                                                .build()))
                        .build();

        BudgetSummaryResponse food =
                BudgetSummaryResponse.builder()
                        .categoryId(catFoodId)
                        .categoryName("Ăn uống")
                        .limitAmount(new BigDecimal("2000000"))
                        .spentAmount(new BigDecimal("2300000"))
                        .build();

        when(budgetService.getBudgetSummary(userId, 2026, 8))
                .thenReturn(Collections.singletonList(food));

        Budget existingSocialBudget = new Budget();
        existingSocialBudget.setLimitAmount(new BigDecimal("1000000"));
        existingSocialBudget.setMonth(8);
        existingSocialBudget.setYear(2026);

        when(budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                        userId, catSocialId, 8, 2026))
                .thenReturn(List.of(existingSocialBudget));

        RebalanceApplyResponse response = advisorService.applyRebalance(userId, 2026, 8, request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(new BigDecimal("150000"), response.getTotalCompensated());
        assertEquals(1, response.getUpdatedCategoriesCount());
        verify(budgetRepository, times(1)).save(existingSocialBudget);
        assertEquals(new BigDecimal("850000"), existingSocialBudget.getLimitAmount());
    }
}
