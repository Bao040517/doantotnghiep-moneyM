package com.example.sharemoney.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mockStatic;

import com.example.sharemoney.config.VNPayConfig;
import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.entity.PaymentOrder;
import com.example.sharemoney.entity.PaymentOrderStatus;
import com.example.sharemoney.entity.PaymentOrderType;
import com.example.sharemoney.entity.User;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.repository.BudgetRepository;
import com.example.sharemoney.repository.CategoryRepository;
import com.example.sharemoney.repository.GroupMemberRepository;
import com.example.sharemoney.repository.GroupRepository;
import com.example.sharemoney.repository.PaymentOrderRepository;
import com.example.sharemoney.repository.WalletRepository;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.DebtService;
import com.example.sharemoney.service.TransactionService;
import com.example.sharemoney.service.VNPayService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Vector;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoSettings;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VNPayControllerTest {

    @Mock
    private VNPayService vnPayService;

    @Mock
    private VNPayConfig vnPayConfig;

    @Mock
    private DebtService debtService;

    @Mock
    private TransactionService transactionService;

    @Mock
    private PaymentOrderRepository paymentOrderRepository;

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private GroupMemberRepository groupMemberRepository;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private VNPayController vnPayController;

    private UUID userId;
    private UUID walletId;
    private UUID categoryId;
    private UUID budgetId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        walletId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        budgetId = UUID.randomUUID();
    }

    @Test
    void testCreatePayment_Budget_Success() {
        try (MockedStatic<SecurityUtils> mockedSecurity = Mockito.mockStatic(SecurityUtils.class)) {
            mockedSecurity.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            User mockUser = new User();
            mockUser.setId(userId);

            Wallet mockWallet = new Wallet();
            mockWallet.setId(walletId);
            mockWallet.setUser(mockUser);

            when(walletRepository.findById(walletId)).thenReturn(Optional.of(mockWallet));
            when(categoryRepository.existsById(categoryId)).thenReturn(true);
            when(budgetRepository.existsById(budgetId)).thenReturn(true);
            when(vnPayService.generateTxnRef()).thenReturn("SM202608140900001234");
            when(vnPayService.createPaymentUrl(eq("SM202608140900001234"), eq(75000L), any(), any(), any()))
                    .thenReturn("https://sandbox.vnpayment.vn/test-payment-url");

            when(request.getHeader("X-FORWARDED-FOR")).thenReturn(null);
            when(request.getRemoteAddr()).thenReturn("127.0.0.1");

            ResponseEntity<Map<String, String>> response = vnPayController.createPayment(
                    null, null, walletId, categoryId, budgetId, 75000L, "BUDGET", request);

            assertEquals(200, response.getStatusCode().value());
            assertNotNull(response.getBody());
            assertEquals("https://sandbox.vnpayment.vn/test-payment-url", response.getBody().get("paymentUrl"));
            assertEquals("SM202608140900001234", response.getBody().get("txnRef"));

            verify(paymentOrderRepository).save(any(PaymentOrder.class));
        }
    }

    @Test
    void testVnpayIpn_Success_BudgetOrder() {
        String txnRef = "SM202608140900001234";
        String secureHash = "valid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_ResponseCode");
        paramNames.add("vnp_Amount");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_ResponseCode")).thenReturn("00");
        when(request.getParameter("vnp_Amount")).thenReturn("7500000");
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(vnPayConfig.hashAllFields(any())).thenReturn(secureHash);

        PaymentOrder mockOrder = PaymentOrder.builder()
                .txnRef(txnRef)
                .userId(userId)
                .type(PaymentOrderType.BUDGET)
                .amount(BigDecimal.valueOf(75000))
                .walletId(walletId)
                .categoryId(categoryId)
                .budgetId(budgetId)
                .status(PaymentOrderStatus.PENDING)
                .build();

        when(paymentOrderRepository.findByTxnRef(txnRef)).thenReturn(Optional.of(mockOrder));

        ResponseEntity<String> response = vnPayController.vnpayIpn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("\"RspCode\":\"00\""));
        assertEquals(PaymentOrderStatus.SUCCESS, mockOrder.getStatus());
        verify(transactionService).createTransaction(eq(userId), eq(walletId), any(CreateTransactionRequest.class));
    }

    @Test
    void testVnpayIpn_DuplicateCall_ReturnsRspCode02() {
        String txnRef = "SM202608140900001234";
        String secureHash = "valid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_ResponseCode");
        paramNames.add("vnp_Amount");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_ResponseCode")).thenReturn("00");
        when(request.getParameter("vnp_Amount")).thenReturn("7500000");
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(vnPayConfig.hashAllFields(any())).thenReturn(secureHash);

        PaymentOrder alreadyCompletedOrder = PaymentOrder.builder()
                .txnRef(txnRef)
                .userId(userId)
                .type(PaymentOrderType.BUDGET)
                .amount(BigDecimal.valueOf(75000))
                .status(PaymentOrderStatus.SUCCESS)
                .build();

        when(paymentOrderRepository.findByTxnRef(txnRef)).thenReturn(Optional.of(alreadyCompletedOrder));

        ResponseEntity<String> response = vnPayController.vnpayIpn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("\"RspCode\":\"02\""));
        verify(transactionService, never()).createTransaction(any(), any(), any());
    }

    @Test
    void testVnpayIpn_OrderNotFound_ReturnsRspCode01() {
        String txnRef = "SM_UNKNOWN";
        String secureHash = "valid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(vnPayConfig.hashAllFields(any())).thenReturn(secureHash);

        when(paymentOrderRepository.findByTxnRef(txnRef)).thenReturn(Optional.empty());

        ResponseEntity<String> response = vnPayController.vnpayIpn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("\"RspCode\":\"01\""));
    }

    @Test
    void testVnpayIpn_MissingAmount_ReturnsRspCode04() {
        String txnRef = "SM202608140900001234";
        String secureHash = "valid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(request.getParameter("vnp_Amount")).thenReturn(null);
        when(vnPayConfig.hashAllFields(any())).thenReturn(secureHash);

        PaymentOrder mockOrder = PaymentOrder.builder()
                .txnRef(txnRef)
                .userId(userId)
                .type(PaymentOrderType.BUDGET)
                .amount(BigDecimal.valueOf(75000))
                .status(PaymentOrderStatus.PENDING)
                .build();

        when(paymentOrderRepository.findByTxnRef(txnRef)).thenReturn(Optional.of(mockOrder));

        ResponseEntity<String> response = vnPayController.vnpayIpn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("\"RspCode\":\"04\""));
    }

    @Test
    void testVnpayReturn_ValidSignature_RedirectsToDeepLink() {
        String txnRef = "SM202608140900001234";
        String secureHash = "valid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(vnPayConfig.hashAllFields(any())).thenReturn(secureHash);

        ResponseEntity<String> response = vnPayController.vnpayReturn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("sharemoney://vnpay-result?txnRef=" + txnRef));
    }

    @Test
    void testVnpayReturn_InvalidSignature_RedirectsToError() {
        String txnRef = "SM202608140900001234";
        String secureHash = "invalid_hash";

        Vector<String> paramNames = new Vector<>();
        paramNames.add("vnp_TxnRef");
        paramNames.add("vnp_SecureHash");

        when(request.getParameterNames()).thenReturn(paramNames.elements());
        when(request.getParameter("vnp_TxnRef")).thenReturn(txnRef);
        when(request.getParameter("vnp_SecureHash")).thenReturn(secureHash);
        when(vnPayConfig.hashAllFields(any())).thenReturn("real_hash");

        ResponseEntity<String> response = vnPayController.vnpayReturn(request);

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("sharemoney://vnpay-result?error=invalid_signature"));
    }

    @Test
    void testGetOrderStatus_Success() {
        String txnRef = "SM202608140900001234";
        
        try (org.mockito.MockedStatic<SecurityUtils> mockedSecurityUtils = mockStatic(SecurityUtils.class)) {
            mockedSecurityUtils.when(SecurityUtils::getCurrentUserId).thenReturn(userId);

            PaymentOrder order = PaymentOrder.builder()
                    .txnRef(txnRef)
                    .userId(userId)
                    .type(PaymentOrderType.BUDGET)
                    .amount(BigDecimal.valueOf(75000))
                    .status(PaymentOrderStatus.SUCCESS)
                    .build();

            when(paymentOrderRepository.findByTxnRef(txnRef)).thenReturn(Optional.of(order));

            ResponseEntity<?> response = vnPayController.getOrderStatus(txnRef);
            assertEquals(200, response.getStatusCode().value());
            
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            assertNotNull(body);
            assertEquals(txnRef, body.get("txnRef"));
            assertEquals("SUCCESS", body.get("status"));
        }
    }
}
