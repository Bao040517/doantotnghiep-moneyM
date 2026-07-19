package com.example.sharemoney.service;

import com.example.sharemoney.entity.Transaction;
import com.example.sharemoney.entity.TransactionType;
import com.example.sharemoney.repository.TransactionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionService {

    private final TransactionRepository transactionRepository;
    private final NotificationService notificationService;

    // Khoảng thời gian thu thập dữ liệu (ngày)
    private static final int HISTORY_DAYS = 90;

    // Ngưỡng phát hiện bất thường (Z-Score)
    private static final double Z_SCORE_THRESHOLD = 2.0;

    // Ngưỡng tối thiểu của giao dịch để tránh báo động rác (VND)
    private static final BigDecimal MIN_AMOUNT_THRESHOLD = BigDecimal.valueOf(100000);

    /**
     * Thuật toán Statistical Anomaly Detection (Z-Score). Phát hiện nếu giao dịch mới cao bất
     * thường so với lịch sử cùng danh mục.
     */
    @Transactional
    public void detectAndAlert(Transaction tx) {
        try {
            if (tx.getType() != TransactionType.EXPENSE) return;
            if (tx.getAmount() == null || tx.getAmount().compareTo(MIN_AMOUNT_THRESHOLD) < 0)
                return;

            LocalDateTime from = tx.getTransactionDate().minusDays(HISTORY_DAYS);
            LocalDateTime to = tx.getTransactionDate();

            List<Transaction> pastTransactions =
                    transactionRepository.findRecentExpensesByCategory(
                            tx.getWallet().getUser().getId(),
                            tx.getCategory().getId(),
                            from,
                            to,
                            tx.getId() // Loại trừ chính giao dịch này ra khỏi kết quả
                            );

            // Cần ít nhất 3 giao dịch trong quá khứ để phân tích có ý nghĩa
            if (pastTransactions.size() < 3) return;

            // 1. Tính Mean (Trung bình)
            BigDecimal sum =
                    pastTransactions.stream()
                            .map(Transaction::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal mean =
                    sum.divide(
                            BigDecimal.valueOf(pastTransactions.size()), 2, RoundingMode.HALF_UP);

            // 2. Tính Variance (Phương sai)
            double varianceSum = 0;
            for (Transaction pTx : pastTransactions) {
                double diff = pTx.getAmount().subtract(mean).doubleValue();
                varianceSum += diff * diff;
            }
            double variance = varianceSum / pastTransactions.size();

            // 3. Tính Standard Deviation (Độ lệch chuẩn)
            double stdDev = Math.sqrt(variance);

            // Nếu độ lệch chuẩn bằng 0 (tất cả các giao dịch quá khứ đều bằng nhau)
            if (stdDev == 0) {
                // Rơi vào fallback: nếu gấp 3 lần trung bình thì báo
                if (tx.getAmount().compareTo(mean.multiply(BigDecimal.valueOf(3))) > 0) {
                    sendAnomalyAlert(tx, mean.doubleValue());
                }
                return;
            }

            // 4. Tính Z-Score
            double zScore = (tx.getAmount().doubleValue() - mean.doubleValue()) / stdDev;

            // 5. Đánh giá và Cảnh báo
            if (zScore > Z_SCORE_THRESHOLD) {
                sendAnomalyAlert(tx, mean.doubleValue());
            }

        } catch (Exception e) {
            log.error(
                    "[AnomalyDetection] Failed to calculate Z-Score for tx {}: {}",
                    tx.getId(),
                    e.getMessage());
        }
    }

    private void sendAnomalyAlert(Transaction tx, double mean) {
        String formatAmount = String.format("%,.0fđ", tx.getAmount().doubleValue());
        String formatMean = String.format("%,.0fđ", mean);

        String message =
                String.format(
                        "Cảnh báo chi tiêu bất thường! Bạn vừa chi %s cho '%s'. "
                                + "Mức này cao hơn nhiều so với trung bình %s của bạn.",
                        formatAmount, tx.getCategory().getName(), formatMean);

        notificationService.sendNotification(
                tx.getWallet().getUser().getId(), message, "SPENDING_ANOMALY");

        log.info(
                "[AnomalyDetection] Anomaly detected for User {} Category {}. Z-Score triggered. Tx Amount: {}, Mean: {}",
                tx.getWallet().getUser().getId(),
                tx.getCategory().getName(),
                tx.getAmount(),
                mean);
    }
}
