package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.example.sharemoney.dto.request.AiAssistantRequest;
import com.example.sharemoney.dto.response.AiAssistantResponse;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.SavingsGoalRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiAssistantServiceTest {

    @Mock private UserRepository userRepository;

    @Mock private TransactionRepository transactionRepository;

    @Mock private CategoryRepository categoryRepository;

    @Mock private WalletRepository walletRepository;

    @Mock private BudgetRepository budgetRepository;

    @Mock private SavingsGoalRepository savingsGoalRepository;

    @InjectMocks private AiAssistantService aiAssistantService;

    private UUID userId;
    private Category foodCategory;
    private Category transportCategory;
    private Category shoppingCategory;
    private Category salaryCategory;
    private Wallet mainWallet;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        // Tắt API key để kiểm thử logic Heuristic Fallback engine
        ReflectionTestUtils.setField(aiAssistantService, "apiKey", "");

        foodCategory =
                Category.builder()
                        .id(UUID.randomUUID())
                        .name("Ăn uống")
                        .type(TransactionType.EXPENSE)
                        .iconName("utensils")
                        .build();

        transportCategory =
                Category.builder()
                        .id(UUID.randomUUID())
                        .name("Di chuyển")
                        .type(TransactionType.EXPENSE)
                        .iconName("car")
                        .build();

        shoppingCategory =
                Category.builder()
                        .id(UUID.randomUUID())
                        .name("Mua sắm")
                        .type(TransactionType.EXPENSE)
                        .iconName("shopping-bag")
                        .build();

        salaryCategory =
                Category.builder()
                        .id(UUID.randomUUID())
                        .name("Thu nhập")
                        .type(TransactionType.INCOME)
                        .iconName("wallet")
                        .build();

        mainWallet =
                Wallet.builder()
                        .id(UUID.randomUUID())
                        .name("Ví chính")
                        .balance(new BigDecimal("10000000"))
                        .build();

        when(walletRepository.sumBalanceByUserId(userId)).thenReturn(new BigDecimal("10000000"));
        when(walletRepository.findByUser_Id(userId)).thenReturn(List.of(mainWallet));
        when(categoryRepository.findByUser_Id(userId))
                .thenReturn(
                        List.of(foodCategory, transportCategory, shoppingCategory, salaryCategory));

        // Mock danh sách giao dịch tháng này
        Transaction tIncome =
                Transaction.builder()
                        .id(UUID.randomUUID())
                        .amount(new BigDecimal("15000000"))
                        .type(TransactionType.INCOME)
                        .category(salaryCategory)
                        .build();

        Transaction tFood =
                Transaction.builder()
                        .id(UUID.randomUUID())
                        .amount(new BigDecimal("2000000"))
                        .type(TransactionType.EXPENSE)
                        .category(foodCategory)
                        .build();

        Transaction tShopping =
                Transaction.builder()
                        .id(UUID.randomUUID())
                        .amount(new BigDecimal("1500000"))
                        .type(TransactionType.EXPENSE)
                        .category(shoppingCategory)
                        .build();

        when(transactionRepository.findByUserAndMonth(eq(userId), anyInt(), anyInt()))
                .thenReturn(List.of(tIncome, tFood, tShopping));
    }

    @Test
    @DisplayName("Tin nhắn rỗng -> Trả về lời nhắc nhập tin nhắn")
    void testEmptyMessage() {
        AiAssistantRequest req = AiAssistantRequest.builder().message("   ").build();
        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("GENERAL_CHAT", response.getIntent());
        assertTrue(response.getReply().contains("Bạn chưa nhập gì cả"));
    }

    @Test
    @DisplayName(
            "Lập kế hoạch mua sắm mục tiêu (Dream Goal Planner) - iPhone 30 triệu trong 3 tháng")
    void testGoalPlan_IPhone30M_3Months() {
        AiAssistantRequest req =
                AiAssistantRequest.builder()
                        .message("Muốn mua iPhone 16 Pro Max 30 triệu trong 3 tháng")
                        .build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("PLAN_SAVINGS_GOAL", response.getIntent());
        assertNotNull(response.getGoalPlanData());

        AiAssistantResponse.GoalPlanData goal = response.getGoalPlanData();
        assertEquals(new BigDecimal("30000000"), goal.getTargetAmount());
        assertEquals(3, goal.getTargetMonths());
        assertEquals(new BigDecimal("10000000"), goal.getMonthlySavingsNeeded());
        assertEquals(new BigDecimal("333334"), goal.getDailySavingsNeeded());
        assertNotNull(goal.getFeasibilityScore());
        assertTrue(goal.getFeasibilityScore() > 0 && goal.getFeasibilityScore() <= 100);
        assertNotNull(goal.getCutDownSuggestions());
        assertFalse(goal.getCutDownSuggestions().isEmpty());
        assertNotNull(goal.getDeadlineDate());

        // Kiểm tra reply text có chứa đầy đủ thông tin
        assertTrue(response.getReply().contains("iPhone 16 Pro Max"));
        assertTrue(response.getReply().contains("30.000.000"));
        assertTrue(response.getReply().contains("10.000.000"));
        assertTrue(response.getReply().contains("Kích hoạt Hũ Tiết Kiệm"));
    }

    @Test
    @DisplayName("Lập kế hoạch mua sắm mục tiêu - Laptop 15tr trong 2 tháng")
    void testGoalPlan_Laptop15Tr_2Months() {
        AiAssistantRequest req =
                AiAssistantRequest.builder()
                        .message("Tích lũy 15tr mua laptop trong 2 tháng")
                        .build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("PLAN_SAVINGS_GOAL", response.getIntent());
        assertNotNull(response.getGoalPlanData());

        AiAssistantResponse.GoalPlanData goal = response.getGoalPlanData();
        assertEquals(new BigDecimal("15000000"), goal.getTargetAmount());
        assertEquals(2, goal.getTargetMonths());
        assertEquals(new BigDecimal("7500000"), goal.getMonthlySavingsNeeded());
        assertEquals(new BigDecimal("250000"), goal.getDailySavingsNeeded());
    }

    @Test
    @DisplayName("Lập kế hoạch mua sắm mục tiêu - Xe máy 25 củ trong 5 tháng (đơn vị củ)")
    void testGoalPlan_Motorbike25Cu_5Months() {
        AiAssistantRequest req =
                AiAssistantRequest.builder()
                        .message("Kế hoạch mua xe máy 25 củ trong 5 tháng")
                        .build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("PLAN_SAVINGS_GOAL", response.getIntent());
        assertEquals(new BigDecimal("25000000"), response.getGoalPlanData().getTargetAmount());
        assertEquals(5, response.getGoalPlanData().getTargetMonths());
        assertEquals(
                new BigDecimal("5000000"), response.getGoalPlanData().getMonthlySavingsNeeded());
    }

    @Test
    @DisplayName("Lập kế hoạch mục tiêu khi chưa có số tiền - Tôi muốn đi du lịch Đà Lạt")
    void testGoalPlan_TravelDaLat_WithoutAmount() {
        AiAssistantRequest req =
                AiAssistantRequest.builder().message("tôi muốn đi du lịch đà lạt").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("PLAN_SAVINGS_GOAL", response.getIntent());
        assertTrue(response.getReply().contains("Đi du lịch"));
        assertTrue(response.getReply().contains("Chi phí"));
        assertNotNull(response.getQuickReplies());
        assertFalse(response.getQuickReplies().isEmpty());
        assertTrue(
                response.getQuickReplies().stream()
                        .anyMatch(q -> q.contains("Đi du lịch") || q.contains("du lịch")));
    }

    @Test
    @DisplayName("Ghi chép chi tiêu siêu tốc - Ăn bún bò 55k MoMo")
    void testCreateTransaction_BunBoMoMo() {
        AiAssistantRequest req = AiAssistantRequest.builder().message("Ăn bún bò 55k MoMo").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("CREATE_TRANSACTION", response.getIntent());
        assertNotNull(response.getTransactionData());

        AiAssistantResponse.TransactionData tx = response.getTransactionData();
        assertEquals(new BigDecimal("55000"), tx.getAmount());
        assertEquals("Ăn uống", tx.getCategoryName());
        assertEquals(foodCategory.getId(), tx.getCategoryId());
        assertEquals("MoMo", tx.getPaymentMethod());
        assertEquals("EXPENSE", tx.getTransactionType());
        assertTrue(response.getReply().contains("55.000"));
        assertTrue(response.getReply().contains("Ăn uống"));
    }

    @Test
    @DisplayName("Ghi chép chi tiêu siêu tốc - Đi Grab 35k tiền mặt")
    void testCreateTransaction_GrabCash() {
        AiAssistantRequest req =
                AiAssistantRequest.builder().message("Đi Grab 35k tiền mặt").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("CREATE_TRANSACTION", response.getIntent());

        AiAssistantResponse.TransactionData tx = response.getTransactionData();
        assertEquals(new BigDecimal("35000"), tx.getAmount());
        assertEquals("Di chuyển", tx.getCategoryName());
        assertEquals(transportCategory.getId(), tx.getCategoryId());
        assertEquals("Tiền mặt", tx.getPaymentMethod());
        assertEquals("EXPENSE", tx.getTransactionType());
    }

    @Test
    @DisplayName("Ghi chép thu nhập siêu tốc - Nhận lương 15tr chuyển khoản")
    void testCreateTransaction_IncomeSalary() {
        AiAssistantRequest req =
                AiAssistantRequest.builder().message("Nhận lương 15tr chuyển khoản").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("CREATE_TRANSACTION", response.getIntent());

        AiAssistantResponse.TransactionData tx = response.getTransactionData();
        assertEquals(new BigDecimal("15000000"), tx.getAmount());
        assertEquals("Thu nhập", tx.getCategoryName());
        assertEquals("INCOME", tx.getTransactionType());
        assertEquals("Chuyển khoản", tx.getPaymentMethod());
    }

    @Test
    @DisplayName("Hỏi đáp chi tiêu danh mục - Tháng này tôi tiêu bao nhiêu cafe?")
    void testQueryInsight_CategoryExpense() {
        AiAssistantRequest req =
                AiAssistantRequest.builder().message("Tháng này tôi tiêu bao nhiêu cafe?").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("QUERY_INSIGHT", response.getIntent());
        assertTrue(response.getReply().contains("Ăn uống"));
        assertTrue(response.getReply().contains("2.000.000"));
    }

    @Test
    @DisplayName("Hỏi đáp tổng quan dòng tiền - Tình hình thu chi tháng này")
    void testQueryInsight_GeneralCashflow() {
        AiAssistantRequest req =
                AiAssistantRequest.builder().message("Tình hình thu chi tháng này").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("QUERY_INSIGHT", response.getIntent());
        assertTrue(response.getReply().contains("Tổng thu"));
        assertTrue(response.getReply().contains("15.000.000"));
        assertTrue(response.getReply().contains("Tổng chi"));
        assertTrue(response.getReply().contains("3.500.000"));
        assertTrue(response.getReply().contains("Tiết kiệm ròng"));
    }

    @Test
    @DisplayName("Hội thoại chung - Xin chào bạn ơi")
    void testGeneralChat() {
        AiAssistantRequest req = AiAssistantRequest.builder().message("Xin chào bạn ơi").build();

        AiAssistantResponse response = aiAssistantService.chat(userId, req);

        assertNotNull(response);
        assertEquals("GENERAL_CHAT", response.getIntent());
        assertTrue(response.getReply().contains("Trợ lý Tài chính AI"));
        assertNotNull(response.getQuickReplies());
        assertFalse(response.getQuickReplies().isEmpty());
    }

    @Test
    @DisplayName("Phân tích phản hồi JSON từ Gemini AI - Có bọc ```json ... ```")
    void testParseGeminiJsonResponseWithMarkdown() {
        String mockGeminiJson =
                """
                ```json
                {
                  "reply": "Kế hoạch mua iPhone 16 Pro Max 32 triệu trong 4 tháng rất khả thi!",
                  "intent": "PLAN_SAVINGS_GOAL",
                  "goalPlanData": {
                    "goalName": "iPhone 16 Pro Max",
                    "targetAmount": 32000000,
                    "targetMonths": 4,
                    "monthlySavingsNeeded": 8000000,
                    "dailySavingsNeeded": 266667,
                    "feasibilityScore": 85,
                    "cutDownSuggestions": [
                      {
                        "emoji": "🍜",
                        "categoryName": "Ăn uống",
                        "currentSpending": 3000000,
                        "suggestedSpending": 1500000,
                        "monthlySavings": 1500000,
                        "description": "Giảm ăn ngoài"
                      }
                    ],
                    "deadlineDate": "2026-12-28"
                  },
                  "quickReplies": ["Gợi ý khác", "Xem lại ngân sách"]
                }
                ```
                """;

        AiAssistantResponse response =
                ReflectionTestUtils.invokeMethod(
                        aiAssistantService, "parseGeminiJsonResponse", mockGeminiJson);

        assertNotNull(response);
        assertEquals("PLAN_SAVINGS_GOAL", response.getIntent());
        assertEquals("iPhone 16 Pro Max", response.getGoalPlanData().getGoalName());
        assertEquals(new BigDecimal("32000000"), response.getGoalPlanData().getTargetAmount());
        assertEquals(4, response.getGoalPlanData().getTargetMonths());
        assertEquals(85, response.getGoalPlanData().getFeasibilityScore());
        assertEquals(1, response.getGoalPlanData().getCutDownSuggestions().size());
        assertEquals(2, response.getQuickReplies().size());
    }
}
