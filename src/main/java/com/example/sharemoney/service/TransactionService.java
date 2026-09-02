package com.example.sharemoney.service;

import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.dto.request.UpdateTransactionRequest;
import com.example.sharemoney.dto.response.CashflowSummaryResponse;
import com.example.sharemoney.dto.response.CategoryBreakdownResponse;
import com.example.sharemoney.dto.response.CategoryResponse;
import com.example.sharemoney.dto.response.MonthlySummaryResponse;
import com.example.sharemoney.dto.response.TransactionResponse;
import com.example.sharemoney.entity.Budget;
import com.example.sharemoney.entity.Category;
import com.example.sharemoney.entity.Notification;
import com.example.sharemoney.entity.Payee;
import com.example.sharemoney.entity.Tag;
import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.NotificationRepository;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.WalletRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationRepository notificationRepository;
    private final com.example.sharemoney.repository.PayeeRepository payeeRepository;
    private final com.example.sharemoney.repository.TagRepository tagRepository;
    private final AnomalyDetectionService anomalyDetectionService;

    // ─────────────────────────────────────────────────────────────
    // Tạo giao dịch mới (giữ nguyên logic cũ)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public TransactionResponse createTransaction(
            UUID userId, UUID walletId, CreateTransactionRequest req) {
        Wallet wallet =
                walletRepository
                        .findById(walletId)
                        .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND));

        if (!wallet.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Category category =
                categoryRepository
                        .findById(req.getCategoryId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        Payee payee = null;
        if (req.getPayeeName() != null && !req.getPayeeName().trim().isEmpty()) {
            payee =
                    payeeRepository
                            .findByUser_IdAndName(userId, req.getPayeeName().trim())
                            .orElseGet(
                                    () ->
                                            payeeRepository.save(
                                                    Payee.builder()
                                                            .user(wallet.getUser())
                                                            .name(req.getPayeeName().trim())
                                                            .build()));
        }

        java.util.Set<Tag> tags = new java.util.HashSet<>();
        if (req.getTags() != null) {
            for (String tagName : req.getTags()) {
                if (tagName == null || tagName.trim().isEmpty()) continue;
                Tag tag =
                        tagRepository
                                .findByUser_IdAndName(userId, tagName.trim())
                                .orElseGet(
                                        () ->
                                                tagRepository.save(
                                                        Tag.builder()
                                                                .user(wallet.getUser())
                                                                .name(tagName.trim())
                                                                .build()));
                tags.add(tag);
            }
        }

        LocalDateTime txDate =
                req.getTransactionDate() != null ? req.getTransactionDate() : LocalDateTime.now();
        UUID linkedBudgetId = req.getLinkedBudgetId();
        if (linkedBudgetId == null && category.getType() == TransactionType.EXPENSE) {
            List<Budget> candidateBudgets =
                    budgetRepository
                            .findByUser_IdAndMonthAndYear(
                                    userId, txDate.getMonthValue(), txDate.getYear())
                            .stream()
                            .filter(
                                    b ->
                                            b.getCategory().getId().equals(category.getId())
                                                    && b.getType()
                                                            == com.example.sharemoney.entity
                                                                    .BudgetType.BILL)
                            .collect(Collectors.toList());
            if (candidateBudgets.size() == 1) {
                linkedBudgetId = candidateBudgets.get(0).getId();
            }
        }

        String paymentMethod = req.getPaymentMethod();
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            paymentMethod = "TRANSFER";
        }

        Transaction transaction =
                Transaction.builder()
                        .wallet(wallet)
                        .amount(req.getAmount())
                        .type(category.getType())
                        .category(category)
                        .transactionDate(txDate)
                        .note(req.getNote())
                        .payee(payee)
                        .tags(tags)
                        .isSplit(req.isSplit())
                        .linkedBudgetId(linkedBudgetId)
                        .excludeFromBudget(req.isExcludeFromBudget())
                        .paymentMethod(paymentMethod)
                        .build();

        if (req.isSplit() && req.getSplits() != null && !req.getSplits().isEmpty()) {
            BigDecimal totalSplit = BigDecimal.ZERO;
            List<com.example.sharemoney.entity.TransactionSplit> splits = new ArrayList<>();
            for (com.example.sharemoney.dto.request.TransactionSplitRequest splitReq :
                    req.getSplits()) {
                Category splitCat =
                        categoryRepository
                                .findById(splitReq.getCategoryId())
                                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
                if (splitCat.getType() != category.getType()) {
                    throw new AppException(ErrorCode.INVALID_SPLIT_CATEGORY_TYPE);
                }
                com.example.sharemoney.entity.TransactionSplit split =
                        com.example.sharemoney.entity.TransactionSplit.builder()
                                .parentTransaction(transaction)
                                .category(splitCat)
                                .amount(splitReq.getAmount())
                                .note(splitReq.getNote())
                                .build();
                splits.add(split);
                totalSplit = totalSplit.add(splitReq.getAmount());
            }
            if (totalSplit.compareTo(req.getAmount()) != 0) {
                throw new AppException(ErrorCode.SPLIT_AMOUNT_MISMATCH);
            }
            transaction.setSplits(splits);
        }

        if (category.getType() == TransactionType.INCOME) {
            wallet.setBalance(wallet.getBalance().add(req.getAmount()));
        } else if (category.getType() == TransactionType.EXPENSE) {
            if ("CASH".equalsIgnoreCase(paymentMethod)
                    || "VNPAY".equalsIgnoreCase(paymentMethod)
                    || "PAYOS".equalsIgnoreCase(paymentMethod)
                    || "VIETQR".equalsIgnoreCase(paymentMethod)
                    || "BANK_GATEWAY".equalsIgnoreCase(paymentMethod)) {
                // Tiền mặt hoặc Cổng thanh toán ngoại vi: nếu số dư ví đủ thì trừ, nếu không đủ thì
                // ghi nhận chi tiêu bình thường mà không chặn lỗi ví
                if (wallet.getBalance().compareTo(req.getAmount()) >= 0) {
                    wallet.setBalance(wallet.getBalance().subtract(req.getAmount()));
                }
            } else {
                if (wallet.getBalance().compareTo(req.getAmount()) < 0) {
                    throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
                }
                wallet.setBalance(wallet.getBalance().subtract(req.getAmount()));
            }
        }
        // TRANSFER: không thay đổi số dư ví

        walletRepository.save(wallet);
        transactionRepository.save(transaction);

        // Feature 5: Smart budget alert
        if (category.getType() == TransactionType.EXPENSE) {
            checkAndCreateBudgetAlert(wallet, category, transaction);
            // Kích hoạt phát hiện bất thường Z-Score
            anomalyDetectionService.detectAndAlert(transaction);
        }

        return toResponse(transaction);
    }

    // ─────────────────────────────────────────────────────────────
    // Lấy toàn bộ giao dịch (Phân trang)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<TransactionResponse> getUserTransactions(
            UUID userId, int page, int size) {
        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, size);
        return transactionRepository
                .findByWallet_User_IdOrderByTransactionDateDesc(userId, pageable)
                .map(this::toResponse);
    }

    // ─────────────────────────────────────────────────────────────
    // Lọc giao dịch chưa phân loại
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public long getUncategorizedCount(UUID userId) {
        return transactionRepository.countUncategorizedTransactions(userId);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getUncategorizedTransactions(UUID userId) {
        return transactionRepository.findUncategorizedTransactions(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // Lọc giao dịch theo tháng (MỚI - Phase 1)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByMonth(UUID userId, int year, int month) {
        return transactionRepository.findByUserAndMonth(userId, year, month).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // Sửa giao dịch (MỚI - Phase 1)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public TransactionResponse updateTransaction(
            UUID userId, UUID txId, UpdateTransactionRequest req) {
        Transaction tx =
                transactionRepository
                        .findById(txId)
                        .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (!tx.getWallet().getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Không cho sửa giao dịch tự động từ nhóm (EDA)
        if (tx.getLinkedExpenseId() != null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Wallet wallet = tx.getWallet();

        // Rollback số dư cũ trước khi áp giá trị mới
        if (tx.getType() == TransactionType.INCOME) {
            BigDecimal rolledBack = wallet.getBalance().subtract(tx.getAmount());
            if (rolledBack.compareTo(BigDecimal.ZERO) < 0) {
                throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
            }
            wallet.setBalance(rolledBack);
        } else if (tx.getType() == TransactionType.EXPENSE) {
            wallet.setBalance(wallet.getBalance().add(tx.getAmount()));
        }
        // TRANSFER: không rollback (không thay đổi số dư)

        // Áp danh mục mới
        Category newCategory =
                categoryRepository
                        .findById(req.getCategoryId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

        tx.setAmount(req.getAmount());
        tx.setCategory(newCategory);
        tx.setType(newCategory.getType());
        tx.setNote(req.getNote());
        if (req.getPaymentMethod() != null && !req.getPaymentMethod().trim().isEmpty()) {
            tx.setPaymentMethod(req.getPaymentMethod().trim());
        }
        if (req.getTransactionDate() != null) {
            tx.setTransactionDate(req.getTransactionDate());
        }
        tx.setExcludeFromBudget(req.isExcludeFromBudget());

        UUID linkedBudgetId = req.getLinkedBudgetId();
        if (linkedBudgetId == null) {
            linkedBudgetId = tx.getLinkedBudgetId(); // Giữ nguyên link cũ nếu không truyền
        }

        if (linkedBudgetId == null && newCategory.getType() == TransactionType.EXPENSE) {
            LocalDateTime txDate =
                    req.getTransactionDate() != null
                            ? req.getTransactionDate()
                            : tx.getTransactionDate();
            List<Budget> candidateBudgets =
                    budgetRepository
                            .findByUser_IdAndMonthAndYear(
                                    userId, txDate.getMonthValue(), txDate.getYear())
                            .stream()
                            .filter(
                                    b ->
                                            b.getCategory().getId().equals(newCategory.getId())
                                                    && b.getType()
                                                            == com.example.sharemoney.entity
                                                                    .BudgetType.BILL)
                            .collect(Collectors.toList());
            if (candidateBudgets.size() == 1) {
                linkedBudgetId = candidateBudgets.get(0).getId();
            }
        }
        tx.setLinkedBudgetId(linkedBudgetId);

        Payee payee = null;
        if (req.getPayeeName() != null && !req.getPayeeName().trim().isEmpty()) {
            payee =
                    payeeRepository
                            .findByUser_IdAndName(userId, req.getPayeeName().trim())
                            .orElseGet(
                                    () ->
                                            payeeRepository.save(
                                                    Payee.builder()
                                                            .user(wallet.getUser())
                                                            .name(req.getPayeeName().trim())
                                                            .build()));
        }
        tx.setPayee(payee);

        java.util.Set<Tag> tags = new java.util.HashSet<>();
        if (req.getTags() != null) {
            for (String tagName : req.getTags()) {
                if (tagName == null || tagName.trim().isEmpty()) continue;
                Tag tag =
                        tagRepository
                                .findByUser_IdAndName(userId, tagName.trim())
                                .orElseGet(
                                        () ->
                                                tagRepository.save(
                                                        Tag.builder()
                                                                .user(wallet.getUser())
                                                                .name(tagName.trim())
                                                                .build()));
                tags.add(tag);
            }
        }
        tx.setTags(tags);

        tx.setSplit(req.isSplit());
        if (req.isSplit() && req.getSplits() != null && !req.getSplits().isEmpty()) {
            BigDecimal totalSplit = BigDecimal.ZERO;
            if (tx.getSplits() != null) {
                tx.getSplits().clear();
            } else {
                tx.setSplits(new ArrayList<>());
            }
            for (com.example.sharemoney.dto.request.TransactionSplitRequest splitReq :
                    req.getSplits()) {
                Category splitCat =
                        categoryRepository
                                .findById(splitReq.getCategoryId())
                                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
                if (splitCat.getType() != newCategory.getType()) {
                    throw new AppException(ErrorCode.INVALID_SPLIT_CATEGORY_TYPE);
                }
                com.example.sharemoney.entity.TransactionSplit split =
                        com.example.sharemoney.entity.TransactionSplit.builder()
                                .parentTransaction(tx)
                                .category(splitCat)
                                .amount(splitReq.getAmount())
                                .note(splitReq.getNote())
                                .build();
                tx.getSplits().add(split);
                totalSplit = totalSplit.add(splitReq.getAmount());
            }
            if (totalSplit.compareTo(req.getAmount()) != 0) {
                throw new AppException(ErrorCode.SPLIT_AMOUNT_MISMATCH);
            }
        } else {
            if (tx.getSplits() != null) {
                tx.getSplits().clear();
            }
        }

        // Áp số dư mới
        if (newCategory.getType() == TransactionType.INCOME) {
            wallet.setBalance(wallet.getBalance().add(req.getAmount()));
        } else if (newCategory.getType() == TransactionType.EXPENSE) {
            String pMethod = tx.getPaymentMethod();
            if ("CASH".equalsIgnoreCase(pMethod)
                    || "VNPAY".equalsIgnoreCase(pMethod)
                    || "PAYOS".equalsIgnoreCase(pMethod)
                    || "VIETQR".equalsIgnoreCase(pMethod)
                    || "BANK_GATEWAY".equalsIgnoreCase(pMethod)) {
                if (wallet.getBalance().compareTo(req.getAmount()) >= 0) {
                    wallet.setBalance(wallet.getBalance().subtract(req.getAmount()));
                }
            } else {
                if (wallet.getBalance().compareTo(req.getAmount()) < 0) {
                    throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
                }
                wallet.setBalance(wallet.getBalance().subtract(req.getAmount()));
            }
        }
        // TRANSFER: không thay đổi số dư ví

        walletRepository.save(wallet);
        transactionRepository.save(tx);

        if (newCategory.getType() == TransactionType.EXPENSE) {
            checkAndCreateBudgetAlert(wallet, newCategory, tx);
            // Kích hoạt phát hiện bất thường Z-Score
            anomalyDetectionService.detectAndAlert(tx);
        }

        return toResponse(tx);
    }

    // ─────────────────────────────────────────────────────────────
    // Xóa giao dịch (MỚI - Phase 1)
    // ─────────────────────────────────────────────────────────────
    @Transactional
    public void deleteTransaction(UUID userId, UUID txId) {
        Transaction tx =
                transactionRepository
                        .findById(txId)
                        .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));

        if (!tx.getWallet().getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Không cho xóa giao dịch tự động từ nhóm (EDA)
        if (tx.getLinkedExpenseId() != null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Wallet wallet = tx.getWallet();

        // Rollback số dư ví (kiểm tra không cho âm khi rollback INCOME)
        if (tx.getType() == TransactionType.INCOME) {
            BigDecimal newBalance = wallet.getBalance().subtract(tx.getAmount());
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new AppException(ErrorCode.INSUFFICIENT_WALLET_BALANCE);
            }
            wallet.setBalance(newBalance);
        } else if (tx.getType() == TransactionType.EXPENSE) {
            wallet.setBalance(wallet.getBalance().add(tx.getAmount()));
        }
        // TRANSFER: không rollback (không thay đổi số dư)

        walletRepository.save(wallet);
        transactionRepository.delete(tx);
    }

    // ─────────────────────────────────────────────────────────────
    // Báo cáo tổng hợp tháng (Phase 3)
    // ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public MonthlySummaryResponse getMonthlySummary(UUID userId, int year, int month) {
        List<MonthlySummaryResponse.MonthData> months = new ArrayList<>();
        YearMonth trendBaseYM = YearMonth.now();

        // 6 tháng gần nhất kể từ tháng hiện tại (real current month)
        for (int i = 5; i >= 0; i--) {
            YearMonth targetYM = trendBaseYM.minusMonths(i);
            LocalDateTime from = targetYM.atDay(1).atStartOfDay();
            LocalDateTime to = targetYM.plusMonths(1).atDay(1).atStartOfDay();

            BigDecimal income =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.INCOME, from, to);
            if (income == null) income = BigDecimal.ZERO;
            BigDecimal debtRecovery =
                    transactionRepository.sumDebtRecoveryByPeriod(userId, from, to);
            if (debtRecovery == null) debtRecovery = BigDecimal.ZERO;
            income = income.add(debtRecovery);

            BigDecimal expense =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.EXPENSE, from, to);
            if (expense == null) expense = BigDecimal.ZERO;
            BigDecimal debtPayment = transactionRepository.sumDebtPaymentByPeriod(userId, from, to);
            if (debtPayment == null) debtPayment = BigDecimal.ZERO;
            expense = expense.add(debtPayment);
            BigDecimal net = income.subtract(expense);

            String label = "T" + targetYM.getMonthValue() + "/" + targetYM.getYear();

            List<CategoryBreakdownResponse> catBreakdown =
                    getCategoryBreakdownByType(
                            userId,
                            targetYM.getYear(),
                            targetYM.getMonthValue(),
                            TransactionType.EXPENSE);
            java.util.Map<String, BigDecimal> catExpenses =
                    catBreakdown.stream()
                            .collect(
                                    Collectors.toMap(
                                            CategoryBreakdownResponse::getCategoryName,
                                            CategoryBreakdownResponse::getTotalAmount,
                                            (v1, v2) -> v1));

            List<CategoryBreakdownResponse> incBreakdown =
                    getCategoryBreakdownByType(
                            userId,
                            targetYM.getYear(),
                            targetYM.getMonthValue(),
                            TransactionType.INCOME);
            java.util.Map<String, BigDecimal> catIncomes =
                    incBreakdown.stream()
                            .collect(
                                    Collectors.toMap(
                                            CategoryBreakdownResponse::getCategoryName,
                                            CategoryBreakdownResponse::getTotalAmount,
                                            (v1, v2) -> v1));

            months.add(
                    MonthlySummaryResponse.MonthData.builder()
                            .label(label)
                            .year(targetYM.getYear())
                            .month(targetYM.getMonthValue())
                            .income(income)
                            .expense(expense)
                            .net(net)
                            .debtPayment(debtPayment)
                            .categoryExpenses(catExpenses)
                            .categoryIncomes(catIncomes)
                            .build());
        }

        // --- Dữ liệu cho tháng ĐƯỢC CHỌN (để hiển thị trên Top Cards) ---
        YearMonth selectedYM = YearMonth.of(year, month);
        LocalDateTime selFrom = selectedYM.atDay(1).atStartOfDay();
        LocalDateTime selTo = selectedYM.plusMonths(1).atDay(1).atStartOfDay();

        BigDecimal selIncome =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.INCOME, selFrom, selTo);
        if (selIncome == null) selIncome = BigDecimal.ZERO;
        BigDecimal selDebtRecovery =
                transactionRepository.sumDebtRecoveryByPeriod(userId, selFrom, selTo);
        if (selDebtRecovery == null) selDebtRecovery = BigDecimal.ZERO;
        selIncome = selIncome.add(selDebtRecovery);

        BigDecimal selExpense =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.EXPENSE, selFrom, selTo);
        if (selExpense == null) selExpense = BigDecimal.ZERO;
        BigDecimal selDebtPayment =
                transactionRepository.sumDebtPaymentByPeriod(userId, selFrom, selTo);
        if (selDebtPayment == null) selDebtPayment = BigDecimal.ZERO;
        selExpense = selExpense.add(selDebtPayment);

        // Top category selected month
        List<CategoryBreakdownResponse> breakdown =
                getCategoryBreakdown(userId, selectedYM.getYear(), selectedYM.getMonthValue());
        String topCat = breakdown.isEmpty() ? "Chưa có" : breakdown.get(0).getCategoryName();

        MonthlySummaryResponse.CurrentMonthData current =
                MonthlySummaryResponse.CurrentMonthData.builder()
                        .totalIncome(selIncome)
                        .totalExpense(selExpense)
                        .topCategory(topCat)
                        .build();

        // Comparison với tháng trước của tháng được chọn
        YearMonth prevYM = selectedYM.minusMonths(1);
        LocalDateTime prevFrom = prevYM.atDay(1).atStartOfDay();
        LocalDateTime prevTo = prevYM.plusMonths(1).atDay(1).atStartOfDay();

        BigDecimal prevExpense =
                transactionRepository.sumByTypeAndPeriod(
                        userId, TransactionType.EXPENSE, prevFrom, prevTo);
        if (prevExpense == null) prevExpense = BigDecimal.ZERO;

        BigDecimal expenseChange = selExpense.subtract(prevExpense);
        int percent = 0;
        if (prevExpense.compareTo(BigDecimal.ZERO) > 0) {
            percent =
                    expenseChange
                            .multiply(BigDecimal.valueOf(100))
                            .divide(prevExpense, 0, RoundingMode.HALF_UP)
                            .intValue();
        } else if (selExpense.compareTo(BigDecimal.ZERO) > 0) {
            percent = 100; // was 0, now > 0
        }

        MonthlySummaryResponse.ComparisonData comparison =
                MonthlySummaryResponse.ComparisonData.builder()
                        .expenseChange(expenseChange)
                        .expenseChangePercent(percent)
                        .build();

        return MonthlySummaryResponse.builder()
                .months(months)
                .currentMonth(current)
                .comparison(comparison)
                .build();
    }

    /**
     * Báo cáo biến động dòng tiền thực tế theo Tuần (4 tuần trong tháng), Tháng (12 tháng trong
     * năm), và Năm (các năm gần nhất). Dữ liệu hoàn toàn thực tế 100% từ database, không sử dụng hệ
     * số giả lập.
     */
    @Transactional(readOnly = true)
    public CashflowSummaryResponse getCashflowSummary(UUID userId, int year, int month) {
        // 1. Phân bổ thực tế 4 tuần của tháng được chọn
        YearMonth selectedYM = YearMonth.of(year, month);
        int daysInMonth = selectedYM.lengthOfMonth();
        List<CashflowSummaryResponse.CashflowPoint> weeks = new ArrayList<>();

        int[][] weekRanges = {
            {1, 7},
            {8, 14},
            {15, 21},
            {22, daysInMonth}
        };

        for (int i = 0; i < weekRanges.length; i++) {
            int startDay = weekRanges[i][0];
            int endDay = weekRanges[i][1];
            LocalDateTime from = selectedYM.atDay(startDay).atStartOfDay();
            LocalDateTime to =
                    (endDay == daysInMonth)
                            ? selectedYM.plusMonths(1).atDay(1).atStartOfDay()
                            : selectedYM.atDay(endDay + 1).atStartOfDay();

            BigDecimal income =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.INCOME, from, to);
            if (income == null) income = BigDecimal.ZERO;
            BigDecimal debtRecovery =
                    transactionRepository.sumDebtRecoveryByPeriod(userId, from, to);
            if (debtRecovery == null) debtRecovery = BigDecimal.ZERO;
            income = income.add(debtRecovery);

            BigDecimal expense =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.EXPENSE, from, to);
            if (expense == null) expense = BigDecimal.ZERO;
            BigDecimal debtPayment = transactionRepository.sumDebtPaymentByPeriod(userId, from, to);
            if (debtPayment == null) debtPayment = BigDecimal.ZERO;
            expense = expense.add(debtPayment);

            BigDecimal net = income.subtract(expense);
            weeks.add(
                    CashflowSummaryResponse.CashflowPoint.builder()
                            .period("Tuần " + (i + 1))
                            .label("T" + (i + 1))
                            .income(income)
                            .expense(expense)
                            .net(net)
                            .build());
        }

        // 2. Phân bổ thực tế các tháng trong năm được chọn (chỉ hiển thị từ T1 đến tháng hiện tại
        // nếu là năm nay, hoặc 12 tháng nếu là năm cũ)
        int curYear = LocalDate.now().getYear();
        int curMonth = LocalDate.now().getMonthValue();
        int maxMonth = (year == curYear) ? curMonth : (year < curYear ? 12 : 0);

        List<CashflowSummaryResponse.CashflowPoint> months = new ArrayList<>();
        for (int m = 1; m <= maxMonth; m++) {
            YearMonth ym = YearMonth.of(year, m);
            LocalDateTime from = ym.atDay(1).atStartOfDay();
            LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();

            BigDecimal income =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.INCOME, from, to);
            if (income == null) income = BigDecimal.ZERO;
            BigDecimal debtRecovery =
                    transactionRepository.sumDebtRecoveryByPeriod(userId, from, to);
            if (debtRecovery == null) debtRecovery = BigDecimal.ZERO;
            income = income.add(debtRecovery);

            BigDecimal expense =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.EXPENSE, from, to);
            if (expense == null) expense = BigDecimal.ZERO;
            BigDecimal debtPayment = transactionRepository.sumDebtPaymentByPeriod(userId, from, to);
            if (debtPayment == null) debtPayment = BigDecimal.ZERO;
            expense = expense.add(debtPayment);

            BigDecimal net = income.subtract(expense);
            months.add(
                    CashflowSummaryResponse.CashflowPoint.builder()
                            .period("T" + m)
                            .label("T" + m)
                            .income(income)
                            .expense(expense)
                            .net(net)
                            .build());
        }

        // 3. Phân bổ thực tế các năm (5 năm gần nhất: year - 4 đến year)
        List<CashflowSummaryResponse.CashflowPoint> years = new ArrayList<>();
        for (int y = year - 4; y <= year; y++) {
            LocalDateTime from = LocalDate.of(y, 1, 1).atStartOfDay();
            LocalDateTime to = LocalDate.of(y + 1, 1, 1).atStartOfDay();

            BigDecimal income =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.INCOME, from, to);
            if (income == null) income = BigDecimal.ZERO;
            BigDecimal debtRecovery =
                    transactionRepository.sumDebtRecoveryByPeriod(userId, from, to);
            if (debtRecovery == null) debtRecovery = BigDecimal.ZERO;
            income = income.add(debtRecovery);

            BigDecimal expense =
                    transactionRepository.sumByTypeAndPeriod(
                            userId, TransactionType.EXPENSE, from, to);
            if (expense == null) expense = BigDecimal.ZERO;
            BigDecimal debtPayment = transactionRepository.sumDebtPaymentByPeriod(userId, from, to);
            if (debtPayment == null) debtPayment = BigDecimal.ZERO;
            expense = expense.add(debtPayment);

            BigDecimal net = income.subtract(expense);
            years.add(
                    CashflowSummaryResponse.CashflowPoint.builder()
                            .period("Năm " + y)
                            .label(String.valueOf(y))
                            .income(income)
                            .expense(expense)
                            .net(net)
                            .build());
        }

        return CashflowSummaryResponse.builder().weeks(weeks).months(months).years(years).build();
    }

    // ─────────────────────────────────────────────────────────────
    // Báo cáo danh mục (Phase 3)
    // ─────────────────────────────────────────────────────────────
    private List<CategoryBreakdownResponse> getCategoryBreakdownByType(
            UUID userId, int year, int month, TransactionType type) {
        List<Transaction> txs = transactionRepository.findByUserAndMonth(userId, year, month);

        List<Transaction> filteredTxs =
                txs.stream().filter(t -> t.getType() == type).collect(Collectors.toList());

        java.util.Map<Category, BigDecimal> categorySums = new java.util.HashMap<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Transaction tx : filteredTxs) {
            if (tx.isSplit() && tx.getSplits() != null && !tx.getSplits().isEmpty()) {
                for (com.example.sharemoney.entity.TransactionSplit split : tx.getSplits()) {
                    categorySums.merge(split.getCategory(), split.getAmount(), BigDecimal::add);
                    totalAmount = totalAmount.add(split.getAmount());
                }
            } else {
                categorySums.merge(tx.getCategory(), tx.getAmount(), BigDecimal::add);
                totalAmount = totalAmount.add(tx.getAmount());
            }
        }

        if (totalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return Collections.emptyList();
        }

        BigDecimal finalTotalAmount = totalAmount;

        return categorySums.entrySet().stream()
                .map(
                        entry -> {
                            Category cat = entry.getKey();
                            BigDecimal sum = entry.getValue();
                            double percent =
                                    sum.multiply(BigDecimal.valueOf(100))
                                            .divide(finalTotalAmount, 1, RoundingMode.HALF_UP)
                                            .doubleValue();

                            return CategoryBreakdownResponse.builder()
                                    .categoryId(cat.getId())
                                    .categoryName(cat.getName())
                                    .categoryIcon(cat.getIconName())
                                    .totalAmount(sum)
                                    .percentage(percent)
                                    .build();
                        })
                .sorted(Comparator.comparing(CategoryBreakdownResponse::getTotalAmount).reversed())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoryBreakdownResponse> getCategoryBreakdown(UUID userId, int year, int month) {
        return getCategoryBreakdownByType(userId, year, month, TransactionType.EXPENSE);
    }

    @Transactional(readOnly = true)
    public List<CategoryBreakdownResponse> getIncomeCategoryBreakdown(
            UUID userId, int year, int month) {
        return getCategoryBreakdownByType(userId, year, month, TransactionType.INCOME);
    }

    // ─────────────────────────────────────────────────────────────
    // Feature 5: Smart Budget Alert
    // ─────────────────────────────────────────────────────────────
    private void checkAndCreateBudgetAlert(Wallet wallet, Category category, Transaction tx) {
        try {
            int year = tx.getTransactionDate().getYear();
            int month = tx.getTransactionDate().getMonthValue();

            // Tìm các budget của category này trong tháng
            List<Budget> budgets =
                    budgetRepository.findByUser_IdAndCategory_IdAndMonthAndYear(
                            wallet.getUser().getId(), category.getId(), month, year);

            if (budgets == null || budgets.isEmpty()) return;

            for (Budget budget : budgets) {
                java.math.BigDecimal limit = budget.getLimitAmount();
                if (limit == null || limit.compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                // Tính tổng đã chi category này tháng hiện tại
                java.math.BigDecimal spent =
                        transactionRepository.sumExpenseByCategoryAndMonth(
                                wallet.getUser().getId(), category.getId(), year, month);
                if (spent == null) spent = java.math.BigDecimal.ZERO;

                double pct =
                        spent.multiply(java.math.BigDecimal.valueOf(100))
                                .divide(limit, 0, java.math.RoundingMode.HALF_UP)
                                .doubleValue();

                String msg = null;
                String type = null;

                if (pct >= 100) {
                    msg =
                            String.format(
                                    "🔴 Bạn đã VƯỢT ngân sách %s! (%.0f%% - đã chi %,.0fđ / giới hạn %,.0fđ)",
                                    budget.getName() != null
                                            ? budget.getName()
                                            : category.getName(),
                                    pct,
                                    spent,
                                    limit);
                    type = "BUDGET_OVER";
                } else if (pct >= 80) {
                    msg =
                            String.format(
                                    "⚠️ Bạn đã dùng %.0f%% ngân sách %s (đã chi %,.0fđ / %,.0fđ)",
                                    pct,
                                    budget.getName() != null
                                            ? budget.getName()
                                            : category.getName(),
                                    spent,
                                    limit);
                    type = "BUDGET_WARNING";
                }

                if (msg != null) {
                    // Kiểm tra tránh tạo trùng notification cùng loại trong ngày
                    boolean alreadySent =
                            notificationRepository.existsByUser_IdAndTypeAndCreatedAtAfter(
                                    wallet.getUser().getId(),
                                    type,
                                    tx.getTransactionDate().toLocalDate().atStartOfDay());
                    if (!alreadySent) {
                        notificationRepository.save(
                                Notification.builder()
                                        .user(wallet.getUser())
                                        .message(msg)
                                        .type(type)
                                        .isRead(false)
                                        .build());
                        log.info(
                                "[BudgetAlert] Created {} notification for user {} category {}",
                                type,
                                wallet.getUser().getId(),
                                category.getName());
                    }
                }
            }
        } catch (Exception e) {
            // Không để lỗi notification crash transaction chính
            log.warn("[BudgetAlert] Failed to check budget alert: {}", e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────
    private TransactionResponse toResponse(Transaction transaction) {
        CategoryResponse categoryResponse =
                CategoryResponse.builder()
                        .id(transaction.getCategory().getId())
                        .name(transaction.getCategory().getName())
                        .type(transaction.getCategory().getType())
                        .iconName(transaction.getCategory().getIconName())
                        .build();

        List<com.example.sharemoney.dto.response.TransactionSplitResponse> splitResponses = null;
        if (transaction.isSplit() && transaction.getSplits() != null) {
            splitResponses =
                    transaction.getSplits().stream()
                            .map(
                                    s ->
                                            com.example.sharemoney.dto.response
                                                    .TransactionSplitResponse.builder()
                                                    .id(s.getId())
                                                    .amount(s.getAmount())
                                                    .note(s.getNote())
                                                    .category(
                                                            CategoryResponse.builder()
                                                                    .id(s.getCategory().getId())
                                                                    .name(s.getCategory().getName())
                                                                    .type(s.getCategory().getType())
                                                                    .iconName(
                                                                            s.getCategory()
                                                                                    .getIconName())
                                                                    .build())
                                                    .build())
                            .collect(Collectors.toList());
        }

        return TransactionResponse.builder()
                .id(transaction.getId())
                .walletId(transaction.getWallet() != null ? transaction.getWallet().getId() : null)
                .walletName(
                        transaction.getWallet() != null ? transaction.getWallet().getName() : null)
                .amount(transaction.getAmount())
                .type(transaction.getType())
                .category(categoryResponse)
                .categoryName(categoryResponse != null ? categoryResponse.getName() : null)
                .categoryIcon(categoryResponse != null ? categoryResponse.getIconName() : null)
                .transactionDate(transaction.getTransactionDate())
                .note(transaction.getNote())
                .linkedExpenseId(transaction.getLinkedExpenseId())
                .payeeName(transaction.getPayee() != null ? transaction.getPayee().getName() : null)
                .paymentMethod(
                        transaction.getPaymentMethod() != null
                                ? transaction.getPaymentMethod()
                                : "TRANSFER")
                .tags(
                        transaction.getTags() != null
                                ? transaction.getTags().stream()
                                        .map(Tag::getName)
                                        .collect(Collectors.toList())
                                : null)
                .isSplit(transaction.isSplit())
                .splits(splitResponses)
                .build();
    }
}
