package com.example.sharemoney.repository;

import com.example.sharemoney.entity.Transaction;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    boolean existsByWallet_Id(UUID walletId);

    List<Transaction> findByWallet_IdOrderByTransactionDateDesc(UUID walletId);

    @Query(
            "SELECT t FROM Transaction t WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.category.name != 'Cho nh\u00f3m m\u01b0\u1ee3n' "
                    + "ORDER BY t.transactionDate DESC")
    Page<Transaction> findByWallet_User_IdOrderByTransactionDateDesc(
            @Param("userId") UUID userId, Pageable pageable);

    List<Transaction> findByLinkedExpenseId(UUID expenseId);

    @Query(
            "SELECT COUNT(t) FROM Transaction t WHERE t.wallet.user.id = :userId AND t.category.name = 'Chưa phân loại'")
    long countUncategorizedTransactions(@Param("userId") UUID userId);

    @Query(
            "SELECT t FROM Transaction t WHERE t.wallet.user.id = :userId AND t.category.name = 'Chưa phân loại' ORDER BY t.transactionDate DESC")
    List<Transaction> findUncategorizedTransactions(@Param("userId") UUID userId);

    @Query(
            "SELECT t FROM Transaction t WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.category.name != 'Cho nh\u00f3m m\u01b0\u1ee3n' "
                    + "AND YEAR(t.transactionDate) = :year AND MONTH(t.transactionDate) = :month "
                    + "ORDER BY t.transactionDate DESC")
    List<Transaction> findByUserAndMonth(
            @Param("userId") UUID userId, @Param("year") int year, @Param("month") int month);

    @Query(
            "SELECT COUNT(t) > 0 FROM Transaction t WHERE t.wallet.user.id = :userId "
                    + "AND t.note LIKE 'Tự động phân bổ vào mục tiêu%' "
                    + "AND YEAR(t.transactionDate) = :year AND MONTH(t.transactionDate) = :month")
    boolean existsAutoAllocationInMonth(
            @Param("userId") UUID userId, @Param("year") int year, @Param("month") int month);

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.category.id = :categoryId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.excludeFromBudget = false "
                    + "AND t.isSplit = false "
                    + "AND (t.linkedBudgetId IS NULL OR t.linkedBudgetId IN (SELECT b.id FROM Budget b WHERE b.type = 'FLEXIBLE')) "
                    + "AND YEAR(t.transactionDate) = :year "
                    + "AND MONTH(t.transactionDate) = :month")
    BigDecimal sumUnsplitExpenseByCategoryAndMonth(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("year") int year,
            @Param("month") int month);

    @Query(
            "SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s "
                    + "WHERE s.parentTransaction.wallet.user.id = :userId "
                    + "AND (s.parentTransaction.wallet.isLiability = false OR s.parentTransaction.wallet.isLiability IS NULL) "
                    + "AND s.category.id = :categoryId "
                    + "AND s.parentTransaction.type = 'EXPENSE' "
                    + "AND s.parentTransaction.excludeFromBudget = false "
                    + "AND (s.parentTransaction.linkedBudgetId IS NULL OR s.parentTransaction.linkedBudgetId IN (SELECT b.id FROM Budget b WHERE b.type = 'FLEXIBLE')) "
                    + "AND YEAR(s.parentTransaction.transactionDate) = :year "
                    + "AND MONTH(s.parentTransaction.transactionDate) = :month")
    BigDecimal sumSplitExpenseByCategoryAndMonth(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("year") int year,
            @Param("month") int month);

    default BigDecimal sumExpenseByCategoryAndMonth(
            UUID userId, UUID categoryId, int year, int month) {
        BigDecimal unsplit = sumUnsplitExpenseByCategoryAndMonth(userId, categoryId, year, month);
        BigDecimal split = sumSplitExpenseByCategoryAndMonth(userId, categoryId, year, month);
        return unsplit.add(split);
    }

    // ── Queries cho BILL budget: đếm chi phí CỦA RIÊNG BUDGET ĐÓ (theo linkedBudgetId) ──

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.linkedBudgetId = :budgetId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.excludeFromBudget = false "
                    + "AND t.isSplit = false "
                    + "AND YEAR(t.transactionDate) = :year "
                    + "AND MONTH(t.transactionDate) = :month")
    BigDecimal sumAllUnsplitExpenseByLinkedBudgetAndMonth(
            @Param("userId") UUID userId,
            @Param("budgetId") UUID budgetId,
            @Param("year") int year,
            @Param("month") int month);

    @Query(
            "SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s "
                    + "WHERE s.parentTransaction.wallet.user.id = :userId "
                    + "AND (s.parentTransaction.wallet.isLiability = false OR s.parentTransaction.wallet.isLiability IS NULL) "
                    + "AND s.parentTransaction.linkedBudgetId = :budgetId "
                    + "AND s.parentTransaction.type = 'EXPENSE' "
                    + "AND s.parentTransaction.excludeFromBudget = false "
                    + "AND YEAR(s.parentTransaction.transactionDate) = :year "
                    + "AND MONTH(s.parentTransaction.transactionDate) = :month")
    BigDecimal sumAllSplitExpenseByLinkedBudgetAndMonth(
            @Param("userId") UUID userId,
            @Param("budgetId") UUID budgetId,
            @Param("year") int year,
            @Param("month") int month);

    default BigDecimal sumAllExpenseByLinkedBudgetAndMonth(
            UUID userId, UUID budgetId, int year, int month) {
        BigDecimal unsplit = sumAllUnsplitExpenseByLinkedBudgetAndMonth(userId, budgetId, year, month);
        BigDecimal split = sumAllSplitExpenseByLinkedBudgetAndMonth(userId, budgetId, year, month);
        return unsplit.add(split);
    }

    // ── Queries CÓ FILTER createdAt: chỉ đếm giao dịch SAU khi budget được tạo ──

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.category.id = :categoryId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.excludeFromBudget = false "
                    + "AND t.isSplit = false "
                    + "AND (t.linkedBudgetId IS NULL OR t.linkedBudgetId IN (SELECT b.id FROM Budget b WHERE b.type = 'FLEXIBLE')) "
                    + "AND t.transactionDate >= :budgetCreatedAt "
                    + "AND YEAR(t.transactionDate) = :year "
                    + "AND MONTH(t.transactionDate) = :month")
    BigDecimal sumUnsplitExpenseByCategoryAndMonthSince(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("year") int year,
            @Param("month") int month,
            @Param("budgetCreatedAt") LocalDateTime budgetCreatedAt);

    @Query(
            "SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s "
                    + "WHERE s.parentTransaction.wallet.user.id = :userId "
                    + "AND (s.parentTransaction.wallet.isLiability = false OR s.parentTransaction.wallet.isLiability IS NULL) "
                    + "AND s.category.id = :categoryId "
                    + "AND s.parentTransaction.type = 'EXPENSE' "
                    + "AND s.parentTransaction.excludeFromBudget = false "
                    + "AND (s.parentTransaction.linkedBudgetId IS NULL OR s.parentTransaction.linkedBudgetId IN (SELECT b.id FROM Budget b WHERE b.type = 'FLEXIBLE')) "
                    + "AND s.parentTransaction.transactionDate >= :budgetCreatedAt "
                    + "AND YEAR(s.parentTransaction.transactionDate) = :year "
                    + "AND MONTH(s.parentTransaction.transactionDate) = :month")
    BigDecimal sumSplitExpenseByCategoryAndMonthSince(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("year") int year,
            @Param("month") int month,
            @Param("budgetCreatedAt") LocalDateTime budgetCreatedAt);

    default BigDecimal sumExpenseByCategoryAndMonthSince(
            UUID userId, UUID categoryId, int year, int month, LocalDateTime budgetCreatedAt) {
        BigDecimal unsplit =
                sumUnsplitExpenseByCategoryAndMonthSince(
                        userId, categoryId, year, month, budgetCreatedAt);
        BigDecimal split =
                sumSplitExpenseByCategoryAndMonthSince(
                        userId, categoryId, year, month, budgetCreatedAt);
        return unsplit.add(split);
    }

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.linkedBudgetId = :budgetId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.excludeFromBudget = false "
                    + "AND t.isSplit = false "
                    + "AND t.transactionDate >= :budgetCreatedAt "
                    + "AND YEAR(t.transactionDate) = :year "
                    + "AND MONTH(t.transactionDate) = :month")
    BigDecimal sumAllUnsplitExpenseByLinkedBudgetAndMonthSince(
            @Param("userId") UUID userId,
            @Param("budgetId") UUID budgetId,
            @Param("year") int year,
            @Param("month") int month,
            @Param("budgetCreatedAt") LocalDateTime budgetCreatedAt);

    @Query(
            "SELECT COALESCE(SUM(s.amount), 0) FROM TransactionSplit s "
                    + "WHERE s.parentTransaction.wallet.user.id = :userId "
                    + "AND (s.parentTransaction.wallet.isLiability = false OR s.parentTransaction.wallet.isLiability IS NULL) "
                    + "AND s.parentTransaction.linkedBudgetId = :budgetId "
                    + "AND s.parentTransaction.type = 'EXPENSE' "
                    + "AND s.parentTransaction.excludeFromBudget = false "
                    + "AND s.parentTransaction.transactionDate >= :budgetCreatedAt "
                    + "AND YEAR(s.parentTransaction.transactionDate) = :year "
                    + "AND MONTH(s.parentTransaction.transactionDate) = :month")
    BigDecimal sumAllSplitExpenseByLinkedBudgetAndMonthSince(
            @Param("userId") UUID userId,
            @Param("budgetId") UUID budgetId,
            @Param("year") int year,
            @Param("month") int month,
            @Param("budgetCreatedAt") LocalDateTime budgetCreatedAt);

    default BigDecimal sumAllExpenseByLinkedBudgetAndMonthSince(
            UUID userId, UUID budgetId, int year, int month, LocalDateTime budgetCreatedAt) {
        BigDecimal unsplit =
                sumAllUnsplitExpenseByLinkedBudgetAndMonthSince(
                        userId, budgetId, year, month, budgetCreatedAt);
        BigDecimal split =
                sumAllSplitExpenseByLinkedBudgetAndMonthSince(
                        userId, budgetId, year, month, budgetCreatedAt);
        return unsplit.add(split);
    }

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.linkedBudgetId = :budgetId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.excludeFromBudget = false "
                    + "AND YEAR(t.transactionDate) = :year "
                    + "AND MONTH(t.transactionDate) = :month")
    BigDecimal sumExpenseByLinkedBudgetIdAndMonth(
            @Param("budgetId") UUID budgetId, @Param("year") int year, @Param("month") int month);

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.type = :type "
                    + "AND t.excludeFromBudget = false "
                    + "AND t.transactionDate >= :from "
                    + "AND t.transactionDate < :to")
    BigDecimal sumByTypeAndPeriod(
            @Param("userId") UUID userId,
            @Param("type") com.example.sharemoney.entity.TransactionType type,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query(
            "SELECT SUM(t.amount) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.type = 'TRANSFER' "
                    + "AND t.category.name = 'Tr\u1ea3 n\u1ee3 nh\u00f3m' "
                    + "AND t.transactionDate >= :from "
                    + "AND t.transactionDate < :to")
    BigDecimal sumDebtPaymentByPeriod(
            @Param("userId") UUID userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query(
            "SELECT SUM(t.amount) FROM Transaction t "
                    + "WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.type = 'TRANSFER' "
                    + "AND t.category.name = 'Nh\u1eadn ti\u1ec1n nh\u00f3m' "
                    + "AND t.transactionDate >= :from "
                    + "AND t.transactionDate < :to")
    BigDecimal sumDebtRecoveryByPeriod(
            @Param("userId") UUID userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query(
            "SELECT t FROM Transaction t WHERE t.wallet.user.id = :userId "
                    + "AND (t.wallet.isLiability = false OR t.wallet.isLiability IS NULL) "
                    + "AND t.category.id = :categoryId "
                    + "AND t.type = 'EXPENSE' "
                    + "AND t.transactionDate >= :from "
                    + "AND t.transactionDate <= :to "
                    + "AND t.id != :excludeTxId "
                    + "ORDER BY t.transactionDate DESC")
    List<Transaction> findRecentExpensesByCategory(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("excludeTxId") UUID excludeTxId);

    boolean existsByNoteContaining(String note);
}
