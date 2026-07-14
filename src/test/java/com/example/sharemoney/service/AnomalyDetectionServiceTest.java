package com.example.sharemoney.service;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.entity.*;
import com.example.sharemoney.repository.TransactionRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests cho AnomalyDetectionService — kiểm tra thuật toán Z-Score.
 */
@ExtendWith(MockitoExtension.class)
class AnomalyDetectionServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private AnomalyDetectionService anomalyDetectionService;

    private UUID userId, walletId, categoryId;
    private User user;
    private Wallet wallet;
    private Category category;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        walletId = UUID.randomUUID();
        categoryId = UUID.randomUUID();

        user = User.builder().id(userId).name("TestUser").email("test@test.com").passwordHash("x").build();
        wallet = Wallet.builder().id(walletId).user(user).name("Ví chính").balance(BigDecimal.ZERO).currency("VND").build();
        category = Category.builder().id(categoryId).name("Ăn uống").type(TransactionType.EXPENSE).iconName("🍔").user(user).build();
    }

    private Transaction buildTransaction(BigDecimal amount) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .wallet(wallet)
                .amount(amount)
                .type(TransactionType.EXPENSE)
                .category(category)
                .transactionDate(LocalDateTime.now())
                .build();
    }

    private List<Transaction> buildHistoryTransactions(BigDecimal... amounts) {
        List<Transaction> list = new ArrayList<>();
        for (BigDecimal a : amounts) {
            list.add(buildTransaction(a));
        }
        return list;
    }

    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Test 1: Chi tiêu bình thường (Z-Score < 2) → KHÔNG alert")
    void testNormalSpending_NoAlert() {
        Transaction tx = buildTransaction(new BigDecimal("200000")); // 200k

        // Lịch sử: 150k, 180k, 200k, 220k (trung bình ~187.5k)
        List<Transaction> history = buildHistoryTransactions(
                new BigDecimal("150000"),
                new BigDecimal("180000"),
                new BigDecimal("200000"),
                new BigDecimal("220000"));

        when(transactionRepository.findRecentExpensesByCategory(
                eq(userId), eq(categoryId), any(), any(), any()))
                .thenReturn(history);

        anomalyDetectionService.detectAndAlert(tx);

        // 200k gần trung bình → không nên alert
        verify(notificationService, never()).sendNotification(any(), any(), any());
    }

    @Test
    @DisplayName("Test 2: Chi tiêu cao bất thường (Z-Score > 2) → gửi alert")
    void testHighZScore_AlertTriggered() {
        Transaction tx = buildTransaction(new BigDecimal("5000000")); // 5 triệu

        // Lịch sử: 150k, 180k, 200k, 170k (trung bình ~175k, stddev ~20k)
        // Z-Score = (5000000 - 175000) / 20000 ≈ 241 >> 2
        List<Transaction> history = buildHistoryTransactions(
                new BigDecimal("150000"),
                new BigDecimal("180000"),
                new BigDecimal("200000"),
                new BigDecimal("170000"));

        when(transactionRepository.findRecentExpensesByCategory(
                eq(userId), eq(categoryId), any(), any(), any()))
                .thenReturn(history);

        anomalyDetectionService.detectAndAlert(tx);

        // Z-Score cực cao → phải gửi notification
        verify(notificationService).sendNotification(
                eq(userId), contains("Cảnh báo chi tiêu bất thường"), eq("SPENDING_ANOMALY"));
    }

    @Test
    @DisplayName("Test 3: Chưa đủ 3 giao dịch lịch sử → bỏ qua")
    void testTooFewHistoryEntries_Skip() {
        Transaction tx = buildTransaction(new BigDecimal("5000000"));

        // Chỉ có 2 giao dịch trong lịch sử (cần ≥ 3)
        List<Transaction> history = buildHistoryTransactions(
                new BigDecimal("150000"),
                new BigDecimal("180000"));

        when(transactionRepository.findRecentExpensesByCategory(
                eq(userId), eq(categoryId), any(), any(), any()))
                .thenReturn(history);

        anomalyDetectionService.detectAndAlert(tx);

        verify(notificationService, never()).sendNotification(any(), any(), any());
    }

    @Test
    @DisplayName("Test 4: Số tiền dưới ngưỡng (< 100k) → bỏ qua")
    void testAmountBelowThreshold_Skip() {
        Transaction tx = buildTransaction(new BigDecimal("50000")); // 50k < 100k threshold

        anomalyDetectionService.detectAndAlert(tx);

        // Không cần query lịch sử, skip ngay
        verify(transactionRepository, never()).findRecentExpensesByCategory(
                any(), any(), any(), any(), any());
        verify(notificationService, never()).sendNotification(any(), any(), any());
    }

    @Test
    @DisplayName("Test 5: Tất cả lịch sử bằng nhau (stdDev = 0) → dùng 3x fallback")
    void testZeroStdDev_Fallback() {
        // Giao dịch gấp 4 lần trung bình
        Transaction tx = buildTransaction(new BigDecimal("800000")); // 800k

        // Lịch sử: tất cả đều 200k → stdDev = 0
        List<Transaction> history = buildHistoryTransactions(
                new BigDecimal("200000"),
                new BigDecimal("200000"),
                new BigDecimal("200000"),
                new BigDecimal("200000"));

        when(transactionRepository.findRecentExpensesByCategory(
                eq(userId), eq(categoryId), any(), any(), any()))
                .thenReturn(history);

        anomalyDetectionService.detectAndAlert(tx);

        // 800k > 200k * 3 = 600k → phải alert bằng 3x rule
        verify(notificationService).sendNotification(
                eq(userId), contains("Cảnh báo chi tiêu bất thường"), eq("SPENDING_ANOMALY"));
    }
}
