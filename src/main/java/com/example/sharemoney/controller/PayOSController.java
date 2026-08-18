package com.example.sharemoney.controller;

import com.example.sharemoney.dto.request.ApproveSettleRequest;
import com.example.sharemoney.dto.request.CreateTransactionRequest;
import com.example.sharemoney.entity.PaymentOrder;
import com.example.sharemoney.entity.PaymentOrderStatus;
import com.example.sharemoney.entity.PaymentOrderType;
import com.example.sharemoney.entity.Wallet;
import com.example.sharemoney.repository.PaymentOrderRepository;
import com.example.sharemoney.repository.WalletRepository;
import com.example.sharemoney.security.SecurityUtils;
import com.example.sharemoney.service.DebtService;
import com.example.sharemoney.service.PayOSService;
import com.example.sharemoney.service.TransactionService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/payos")
@RequiredArgsConstructor
public class PayOSController {

    private final PayOSService payOSService;
    private final PaymentOrderRepository paymentOrderRepository;
    private final DebtService debtService;
    private final TransactionService transactionService;
    private final WalletRepository walletRepository;

    /**
     * POST /api/payos/create-payment-link
     */
    @PostMapping("/create-payment-link")
    @Transactional
    public ResponseEntity<Map<String, Object>> createPaymentLink(
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID creditorId,
            @RequestParam(required = false) UUID walletId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID budgetId,
            @RequestParam(required = false) Long amount,
            @RequestParam(required = false) String description) {

        UUID currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", -1);
            err.put("message", "Authentication required");
            return ResponseEntity.status(401).body(err);
        }

        long finalAmount = amount != null ? amount : 50000L;
        long orderCode = System.currentTimeMillis() % 1000000000L + (long) (Math.random() * 1000L);
        String txnRef = "POS" + orderCode;

        PaymentOrderType orderType = (groupId != null && creditorId != null) ? PaymentOrderType.DEBT : PaymentOrderType.BUDGET;

        // Lưu đơn hàng PENDING vào Database
        PaymentOrder order = PaymentOrder.builder()
                .txnRef(txnRef)
                .userId(currentUserId)
                .type(orderType)
                .amount(BigDecimal.valueOf(finalAmount))
                .groupId(groupId)
                .creditorId(creditorId)
                .walletId(walletId)
                .categoryId(categoryId)
                .budgetId(budgetId)
                .status(PaymentOrderStatus.PENDING)
                .vnpOrderInfo(description != null ? description : "Thanh toan PayOS " + txnRef)
                .expiredAt(LocalDateTime.now().plusMinutes(15))
                .build();

        paymentOrderRepository.save(order);

        // Gọi PayOS API tạo Link thanh toán chuẩn
        Map<String, Object> payosResult = payOSService.createPaymentLink(orderCode, finalAmount, description, null, null);
        payosResult.put("txnRef", txnRef);

        if (payosResult.containsKey("description") && payosResult.get("description") != null) {
            order.setVnpOrderInfo(String.valueOf(payosResult.get("description")));
            paymentOrderRepository.save(order);
        }

        return ResponseEntity.ok(payosResult);
    }

    /**
     * GET /api/payos/order/{orderCode}
     */
    @GetMapping("/order/{orderCode}")
    public ResponseEntity<Map<String, Object>> getOrderStatus(@PathVariable String orderCode) {
        String safeTxn = orderCode.startsWith("POS") ? orderCode : "POS" + orderCode;
        return paymentOrderRepository.findByTxnRef(safeTxn)
                .or(() -> paymentOrderRepository.findByTxnRef(orderCode))
                .map(order -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("orderCode", orderCode);
                    res.put("txnRef", order.getTxnRef());
                    res.put("amount", order.getAmount());
                    res.put("status", order.getStatus().name());
                    res.put("type", order.getType().name());
                    res.put("paidAt", order.getPaidAt());
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> {
                    Map<String, Object> notFound = new HashMap<>();
                    notFound.put("orderCode", orderCode);
                    notFound.put("status", "NOT_FOUND");
                    return ResponseEntity.ok(notFound);
                });
    }

    /**
     * POST /api/payos/webhook (Webhook nhận kết quả tức thời từ PayOS Server)
     */
    @PostMapping("/webhook")
    @Transactional
    public ResponseEntity<Map<String, Object>> handlePayOSWebhook(@RequestBody Map<String, Object> webhookPayload) {
        log.info("[PayOS Webhook] Received notification: {}", webhookPayload);

        Map<String, Object> response = new HashMap<>();
        try {
            if (webhookPayload.containsKey("data")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) webhookPayload.get("data");
                String signature = (String) webhookPayload.get("signature");

                // Xác thực chữ ký PayOS
                boolean isValid = payOSService.verifyWebhookSignature(data, signature);
                if (!isValid) {
                    log.warn("[PayOS Webhook] Signature verification failed!");
                    response.put("error", -1);
                    response.put("message", "Invalid signature");
                    return ResponseEntity.status(400).body(response);
                }

                Object orderCodeObj = data.get("orderCode");
                String orderCodeStr = String.valueOf(orderCodeObj);
                String txnRef = "POS" + orderCodeStr;

                PaymentOrder order = paymentOrderRepository.findByTxnRef(txnRef)
                        .or(() -> paymentOrderRepository.findByTxnRef(orderCodeStr))
                        .orElse(null);

                if (order != null && order.getStatus() == PaymentOrderStatus.PENDING) {
                    order.setStatus(PaymentOrderStatus.SUCCESS);
                    order.setPaidAt(LocalDateTime.now());
                    paymentOrderRepository.save(order);

                    // Xử lý ghi nhận chi tiêu hoặc trả nợ nhóm
                    processPaymentOrderSuccess(order);
                    log.info("[PayOS Webhook] Order {} successfully marked as PAID!", order.getTxnRef());
                }
            }

            response.put("error", 0);
            response.put("message", "Ok");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[PayOS Webhook] Processing failed", e);
            response.put("error", -1);
            response.put("message", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    private void processPaymentOrderSuccess(PaymentOrder order) {
        try {
            if (order.getType() == PaymentOrderType.DEBT) {
                if (order.getGroupId() != null && order.getCreditorId() != null) {
                    ApproveSettleRequest settleReq = new ApproveSettleRequest();
                    settleReq.setDebtorId(order.getUserId());
                    settleReq.setAmount(order.getAmount());
                    debtService.approveSettle(order.getGroupId(), order.getCreditorId(), settleReq, order.getTxnRef());
                    log.info("[PayOS] Successfully settled DEBT order: {}", order.getTxnRef());
                }
            } else if (order.getType() == PaymentOrderType.BUDGET) {
                CreateTransactionRequest txReq = new CreateTransactionRequest();
                txReq.setAmount(order.getAmount());
                txReq.setCategoryId(order.getCategoryId());
                txReq.setLinkedBudgetId(order.getBudgetId());
                txReq.setNote(order.getVnpOrderInfo() != null ? order.getVnpOrderInfo() : "Thanh toán Cổng PayOS (" + order.getTxnRef() + ")");
                transactionService.createTransaction(order.getUserId(), order.getWalletId(), txReq);
                log.info("[PayOS] Successfully created transaction for BUDGET order: {}", order.getTxnRef());
            }
        } catch (Exception e) {
            log.error("[PayOS] Error auto-settling order: {}", order.getTxnRef(), e);
        }
    }
}
