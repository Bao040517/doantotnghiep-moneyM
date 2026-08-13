package com.example.sharemoney.controller;

import com.example.sharemoney.config.VNPayConfig;
import com.example.sharemoney.dto.request.ApproveSettleRequest;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.DebtService;
import com.example.sharemoney.service.TransactionService;
import com.example.sharemoney.service.VNPayService;
import com.example.sharemoney.repository.ExpenseRepository;
import com.example.sharemoney.repository.TransactionRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/vnpay")
@RequiredArgsConstructor
public class VNPayController {

    private final VNPayService vnPayService;
    private final VNPayConfig vnPayConfig;
    private final DebtService debtService;
    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final ExpenseRepository expenseRepository;

    @Value("${vnpay.frontendUrl:http://localhost:19006}")
    private String frontendUrl;

    /**
     * POST /api/vnpay/create-payment
     * Tạo URL thanh toán VNPay Sandbox.
     */
    @PostMapping("/create-payment")
    public ResponseEntity<Map<String, String>> createPayment(
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID creditorId,
            @RequestParam(required = false) UUID walletId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID budgetId,
            @RequestParam long amount,
            @RequestParam(required = false, defaultValue = "DEBT") String type,
            HttpServletRequest request) {

        UUID debtorId = SecurityUtils.getCurrentUserId();

        String ipAddress = request.getHeader("X-FORWARDED-FOR");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = request.getRemoteAddr();
        }
        
        // VNPay Sandbox fails with IPv6 localhost or any local/private IPs (e.g. 192.168.x.x)
        if (ipAddress.equals("0:0:0:0:0:0:0:1") || ipAddress.equals("127.0.0.1") 
            || ipAddress.startsWith("10.") || ipAddress.startsWith("192.168.") || ipAddress.startsWith("172.")) {
            ipAddress = "113.160.225.97"; // Use a valid dummy IPv4 for sandbox
        }

        String orderInfo;
        if ("BUDGET".equalsIgnoreCase(type)) {
            if (walletId == null || categoryId == null) {
                log.warn("[VNPay] BUDGET payment missing walletId or categoryId");
                return ResponseEntity.badRequest().build();
            }
            String bIdStr = (budgetId != null) ? budgetId.toString().replace("-", "") : "null";
            orderInfo = "BUDGET_" + debtorId.toString().replace("-", "") + "_" 
                        + walletId.toString().replace("-", "") + "_" 
                        + categoryId.toString().replace("-", "") + "_" 
                        + bIdStr + "_" + amount;
        } else {
            if (groupId == null || creditorId == null) {
                return ResponseEntity.badRequest().build();
            }
            orderInfo = groupId.toString().replace("-", "") + "_" 
                        + debtorId.toString().replace("-", "") + "_" 
                        + creditorId.toString().replace("-", "") + "_" + amount;
        }

        UUID paymentId = UUID.randomUUID();
        String paymentUrl = vnPayService.createPaymentUrl(paymentId, amount, null, ipAddress, orderInfo);
        
        Map<String, String> response = new HashMap<>();
        response.put("paymentUrl", paymentUrl);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/vnpay/vnpay-return
     * VNPay Sandbox sẽ redirect trình duyệt người dùng về URL này sau khi thanh toán.
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<String> vnpayReturn(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();
        for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements();) {
            String fieldName = params.nextElement();
            String fieldValue = request.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                fields.put(fieldName, fieldValue);
            }
        }

        String vnp_SecureHash = request.getParameter("vnp_SecureHash");
        if (fields.containsKey("vnp_SecureHashType")) {
            fields.remove("vnp_SecureHashType");
        }
        if (fields.containsKey("vnp_SecureHash")) {
            fields.remove("vnp_SecureHash");
        }

        String signValue = vnPayConfig.hashAllFields(fields);
        
        String htmlTemplate = "<!DOCTYPE html><html lang='vi'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Kết quả thanh toán VNPay</title><style>body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; } .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 90%; } .success-icon { color: #10b981; font-size: 64px; margin-bottom: 16px; } .error-icon { color: #ef4444; font-size: 64px; margin-bottom: 16px; } h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; } p { color: #64748b; margin-bottom: 24px; line-height: 1.5; } .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }</style></head><body><div class='card'>%s</div></body></html>";

        if (signValue.equals(vnp_SecureHash)) {
            if ("00".equals(request.getParameter("vnp_ResponseCode"))) {
                String successContent = "<div class='success-icon'>✓</div><h1>Thanh toán thành công!</h1><p>Giao dịch của bạn đang được xử lý.<br/>Vui lòng đóng trình duyệt này và quay lại ứng dụng ShareMoney.</p>";
                return ResponseEntity.ok(String.format(htmlTemplate, successContent));
            } else {
                log.warn("[VNPay] Payment failed on return. ResponseCode={}", request.getParameter("vnp_ResponseCode"));
                String errorContent = "<div class='error-icon'>✗</div><h1>Thanh toán thất bại</h1><p>Giao dịch đã bị hủy hoặc xảy ra lỗi.<br/>Vui lòng đóng trình duyệt và thử lại trong ứng dụng.</p>";
                return ResponseEntity.ok(String.format(htmlTemplate, errorContent));
            }
        } else {
            log.warn("[VNPay] Invalid signature on return. Possible tampering detected!");
            String tamperedContent = "<div class='error-icon'>⚠</div><h1>Giao dịch không hợp lệ</h1><p>Phát hiện dấu hiệu giả mạo chữ ký (Sai Checksum).</p>";
            return ResponseEntity.ok(String.format(htmlTemplate, tamperedContent));
        }
    }

    /**
     * GET /api/vnpay/vnpay-ipn
     * VNPay Sandbox sẽ gọi IPN Webhook về server qua URL này để cập nhật trạng thái.
     */
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<String> vnpayIpn(HttpServletRequest request) {
        Map<String, String> fields = new HashMap<>();
        for (Enumeration<String> params = request.getParameterNames(); params.hasMoreElements();) {
            String fieldName = params.nextElement();
            String fieldValue = request.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                fields.put(fieldName, fieldValue);
            }
        }

        String vnp_SecureHash = request.getParameter("vnp_SecureHash");
        if (fields.containsKey("vnp_SecureHashType")) {
            fields.remove("vnp_SecureHashType");
        }
        if (fields.containsKey("vnp_SecureHash")) {
            fields.remove("vnp_SecureHash");
        }

        String signValue = vnPayConfig.hashAllFields(fields);
        if (!signValue.equals(vnp_SecureHash)) {
            log.warn("[VNPay IPN] Invalid signature.");
            return ResponseEntity.ok("{\"RspCode\":\"97\",\"Message\":\"Invalid signature\"}");
        }

        String vnp_TxnRef = request.getParameter("vnp_TxnRef");
        String vnp_ResponseCode = request.getParameter("vnp_ResponseCode");

        try {
            String orderInfo = request.getParameter("vnp_OrderInfo");
            if (orderInfo != null) {
                orderInfo = URLDecoder.decode(orderInfo, StandardCharsets.UTF_8);
                
                if (orderInfo.startsWith("BUDGET_")) {
                    if (transactionRepository.existsByNoteContaining(vnp_TxnRef)) {
                        log.info("[VNPay IPN] BUDGET transaction already processed. TxnRef={}", vnp_TxnRef);
                        return ResponseEntity.ok("{\"RspCode\":\"02\",\"Message\":\"Order already confirmed\"}");
                    }
                    
                    if ("00".equals(vnp_ResponseCode)) {
                        String[] parts = orderInfo.split("_");
                        if (parts.length >= 6) {
                            UUID userId = UUID.fromString(parts[1].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            UUID walletId = UUID.fromString(parts[2].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            UUID categoryId = UUID.fromString(parts[3].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            UUID budgetId = "null".equals(parts[4]) ? null : UUID.fromString(parts[4].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            BigDecimal amt = new BigDecimal(parts[5]);
                            
                            com.example.sharemoney.dto.request.CreateTransactionRequest req = new com.example.sharemoney.dto.request.CreateTransactionRequest();
                            req.setAmount(amt);
                            req.setCategoryId(categoryId);
                            req.setLinkedBudgetId(budgetId);
                            req.setNote("Thanh toán hoá đơn VNPay (TxnRef: " + vnp_TxnRef + ")");
                            
                            transactionService.createTransaction(userId, walletId, req);
                            log.info("[VNPay IPN] Auto-created transaction for budget payment. TxnRef={}", vnp_TxnRef);
                        }
                    }
                } else {
                    if (expenseRepository.existsByTitleContaining(vnp_TxnRef)) {
                        log.info("[VNPay IPN] DEBT settlement already processed. TxnRef={}", vnp_TxnRef);
                        return ResponseEntity.ok("{\"RspCode\":\"02\",\"Message\":\"Order already confirmed\"}");
                    }
                    
                    if ("00".equals(vnp_ResponseCode)) {
                        String[] parts = orderInfo.split("_");
                        if (parts.length >= 4) {
                            UUID groupId = UUID.fromString(parts[0].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            UUID debtorId = UUID.fromString(parts[1].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            UUID creditorId = UUID.fromString(parts[2].replaceFirst("(\\p{XDigit}{8})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}{4})(\\p{XDigit}+)", "$1-$2-$3-$4-$5"));
                            BigDecimal debtAmount = new BigDecimal(parts[3]);

                            ApproveSettleRequest settleReq = new ApproveSettleRequest();
                            settleReq.setDebtorId(debtorId);
                            settleReq.setAmount(debtAmount);
                            debtService.approveSettle(groupId, creditorId, settleReq, vnp_TxnRef);
                            log.info("[VNPay IPN] Debt settled successfully. TxnRef={}", vnp_TxnRef);
                        }
                    }
                }
            }
            return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
        } catch (Exception e) {
            log.error("[VNPay IPN] Error processing IPN: {}", e.getMessage(), e);
            return ResponseEntity.ok("{\"RspCode\":\"99\",\"Message\":\"Unknown error\"}");
        }
    }
}
