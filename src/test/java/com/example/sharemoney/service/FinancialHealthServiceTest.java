package com.example.sharemoney.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FinancialHealthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private DebtService debtService;
    @Mock private ExternalLoanService externalLoanService;

    @InjectMocks private FinancialHealthService financialHealthService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder().id(userId).name("Nguyen Van A").email("vana@example.com").build();
    }

    @Test
    @DisplayName("Tính điểm sức khỏe tài chính: Không có dữ liệu thu chi -> Điểm 0, trạng thái Chưa đủ dữ liệu")
    void testCalculateHealthScore_NoData_ReturnsZeroAndNoDataStatus() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.INCOME), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.EXPENSE), any(), any()))
                .thenReturn(BigDecimal.ZERO);

        FinancialHealthDTO result = financialHealthService.calculateHealthScore(userId);

        assertNotNull(result);
        assertEquals(0, result.getScore());
        assertEquals("Chưa đủ dữ liệu", result.getHealthStatus());
    }

    @Test
    @DisplayName("Tính điểm sức khỏe tài chính: Thu nhập cao, chi tiêu hợp lý, không nợ -> Điểm Tuyệt vời (>= 80)")
    void testCalculateHealthScore_ExcellentFinancials_ReturnsHighScore() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        // Thu nhập 30 triệu, chi tiêu 10 triệu trong 3 tháng (tiết kiệm 20 triệu = 66% >= 20%)
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.INCOME), any(), any()))
                .thenReturn(new BigDecimal("30000000"));
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.EXPENSE), any(), any()))
                .thenReturn(new BigDecimal("10000000"));

        when(debtService.getUserDebtSummary(userId))
                .thenReturn(UserDebtSummaryResponse.builder().totalOwing(BigDecimal.ZERO).build());
        when(externalLoanService.getUserLoans(userId)).thenReturn(Collections.emptyList());

        FinancialHealthDTO result = financialHealthService.calculateHealthScore(userId);

        assertNotNull(result);
        assertTrue(result.getScore() >= 80);
        assertEquals("Tuyệt vời", result.getHealthStatus());
    }

    @Test
    @DisplayName("Tính điểm sức khỏe tài chính: Chi tiêu vượt thu nhập, nợ cao -> Điểm Cảnh báo")
    void testCalculateHealthScore_HighExpenseAndDebt_ReturnsWarningStatus() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        // Thu nhập 10 triệu, chi tiêu 12 triệu
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.INCOME), any(), any()))
                .thenReturn(new BigDecimal("10000000"));
        when(transactionRepository.sumByTypeAndPeriod(eq(userId), eq(TransactionType.EXPENSE), any(), any()))
                .thenReturn(new BigDecimal("12000000"));

        // Nợ 15 triệu (vượt thu nhập 10 triệu)
        when(debtService.getUserDebtSummary(userId))
                .thenReturn(UserDebtSummaryResponse.builder().totalOwing(new BigDecimal("5000000")).build());
        ExternalLoanDTO loan = ExternalLoanDTO.builder()
                .principalAmount(new BigDecimal("10000000"))
                .isSettled(false)
                .build();
        when(externalLoanService.getUserLoans(userId)).thenReturn(List.of(loan));

        FinancialHealthDTO result = financialHealthService.calculateHealthScore(userId);

        assertNotNull(result);
        assertTrue(result.getScore() < 40);
        assertEquals("Cảnh báo", result.getHealthStatus());
    }

    @Test
    @DisplayName("Tính điểm sức khỏe tài chính: Không tìm thấy User -> Ném USER_NOT_FOUND")
    void testCalculateHealthScore_UserNotFound_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> financialHealthService.calculateHealthScore(userId));
        assertEquals(ErrorCode.USER_NOT_FOUND, ex.getErrorCode());
    }
}
