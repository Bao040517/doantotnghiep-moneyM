package com.example.sharemoney.controller;

import com.example.sharemoney.config.VNPayConfig;
import com.example.sharemoney.dto.request.ApproveSettleRequest;
import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.entity.PaymentOrder;
import com.example.sharemoney.entity.PaymentOrderStatus;
import com.example.sharemoney.entity.PaymentOrderType;
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
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final PaymentOrderRepository paymentOrderRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Value("${vnpay.frontendUrl:http://localhost:19006}")
    private String frontendUrl;

    /**
     * POST /api/vnpay/create-payment
     * Xác thực thông tin, tạo PaymentOrder với status PENDING vào DB trước,
     * sau đó tạo URL VNPay chứa đúng txnRef của đơn hàng.
     */
    @PostMapping("/create-payment")
    @Transactional
    public ResponseEntity<Map<String, String>> createPayment(
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID creditorId,
            @RequestParam(required = false) UUID walletId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID budgetId,
            @RequestParam long amount,
            @RequestParam(required = false, defaultValue = "DEBT") String type,
            HttpServletRequest request) {

        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            log.warn("[VNPay] Unauthorized create payment request");
            return ResponseEntity.status(401).build();
        }

        if (amount <= 0) {
            log.warn("[VNPay] Invalid payment amount: {}", amount);
            return ResponseEntity.badRequest().body(Map.of("message", "Số tiền thanh toán không hợp lệ"));
        }

        PaymentOrderType orderType;
        try {
            orderType = PaymentOrderType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            orderType = PaymentOrderType.DEBT;
        }

        String safeOrderInfo;

        if (orderType == PaymentOrderType.BUDGET) {
            if (walletId == null || categoryId == null) {
                log.warn("[VNPay] BUDGET payment missing walletId or categoryId");
                return ResponseEntity.badRequest().body(Map.of("message", "Thiếu thông tin ví hoặc danh mục chi tiêu"));
            }

            Wallet wallet = walletRepository.findById(walletId).orElse(null);
            if (wallet == null || !wallet.getUser().getId().equals(currentUserId)) {
                log.warn("[VNPay] Wallet not found or does not belong to user. walletId={}", walletId);
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Ví tiền không tồn tại hoặc không thuộc về bạn"));
            }

            if (!categoryRepository.existsById(categoryId)) {
                log.warn("[VNPay] Category not found. categoryId={}", categoryId);
                return ResponseEntity.badRequest().body(Map.of("message", "Danh mục chi tiêu không tồn tại"));
            }

            if (budgetId != null && !budgetRepository.existsById(budgetId)) {
                log.warn("[VNPay] Budget not found. budgetId={}", budgetId);
                return ResponseEntity.badRequest().body(Map.of("message", "Ngân sách chi tiêu không tồn tại"));
            }
        } else {
            if (groupId == null || creditorId == null) {
                log.warn("[VNPay] DEBT payment missing groupId or creditorId");
                return ResponseEntity.badRequest().body(Map.of("message", "Thiếu thông tin nhóm hoặc chủ nợ"));
            }

            if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, currentUserId)
                    || !groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, creditorId)) {
                log.warn("[VNPay] User not member of group. groupId={}, userId={}, creditorId={}", groupId,
                        currentUserId, creditorId);
                return ResponseEntity.badRequest().body(Map.of("message", "Bạn hoặc người nhận không thuộc nhóm này"));
            }
        }

        // Sinh mã tham chiếu txnRef duy nhất kèm vòng lặp kiểm tra chống trùng lặp DB
        String txnRef = null;
        for (int i = 0; i < 5; i++) {
            String candidate = vnPayService.generateTxnRef();
            if (!paymentOrderRepository.existsByTxnRef(candidate)) {
                txnRef = candidate;
                break;
            }
        }
        if (txnRef == null) {
            txnRef = "SM" + System.currentTimeMillis()
                    + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        }

        safeOrderInfo = (orderType == PaymentOrderType.BUDGET)
                ? "Thanh toan ngan sach " + txnRef
                : "Thanh toan no nhom " + txnRef;

        // Lưu đơn hàng vào DB trước khi redirect VNPay
        LocalDateTime now = LocalDateTime.now();
        PaymentOrder paymentOrder = PaymentOrder.builder()
                .txnRef(txnRef)
                .userId(currentUserId)
                .type(orderType)
                .amount(BigDecimal.valueOf(amount))
                .walletId(walletId)
                .categoryId(categoryId)
                .budgetId(budgetId)
                .groupId(groupId)
                .creditorId(creditorId)
                .status(PaymentOrderStatus.PENDING)
                .vnpOrderInfo(safeOrderInfo)
                .createdAt(now)
                .expiredAt(now.plusMinutes(15))
                .build();

        paymentOrderRepository.save(paymentOrder);
        log.info("[VNPay Order] Created PENDING order: txnRef={}, type={}, amount={}, userId={}",
                txnRef, orderType, amount, currentUserId);

        String ipAddress = request.getHeader("X-FORWARDED-FOR");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress.equals("0:0:0:0:0:0:0:1") || ipAddress.equals("127.0.0.1")
                || ipAddress.startsWith("10.") || ipAddress.startsWith("192.168.") || ipAddress.startsWith("172.")) {
            ipAddress = "113.160.225.97";
        }

        String paymentUrl = vnPayService.createPaymentUrl(txnRef, amount, null, ipAddress, safeOrderInfo);

        log.info("=========================================================");
        log.info("[VNPay] Đơn hàng: {} | Số tiền: {} VND | Loại: {}", txnRef, amount, orderType);
        log.info("=========================================================");

        Map<String, String> response = new HashMap<>();
        response.put("paymentUrl", paymentUrl);
        response.put("txnRef", txnRef);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/vnpay/vnpay-ipn
     * Webhook IPN từ VNPay - NGUỒN XÁC NHẬN DUY NHẤT.
     * Đảm bảo Idempotent, đối soát số tiền, tạo giao dịch trước và cập nhật trạng
     * thái trong cùng một transaction.
     */
    @GetMapping("/vnpay-ipn")
    @Transactional
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
        String vnp_TransactionStatus = request.getParameter("vnp_TransactionStatus");
        String vnp_AmountStr = request.getParameter("vnp_Amount");

        if (vnp_TxnRef == null || vnp_TxnRef.isEmpty()) {
            return ResponseEntity.ok("{\"RspCode\":\"01\",\"Message\":\"Order not found\"}");
        }

        try {
            PaymentOrder order = paymentOrderRepository.findByTxnRef(vnp_TxnRef).orElse(null);
            if (order == null) {
                log.warn("[VNPay IPN] Order not found: txnRef={}", vnp_TxnRef);
                return ResponseEntity.ok("{\"RspCode\":\"01\",\"Message\":\"Order not found\"}");
            }

            if (vnp_AmountStr == null || vnp_AmountStr.isEmpty()) {
                log.warn("[VNPay IPN] Missing vnp_Amount parameter");
                return ResponseEntity.ok("{\"RspCode\":\"04\",\"Message\":\"Invalid amount\"}");
            }

            long vnpAmount;
            try {
                vnpAmount = Long.parseLong(vnp_AmountStr) / 100;
            } catch (NumberFormatException e) {
                log.warn("[VNPay IPN] NumberFormatException for vnp_Amount: {}", vnp_AmountStr);
                return ResponseEntity.ok("{\"RspCode\":\"04\",\"Message\":\"Invalid amount\"}");
            }

            if (order.getAmount().longValue() != vnpAmount) {
                log.warn("[VNPay IPN] Invalid amount. DB={}, VNPay={}", order.getAmount(), vnpAmount);
                return ResponseEntity.ok("{\"RspCode\":\"04\",\"Message\":\"Invalid amount\"}");
            }

            // Chống gọi lặp (Idempotency check)
            if (order.getStatus() != PaymentOrderStatus.PENDING) {
                log.info("[VNPay IPN] Order already confirmed. txnRef={}, status={}", vnp_TxnRef, order.getStatus());
                return ResponseEntity.ok("{\"RspCode\":\"02\",\"Message\":\"Order already confirmed\"}");
            }

            order.setVnpTransactionNo(request.getParameter("vnp_TransactionNo"));
            order.setVnpBankCode(request.getParameter("vnp_BankCode"));
            order.setVnpCardType(request.getParameter("vnp_CardType"));
            order.setVnpPayDate(request.getParameter("vnp_PayDate"));
            order.setVnpResponseCode(vnp_ResponseCode);

            boolean isSuccess = "00".equals(vnp_ResponseCode)
                    && (vnp_TransactionStatus == null || "00".equals(vnp_TransactionStatus));

            if (isSuccess) {
                // 1. Tạo Transaction / Settlement TRƯỚC
                if (order.getType() == PaymentOrderType.BUDGET) {
                    CreateTransactionRequest txReq = new CreateTransactionRequest();
                    txReq.setAmount(order.getAmount());
                    txReq.setCategoryId(order.getCategoryId());
                    txReq.setLinkedBudgetId(order.getBudgetId());
                    txReq.setNote("Thanh toán hoá đơn VNPay (Mã ĐH: " + vnp_TxnRef + ")");

                    transactionService.createTransaction(order.getUserId(), order.getWalletId(), txReq);
                    log.info("[VNPay IPN] Successfully created transaction for BUDGET order. txnRef={}", vnp_TxnRef);
                } else if (order.getType() == PaymentOrderType.DEBT) {
                    ApproveSettleRequest settleReq = new ApproveSettleRequest();
                    settleReq.setDebtorId(order.getUserId());
                    settleReq.setAmount(order.getAmount());
                    debtService.approveSettle(order.getGroupId(), order.getCreditorId(), settleReq, vnp_TxnRef);
                    log.info("[VNPay IPN] Successfully settled DEBT order. txnRef={}", vnp_TxnRef);
                }

                // 2. Chỉ khi tạo Transaction thành công mới chuyển order sang SUCCESS
                order.setStatus(PaymentOrderStatus.SUCCESS);
                order.setPaidAt(LocalDateTime.now());
                paymentOrderRepository.save(order);
            } else {
                PaymentOrderStatus failedStatus = "24".equals(vnp_ResponseCode)
                        ? PaymentOrderStatus.CANCELLED
                        : PaymentOrderStatus.FAILED;
                order.setStatus(failedStatus);
                paymentOrderRepository.save(order);
                log.warn("[VNPay IPN] Payment failed/cancelled for txnRef={}, ResponseCode={}, TransactionStatus={}",
                        vnp_TxnRef, vnp_ResponseCode, vnp_TransactionStatus);
            }

            return ResponseEntity.ok("{\"RspCode\":\"00\",\"Message\":\"Confirm Success\"}");
        } catch (Exception e) {
            log.error("[VNPay IPN] Error processing IPN for txnRef={}: {}", vnp_TxnRef, e.getMessage(), e);
            return ResponseEntity.ok("{\"RspCode\":\"99\",\"Message\":\"Unknown error\"}");
        }
    }

    /**
     * GET /api/vnpay/vnpay-return
     * Chỉ phục vụ hiển thị kết quả cho người dùng trên trình duyệt dựa theo trạng
     * thái DB thực tế.
     * TUYỆT ĐỐI KHÔNG TẠO GIAO DỊCH TẠI ĐÂY.
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
        String vnp_TxnRef = request.getParameter("vnp_TxnRef");

        String redirectDeepLink;
        if (signValue.equals(vnp_SecureHash)) {
            redirectDeepLink = "sharemoney://vnpay-result?txnRef=" + vnp_TxnRef;
        } else {
            log.warn("[VNPay] Invalid signature on return. Checksum mismatch!");
            redirectDeepLink = "sharemoney://vnpay-result?error=invalid_signature";
        }

        String htmlBridge = "<!DOCTYPE html><html lang='vi'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
            "<title>Đang chuyển hướng...</title></head><body style='text-align: center; font-family: sans-serif; padding-top: 50px; background-color: #f8fafc;'>" +
            "<h2 style='color: #0f172a;'>Đang quay lại ứng dụng ShareMoney...</h2>" +
            "<p style='color: #64748b; margin-bottom: 24px;'>Nếu ứng dụng không tự mở, vui lòng bấm nút bên dưới:</p>" +
            "<a href='" + redirectDeepLink + "' style='display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;'>Mở lại ShareMoney</a>" +
            "<script>window.location.href = '" + redirectDeepLink + "';</script>" +
            "</body></html>";

        return ResponseEntity.ok(htmlBridge);
    }

    /**
     * GET /api/vnpay/portal/{txnRef}
     * Trang Cổng Thanh Toán Web VNPay Sandbox độc lập.
     * Cho phép người dùng thanh toán trên trình duyệt web ngoài app,
     * tự động gọi webhook IPN và chuyển tiếp kết quả về App qua Deep Link.
     */
    @GetMapping(value = "/portal/{txnRef}", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> getPaymentPortal(@PathVariable String txnRef) {
        PaymentOrder order = paymentOrderRepository.findByTxnRef(txnRef).orElse(null);
        if (order == null) {
            return ResponseEntity.ok("<html><body style='font-family:sans-serif;text-align:center;padding-top:50px;'><h2>Không tìm thấy đơn hàng hoặc đơn hàng đã hết hạn!</h2></body></html>");
        }

        String formattedAmount = NumberFormat.getNumberInstance(Locale.GERMANY).format(order.getAmount());
        String appRedirectUrl = "sharemoney://vnpay-result?txnRef=" + txnRef;

        String html = "<!DOCTYPE html>" +
            "<html lang='vi'>" +
            "<head>" +
            "<meta charset='UTF-8'>" +
            "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
            "<title>Cổng Thanh Toán VNPay Sandbox - ShareMoney</title>" +
            "<style>" +
            "* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }" +
            "body { background: #f1f5f9; padding: 16px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }" +
            ".portal-card { background: #fff; width: 100%; max-width: 440px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0; }" +
            ".header { background: #005baa; color: #fff; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; }" +
            ".brand { font-size: 22px; font-weight: 900; letter-spacing: 0.5px; }" +
            ".brand span { color: #e11d48; }" +
            ".badge-sandbox { background: #e11d48; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; }" +
            ".order-info { padding: 18px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }" +
            ".row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #64748b; }" +
            ".row-val { font-weight: 700; color: #0f172a; }" +
            ".amount-row { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; }" +
            ".amount-val { font-size: 22px; font-weight: 900; color: #005baa; }" +
            ".content { padding: 20px; text-align: center; }" +
            ".qr-box { background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 14px; display: inline-block; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }" +
            ".qr-img { width: 210px; height: 210px; display: block; margin: 0 auto; border-radius: 8px; }" +
            ".instruction { font-size: 12px; color: #475569; margin-bottom: 18px; line-height: 1.5; }" +
            ".btn-pay { width: 100%; background: #16a34a; color: #fff; border: none; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3); transition: all 0.2s; }" +
            ".btn-pay:active { transform: scale(0.98); background: #15803d; }" +
            ".btn-cancel { width: 100%; background: transparent; color: #64748b; border: 1px solid #cbd5e1; padding: 11px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 10px; }" +
            ".status-box { display: none; padding: 30px 20px; text-align: center; }" +
            ".check-icon { width: 60px; height: 60px; background: #dcfce7; color: #16a34a; font-size: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class='portal-card'>" +
            "  <div class='header'>" +
            "    <div class='brand'>VN<span>PAY</span></div>" +
            "    <div class='badge-sandbox'>Sandbox Gateway</div>" +
            "  </div>" +
            "  <div class='order-info'>" +
            "    <div class='row'><span>Đơn vị chấp nhận:</span><span class='row-val'>SHAREMONEY VIETNAM</span></div>" +
            "    <div class='row'><span>Mã giao dịch:</span><span class='row-val'>" + txnRef + "</span></div>" +
            "    <div class='row'><span>Nội dung:</span><span class='row-val'>" + order.getVnpOrderInfo() + "</span></div>" +
            "    <div class='amount-row'><span>Số tiền thanh toán:</span><span class='amount-val'>" + formattedAmount + " ₫</span></div>" +
            "  </div>" +
            "  <div id='payment-form' class='content'>" +
            "    <div class='qr-box'>" +
            "      <img class='qr-img' src='https://img.vietqr.io/image/970422-10928888998-compact2.png?amount=" + order.getAmount().longValue() + "&addInfo=" + URLEncoder.encode(order.getVnpOrderInfo(), StandardCharsets.UTF_8) + "&accountName=SHAREMONEY%20VIETNAM' alt='VNPay-QR' />" +
            "    </div>" +
            "    <p class='instruction'>Quét mã bằng ứng dụng Ngân hàng (MB, VCB, TCB, BIDV, MoMo) hoặc bấm nút bên dưới để thanh toán.</p>" +
            "    <button id='btnSubmit' class='btn-pay' onclick='executePayment()'>⚡ XÁC NHẬN THANH TOÁN " + formattedAmount + " ₫</button>" +
            "    <button class='btn-cancel' onclick='cancelPayment()'>Hủy và quay lại ứng dụng</button>" +
            "  </div>" +
            "  <div id='success-box' class='status-box'>" +
            "    <div class='check-icon'>✓</div>" +
            "    <h3 style='color:#0f172a; margin-bottom:6px;'>Thanh Toán Thành Công!</h3>" +
            "    <p style='color:#64748b; font-size:13px; margin-bottom:20px;'>Đã hoàn tất thanh toán " + formattedAmount + " ₫. Đang chuyển tiếp về ShareMoney App...</p>" +
            "    <a href='" + appRedirectUrl + "' style='display:inline-block; background:#005baa; color:#fff; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:bold; font-size:14px;'>Quay Lại ShareMoney App</a>" +
            "  </div>" +
            "</div>" +
            "<script>" +
            "function executePayment() {" +
            "  var btn = document.getElementById('btnSubmit');" +
            "  btn.innerText = 'Đang xử lý giao dịch...';" +
            "  btn.disabled = true;" +
            "  fetch('/api/vnpay/simulate-success?txnRef=" + txnRef + "', { method: 'POST' })" +
            "    .then(function(res) { return res.json(); })" +
            "    .then(function(data) {" +
            "      document.getElementById('payment-form').style.display = 'none';" +
            "      document.getElementById('success-box').style.display = 'block';" +
            "      setTimeout(function() { window.location.href = '" + appRedirectUrl + "'; }, 1200);" +
            "    })" +
            "    .catch(function(err) {" +
            "      alert('Có lỗi xảy ra khi xác nhận giao dịch');" +
            "      btn.innerText = '⚡ XÁC NHẬN THANH TOÁN " + formattedAmount + " ₫';" +
            "      btn.disabled = false;" +
            "    });" +
            "}" +
            "function cancelPayment() {" +
            "  window.location.href = 'sharemoney://vnpay-result?status=cancelled';" +
            "}" +
            "</script>" +
            "</body>" +
            "</html>";

        return ResponseEntity.ok(html);
    }

    /**
     * POST /api/vnpay/simulate-success
     * Thực thi thanh toán và webhook IPN từ Cổng Sandbox Web ngoài.
     */
    @PostMapping("/simulate-success")
    @Transactional
    public ResponseEntity<?> simulateSuccess(@RequestParam String txnRef) {
        // Yêu cầu xác thực JWT (endpoint đã bị xóa khỏi permitAll)
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        PaymentOrder order = paymentOrderRepository.findByTxnRef(txnRef).orElse(null);
        if (order == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Order not found"));
        }

        // Kiểm tra ownership: chỉ chủ đơn hàng mới được simulate
        if (!order.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(Map.of("message", "Not your order"));
        }

        if (order.getStatus() == PaymentOrderStatus.SUCCESS) {
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Order already processed"));
        }

        if (order.getType() == PaymentOrderType.BUDGET) {
            CreateTransactionRequest txReq = new CreateTransactionRequest();
            txReq.setAmount(order.getAmount());
            txReq.setCategoryId(order.getCategoryId());
            txReq.setLinkedBudgetId(order.getBudgetId());
            txReq.setNote("Thanh toán Cổng VNPay Gateway (" + txnRef + ")");
            transactionService.createTransaction(order.getUserId(), order.getWalletId(), txReq);
            log.info("[VNPay Portal] Successfully created transaction for BUDGET order: {}", txnRef);
        } else if (order.getType() == PaymentOrderType.DEBT) {
            ApproveSettleRequest settleReq = new ApproveSettleRequest();
            settleReq.setDebtorId(order.getUserId());
            settleReq.setAmount(order.getAmount());
            debtService.approveSettle(order.getGroupId(), order.getCreditorId(), settleReq, txnRef);
            log.info("[VNPay Portal] Successfully settled DEBT order: {}", txnRef);
        }

        order.setStatus(PaymentOrderStatus.SUCCESS);
        order.setPaidAt(LocalDateTime.now());
        order.setVnpResponseCode("00");
        paymentOrderRepository.save(order);

        return ResponseEntity.ok(Map.of("status", "SUCCESS", "txnRef", txnRef));
    }

    /**
     * GET /api/vnpay/orders/{txnRef}
     * Frontend polling trạng thái đơn hàng từ DB.
     * Yêu cầu kiểm tra Ownership bằng JWT currentUserId.
     */
    @GetMapping("/orders/{txnRef}")
    public ResponseEntity<?> getOrderStatus(@PathVariable String txnRef) {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(401).build();
        }

        PaymentOrder order = paymentOrderRepository.findByTxnRef(txnRef).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }

        if (!order.getUserId().equals(currentUserId)) {
            return ResponseEntity.status(403).body(Map.of("message", "You do not have permission to view this order"));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("txnRef", order.getTxnRef());
        result.put("status", order.getStatus().name());
        result.put("amount", order.getAmount());
        result.put("type", order.getType().name());

        return ResponseEntity.ok(result);
    }
}
