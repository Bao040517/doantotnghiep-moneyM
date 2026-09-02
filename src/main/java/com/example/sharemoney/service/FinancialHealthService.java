package com.example.sharemoney.service;

import com.example.sharemoney.dto.ExternalLoanDTO;
import com.example.sharemoney.dto.response.FinancialHealthDTO;
import com.example.sharemoney.dto.response.UserDebtSummaryResponse;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.exception.AppException;
import com.example.sharemoney.exception.ErrorCode;
import com.example.sharemoney.repository.TransactionRepository;
import com.example.sharemoney.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FinancialHealthService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final DebtService debtService;
    private final ExternalLoanService externalLoanService;

    @Transactional(readOnly = true)
    public FinancialHealthDTO calculateHealthScore(UUID userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Simplified algorithm for demonstration purposes
        // Real-world would look at past 3-6 months.
        LocalDate today = LocalDate.now();
        LocalDateTime from = today.minusMonths(3).withDayOfMonth(1).atStartOfDay();
        LocalDateTime to = today.plusMonths(1).withDayOfMonth(1).atStartOfDay();

        BigDecimal income =
                transactionRepository.sumByTypeAndPeriod(userId, TransactionType.INCOME, from, to);
        if (income == null) income = BigDecimal.ZERO;

        BigDecimal expense =
                transactionRepository.sumByTypeAndPeriod(userId, TransactionType.EXPENSE, from, to);
        if (expense == null) expense = BigDecimal.ZERO;

        int savingsRatioScore = 0;
        int budgetAdherenceScore = 0;
        int emergencyFundScore = 0;

        if (income.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal savings = income.subtract(expense);
            double savingsRatio =
                    savings.multiply(BigDecimal.valueOf(100))
                            .divide(income, 2, RoundingMode.HALF_UP)
                            .doubleValue();

            if (savingsRatio >= 20) {
                savingsRatioScore = 25;
            } else if (savingsRatio >= 10) {
                savingsRatioScore = 15;
            } else if (savingsRatio > 0) {
                savingsRatioScore = 5;
            }

            double expenseRatio =
                    expense.multiply(BigDecimal.valueOf(100))
                            .divide(income, 2, RoundingMode.HALF_UP)
                            .doubleValue();

            if (expenseRatio <= 50) {
                budgetAdherenceScore = 25;
            } else if (expenseRatio <= 80) {
                budgetAdherenceScore = 15;
            } else if (expenseRatio < 100) {
                budgetAdherenceScore = 5;
            }

            if (savingsRatio >= 15) {
                emergencyFundScore = 25;
            } else if (savingsRatio >= 5) {
                emergencyFundScore = 15;
            } else if (savingsRatio > 0) {
                emergencyFundScore = 5;
            }
        }

        // Tính điểm nợ thực tế từ dữ liệu Group Debt + External Loan
        int debtToIncomeScore = calculateDebtScore(userId, income);

        int totalScore =
                savingsRatioScore + budgetAdherenceScore + debtToIncomeScore + emergencyFundScore;
        totalScore = Math.min(100, Math.max(0, totalScore));

        String status;
        String advice;

        if (income.compareTo(BigDecimal.ZERO) == 0 && expense.compareTo(BigDecimal.ZERO) == 0) {
            totalScore = 0;
            status = "Chưa đủ dữ liệu";
            advice =
                    "Bạn chưa có giao dịch thu chi nào trong thời gian gần đây. Hãy bắt đầu ghi chép để hệ thống đánh giá nhé!";
        } else if (totalScore >= 80) {
            status = "Tuyệt vời";
            advice =
                    "Tình hình tài chính của bạn rất tốt. Hãy tiếp tục duy trì và xem xét các cơ hội đầu tư sinh lời.";
        } else if (totalScore >= 60) {
            status = "Khá";
            advice =
                    "Tài chính của bạn tương đối ổn định. Bạn nên tăng cường tích lũy quỹ dự phòng.";
        } else if (totalScore >= 40) {
            status = "Trung bình";
            advice = "Bạn cần chú ý hơn đến việc quản lý chi tiêu và lập ngân sách hàng tháng.";
        } else {
            status = "Cảnh báo";
            advice =
                    "Bạn đang chi tiêu vượt quá thu nhập hoặc có tỷ lệ tiết kiệm quá thấp. Hãy cắt giảm các khoản chi không cần thiết ngay lập tức.";
        }

        return FinancialHealthDTO.builder()
                .score(totalScore)
                .healthStatus(status)
                .advice(advice)
                .savingsRatioScore(
                        income.compareTo(BigDecimal.ZERO) == 0
                                        && expense.compareTo(BigDecimal.ZERO) == 0
                                ? 0
                                : savingsRatioScore)
                .budgetAdherenceScore(
                        income.compareTo(BigDecimal.ZERO) == 0
                                        && expense.compareTo(BigDecimal.ZERO) == 0
                                ? 0
                                : budgetAdherenceScore)
                .debtToIncomeScore(
                        income.compareTo(BigDecimal.ZERO) == 0
                                        && expense.compareTo(BigDecimal.ZERO) == 0
                                ? 0
                                : debtToIncomeScore)
                .emergencyFundScore(
                        income.compareTo(BigDecimal.ZERO) == 0
                                        && expense.compareTo(BigDecimal.ZERO) == 0
                                ? 0
                                : emergencyFundScore)
                .build();
    }

    /**
     * Tính điểm nợ thực tế (0-25 điểm). Dựa trên tổng nợ nhóm (group debt) + nợ ngoài (external
     * loan) so với thu nhập.
     */
    private int calculateDebtScore(UUID userId, BigDecimal income) {
        try {
            BigDecimal totalDebt = BigDecimal.ZERO;

            // 1. Nợ nhóm (group debt) — lấy từ DebtService
            UserDebtSummaryResponse debtSummary = debtService.getUserDebtSummary(userId);
            if (debtSummary != null && debtSummary.getTotalOwing() != null) {
                totalDebt = totalDebt.add(debtSummary.getTotalOwing());
            }

            // 2. Nợ ngoài (external loan) — lấy từ ExternalLoanService
            List<ExternalLoanDTO> loans = externalLoanService.getUserLoans(userId);
            for (ExternalLoanDTO loan : loans) {
                if (!loan.isSettled() && loan.getPrincipalAmount() != null) {
                    totalDebt = totalDebt.add(loan.getPrincipalAmount());
                }
            }

            // Nếu không có nợ → điểm tối đa
            if (totalDebt.compareTo(BigDecimal.ZERO) <= 0) {
                return 25;
            }

            // Nếu không có thu nhập nhưng có nợ → điểm 0
            if (income.compareTo(BigDecimal.ZERO) <= 0) {
                return 0;
            }

            // Tính tỷ lệ nợ/thu nhập (3 tháng)
            double debtRatio =
                    totalDebt
                            .multiply(BigDecimal.valueOf(100))
                            .divide(income, 2, RoundingMode.HALF_UP)
                            .doubleValue();

            if (debtRatio <= 20) {
                return 25; // Nợ rất ít so với thu nhập
            } else if (debtRatio <= 50) {
                return 15; // Nợ ở mức chấp nhận được
            } else if (debtRatio <= 100) {
                return 5; // Nợ đáng lo ngại
            } else {
                return 0; // Nợ vượt thu nhập
            }
        } catch (Exception e) {
            log.warn("[FinancialHealth] Failed to calculate debt score: {}", e.getMessage());
            return 15; // Fallback an toàn nếu không query được
        }
    }
}
