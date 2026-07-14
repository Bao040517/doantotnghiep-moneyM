package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.dto.request.UpdateTransactionRequest;
import com.example.sharemoney.entity.*;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests cho TransactionService — kiểm tra CRUD + balance logic.
 */
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private BudgetRepository budgetRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private PayeeRepository payeeRepository;
    @Mock private TagRepository tagRepository;
    @Mock private AnomalyDetectionService anomalyDetectionService;

    @InjectMocks
    private TransactionService transactionService;

    private UUID userId, walletId, categoryId;
    private User user;
    private Wallet wallet;
    private Category expenseCategory, incomeCategory;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        walletId = UUID.randomUUID();
        categoryId = UUID.randomUUID();

        user = User.builder().id(userId).name("TestUser").email("test@test.com").passwordHash("x").build();

        wallet = Wallet.builder()
                .id(walletId)
                .user(user)
                .name("Ví chính")
                .balance(new BigDecimal("1000000")) // 1 triệu
                .currency("VND")
                .build();

        expenseCategory = Category.builder()
                .id(categoryId)
                .name("Ăn uống")
                .type(TransactionType.EXPENSE)
                .iconName("🍔")
                .user(user)
                .build();

        incomeCategory = Category.builder()
                .id(UUID.randomUUID())
                .name("Lương")
                .type(TransactionType.INCOME)
                .iconName("💰")
                .user(user)
                .build();
    }

    private CreateTransactionRequest buildRequest(BigDecimal amount, UUID catId) {
        CreateTransactionRequest req = new CreateTransactionRequest();
        req.setAmount(amount);
        req.setCategoryId(catId);
        req.setNote("Test transaction");
        req.setTransactionDate(LocalDateTime.now());
        return req;
    }

    // ═══════════════════════════════════════════════════════════
    // TEST CASES
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("Test 1: Tạo chi tiêu 200k → ví giảm từ 1tr xuống 800k")
    void testCreateExpenseTransaction_DeductsBalance() {
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(expenseCategory));
        when(transactionRepository.save(any())).thenAnswer(inv -> {
            Transaction tx = inv.getArgument(0);
            if (tx.getId() == null) {
                // Simulate @GeneratedValue
                try {
                    var idField = Transaction.class.getDeclaredField("id");
                    idField.setAccessible(true);
                    idField.set(tx, UUID.randomUUID());
                } catch (Exception ignored) {}
            }
            return tx;
        });

        var result = transactionService.createTransaction(
                userId, walletId, buildRequest(new BigDecimal("200000"), categoryId));

        assertNotNull(result);
        assertEquals(0, new BigDecimal("200000").compareTo(result.getAmount()));
        assertEquals(TransactionType.EXPENSE, result.getType());

        // Verify balance updated
        assertEquals(0, new BigDecimal("800000").compareTo(wallet.getBalance()));
        verify(walletRepository).save(wallet);
    }

    @Test
    @DisplayName("Test 2: Tạo thu nhập 500k → ví tăng từ 1tr lên 1.5tr")
    void testCreateIncomeTransaction_AddsBalance() {
        UUID incomeCatId = incomeCategory.getId();
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(incomeCatId)).thenReturn(Optional.of(incomeCategory));
        when(transactionRepository.save(any())).thenAnswer(inv -> {
            Transaction tx = inv.getArgument(0);
            try {
                var idField = Transaction.class.getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(tx, UUID.randomUUID());
            } catch (Exception ignored) {}
            return tx;
        });

        var result = transactionService.createTransaction(
                userId, walletId, buildRequest(new BigDecimal("500000"), incomeCatId));

        assertNotNull(result);
        assertEquals(TransactionType.INCOME, result.getType());
        assertEquals(0, new BigDecimal("1500000").compareTo(wallet.getBalance()));
    }

    @Test
    @DisplayName("Test 3: Ví không tồn tại → WALLET_NOT_FOUND")
    void testCreateTransaction_WalletNotFound() {
        when(walletRepository.findById(walletId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> transactionService.createTransaction(userId, walletId,
                        buildRequest(new BigDecimal("100000"), categoryId)));
        assertEquals(ErrorCode.WALLET_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 4: Ví của người khác → UNAUTHORIZED")
    void testCreateTransaction_UnauthorizedUser() {
        UUID otherUserId = UUID.randomUUID();
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));

        AppException ex = assertThrows(AppException.class,
                () -> transactionService.createTransaction(otherUserId, walletId,
                        buildRequest(new BigDecimal("100000"), categoryId)));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 5: Sửa giao dịch → rollback cũ + áp mới")
    void testUpdateTransaction_RollbackAndReapply() {
        UUID txId = UUID.randomUUID();
        Transaction existingTx = Transaction.builder()
                .id(txId)
                .wallet(wallet)
                .amount(new BigDecimal("200000"))
                .type(TransactionType.EXPENSE)
                .category(expenseCategory)
                .transactionDate(LocalDateTime.now())
                .build();

        Category newCategory = Category.builder()
                .id(UUID.randomUUID())
                .name("Đi lại")
                .type(TransactionType.EXPENSE)
                .iconName("🚗")
                .user(user)
                .build();

        UpdateTransactionRequest req = new UpdateTransactionRequest();
        req.setAmount(new BigDecimal("300000")); // Tăng từ 200k lên 300k
        req.setCategoryId(newCategory.getId());
        req.setNote("Updated");

        when(transactionRepository.findById(txId)).thenReturn(Optional.of(existingTx));
        when(categoryRepository.findById(newCategory.getId())).thenReturn(Optional.of(newCategory));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Balance ban đầu: 1,000,000
        // Rollback 200k EXPENSE: +200k → 1,200,000
        // Áp 300k EXPENSE: -300k → 900,000
        transactionService.updateTransaction(userId, txId, req);

        assertEquals(0, new BigDecimal("900000").compareTo(wallet.getBalance()));
    }

    @Test
    @DisplayName("Test 6: Xóa chi tiêu 200k → hoàn tiền vào ví")
    void testDeleteTransaction_RestoresBalance() {
        UUID txId = UUID.randomUUID();
        Transaction tx = Transaction.builder()
                .id(txId)
                .wallet(wallet)
                .amount(new BigDecimal("200000"))
                .type(TransactionType.EXPENSE)
                .category(expenseCategory)
                .transactionDate(LocalDateTime.now())
                .build();

        when(transactionRepository.findById(txId)).thenReturn(Optional.of(tx));

        // Balance 1,000,000 + 200,000 (restore) = 1,200,000
        transactionService.deleteTransaction(userId, txId);

        assertEquals(0, new BigDecimal("1200000").compareTo(wallet.getBalance()));
        verify(transactionRepository).delete(tx);
    }

    @Test
    @DisplayName("Test 7: Xóa giao dịch liên kết nhóm (linkedExpenseId) → UNAUTHORIZED")
    void testDeleteLinkedTransaction_Blocked() {
        UUID txId = UUID.randomUUID();
        Transaction tx = Transaction.builder()
                .id(txId)
                .wallet(wallet)
                .amount(new BigDecimal("200000"))
                .type(TransactionType.EXPENSE)
                .category(expenseCategory)
                .linkedExpenseId(UUID.randomUUID()) // Linked to group expense
                .transactionDate(LocalDateTime.now())
                .build();

        when(transactionRepository.findById(txId)).thenReturn(Optional.of(tx));

        AppException ex = assertThrows(AppException.class,
                () -> transactionService.deleteTransaction(userId, txId));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 8: Giao dịch chia nhỏ — tổng split ≠ tổng gốc → SPLIT_AMOUNT_MISMATCH")
    void testSplitTransaction_AmountMismatch() {
        Category splitCat = Category.builder()
                .id(UUID.randomUUID())
                .name("Cà phê")
                .type(TransactionType.EXPENSE)
                .iconName("☕")
                .user(user)
                .build();

        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(expenseCategory));
        when(categoryRepository.findById(splitCat.getId())).thenReturn(Optional.of(splitCat));

        CreateTransactionRequest req = buildRequest(new BigDecimal("100000"), categoryId);
        req.setSplit(true);

        com.example.sharemoney.dto.request.TransactionSplitRequest splitReq =
                new com.example.sharemoney.dto.request.TransactionSplitRequest();
        splitReq.setCategoryId(splitCat.getId());
        splitReq.setAmount(new BigDecimal("60000")); // 60k ≠ 100k
        req.setSplits(List.of(splitReq));

        AppException ex = assertThrows(AppException.class,
                () -> transactionService.createTransaction(userId, walletId, req));
        assertEquals(ErrorCode.SPLIT_AMOUNT_MISMATCH, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 9: Giao dịch không tồn tại → TRANSACTION_NOT_FOUND")
    void testUpdateTransaction_NotFound() {
        UUID txId = UUID.randomUUID();
        when(transactionRepository.findById(txId)).thenReturn(Optional.empty());

        UpdateTransactionRequest req = new UpdateTransactionRequest();
        req.setAmount(new BigDecimal("100000"));
        req.setCategoryId(categoryId);

        AppException ex = assertThrows(AppException.class,
                () -> transactionService.updateTransaction(userId, txId, req));
        assertEquals(ErrorCode.TRANSACTION_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Test 10: Tạo chi tiêu → anomaly detection được gọi")
    void testCreateExpense_TriggersAnomalyDetection() {
        when(walletRepository.findById(walletId)).thenReturn(Optional.of(wallet));
        when(categoryRepository.findById(categoryId)).thenReturn(Optional.of(expenseCategory));
        when(transactionRepository.save(any())).thenAnswer(inv -> {
            Transaction tx = inv.getArgument(0);
            try {
                var idField = Transaction.class.getDeclaredField("id");
                idField.setAccessible(true);
                idField.set(tx, UUID.randomUUID());
            } catch (Exception ignored) {}
            return tx;
        });

        transactionService.createTransaction(userId, walletId,
                buildRequest(new BigDecimal("500000"), categoryId));

        verify(anomalyDetectionService).detectAndAlert(any(Transaction.class));
    }
}
