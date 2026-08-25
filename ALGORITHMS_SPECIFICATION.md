# ĐẶC TẢ KIẾN TRÚC VÀ CHI TIẾT CÁC THUẬT TOÁN HỆ THỐNG SHAREMONEY

Tài liệu này tổng hợp và mô hình hóa toàn bộ 11 thuật toán cốt lõi đang hoạt động trong hệ sinh thái ShareMoney (Bao gồm Backend Spring Boot, Dữ liệu PostgreSQL, và Ứng dụng Di động).

---

## 1. Thuật toán Tối ưu hóa & Tinh giản Công nợ Nhóm (Debt Simplification - Greedy Min Cash Flow)

### 1.1 Mục tiêu & Bài toán
Trong một nhóm gồm $N$ thành viên cùng chia sẻ chi phí qua nhiều hóa đơn, ma trận nợ nần chéo nhau có thể phát sinh tới $O(N^2)$ giao dịch đơn lẻ, tạo ra các vòng tròn nợ luẩn quẩn ($A \rightarrow B \rightarrow C \rightarrow A$).
* **Mục tiêu**: Giảm thiểu tối đa số lượng lệnh chuyển tiền thực tế cần thực hiện (chỉ còn tối đa $N - 1$ giao dịch).

### 1.2 Mô hình hóa Toán học & Dòng chảy Xử lý
```
[Sơ đồ nợ ban đầu: 5 giao dịch]                 [Sau thuật toán Greedy: 2 giao dịch]
  - A nợ B: 50.000đ                               - A trả B: 50.000đ
  - A nợ C: 50.000đ             =======>          - A trả C: 50.000đ
  - B nợ C: 50.000đ                               (Triệt tiêu toàn bộ nợ chéo)
  - B nợ D: 20.000đ
  - D nợ A: 30.000đ
```

1. **Bước 1: Tính Số dư ròng (Net Balance)**
   $$\text{Balance}[u] = \sum \text{Khoản } u \text{ được nợ (Creditor)} - \sum \text{Khoản } u \text{ đang nợ (Debtor)}$$
   *Ràng buộc bất biến*: $\sum_{u \in \text{Group}} \text{Balance}[u] = 0$.

2. **Bước 2: Vòng lặp Khớp lệnh Tham lam (Greedy Matching)**
   * Đặt ngưỡng sai số $\epsilon = 0.01$ (loại bỏ sai số số học).
   * Lặp cho đến khi hết nợ:
     * Chủ nợ lớn nhất: $\text{maxCreditor} = \arg\max (\text{Balance}[u])$ với giá trị $\text{maxCredit}$.
     * Con nợ lớn nhất: $\text{maxDebtor} = \arg\min (\text{Balance}[u])$ với giá trị $\text{maxDebt}$.
     * Nếu $\text{maxCredit} < \epsilon$, dừng thuật toán.
     * Số tiền chuyển khoản:
       $$\text{payment} = \min(\text{maxCredit}, |\text{maxDebt}|)$$
     * Khởi tạo giao dịch chuyển khoản từ $\text{maxDebtor}$ tới $\text{maxCreditor}$ số tiền $\text{payment}$.
     * Cập nhật số dư sổ cái:
       $$\text{Balance}[\text{maxCreditor}] \leftarrow \text{Balance}[\text{maxCreditor}] - \text{payment}$$
       $$\text{Balance}[\text{maxDebtor}] \leftarrow \text{Balance}[\text{maxDebtor}] + \text{payment}$$
     * Loại bỏ các tài khoản có $|\text{Balance}| < \epsilon$.

3. **Bước 3: Tự động đối trừ nợ (Settlement Expense)**
   * Khi hoàn tất thanh toán, hệ thống tự động sinh `Expense` loại `SETTLEMENT` có `payer = Debtor` và `splits = Creditor`. Số dư Ledger tự động cân bằng mà không làm mất vết kiểm toán.

* **Mã nguồn tham chiếu**: [DebtService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/DebtService.java#L44-L188)
* **Độ phức tạp**: Thời gian $O(N^2)$, Không gian $O(N)$.

---

## 2. Thuật toán Phân chia Chi phí Đa phương thức (Expense Splitting Algorithms)

### 2.1 Thuật toán Chia đều có bù phần dư (Fair Equal Split with Remainder Handling)
* **Bài toán**: Chia đều $M$ đồng cho $N$ người, phép chia lẻ có thể làm mất hoặc thừa một vài đồng/xu do làm tròn số học.
* **Nguyên lý**:
  $$\text{base} = \text{floor}\left(\frac{\text{totalAmount}}{N}, 2\right)$$
  $$\text{remainder} = \text{totalAmount} - (\text{base} \times N)$$
  * Thành viên đầu tiên ($i = 0$): $\text{amount}_0 = \text{base} + \text{remainder}$.
  * Các thành viên còn lại ($i \ge 1$): $\text{amount}_i = \text{base}$.
  * **Cam kết**: $\sum_{i=0}^{N-1} \text{amount}_i = \text{totalAmount}$ chính xác tuyệt đối $100\%$.

### 2.2 Thuật toán Chia tùy chỉnh theo món (Itemized / Custom Split)
* Kiểm tra điều kiện ràng buộc toàn vẹn dữ liệu:
  $$\sum_{u} \text{splitAmounts}[u] == \text{totalAmount}$$
  Nếu phát hiện chênh lệch dù chỉ 1 đồng $\rightarrow$ Ném ngoại lệ `CUSTOM_SPLIT_MISMATCH` và Rollback ACID Transaction.

* **Mã nguồn tham chiếu**: [ExpenseService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/ExpenseService.java#L375-L426)

---

## 3. Thuật toán Phát hiện Chi tiêu Bất thường (Statistical Anomaly Detection - Z-Score)

### 3.1 Mục tiêu
Cảnh báo thời gian thực khi người dùng phát sinh một khoản chi đột biến so với thói quen chi tiêu lịch sử trong cùng danh mục.

```
                  Phân phối chuẩn chi tiêu lịch sử
                             μ (Trung bình)
                                  │
                       ┌──────────┴──────────┐
                      ╱                       ╲
                     ╱                         ╲
                    ╱                           ╲
         ──────────┴──────────────┼──────────────┴──────────
                   μ - 2σ         μ           μ + 2σ      ▲ (Giao dịch mới: Z > 2.0 -> CẢNH BÁO!)
```

### 3.2 Các bước tính toán
1. Thu thập dữ liệu $N$ giao dịch trong $90$ ngày gần nhất cùng danh mục ($N \ge 3$, số tiền $\ge 100.000$đ).
2. **Tính Trung bình mẫu (Sample Mean $\mu$)**:
   $$\mu = \frac{1}{N} \sum_{i=1}^{N} x_i$$
3. **Tính Phương sai ($\sigma^2$) và Độ lệch chuẩn ($\sigma$)**:
   $$\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2 \quad \Longrightarrow \quad \sigma = \sqrt{\sigma^2}$$
4. **Tính điểm Z-Score**:
   $$Z = \frac{x_{\text{mới}} - \mu}{\sigma}$$
5. **Đánh giá và phát cảnh báo**:
   * Nếu $Z > 2.0$ (vùng ngoại lai xác suất $< 2.5\%$): Gửi WebSocket Push Notification cảnh báo `SPENDING_ANOMALY`.
   * Fallback khi $\sigma = 0$: Cảnh báo nếu $x_{\text{mới}} > 3 \times \mu$.

* **Mã nguồn tham chiếu**: [AnomalyDetectionService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/AnomalyDetectionService.java#L33-L123)

---

## 4. Thuật toán Đánh giá Sức khỏe Tài chính Đa nhân tố (Financial Health Score)

### 4.1 Mô hình 4 Trụ cột Đánh giá
Điểm sức khỏe tài chính tổng hợp từ $0$ đến $100$ điểm:
$$\text{HealthScore} = \text{Score}_{\text{Savings}} + \text{Score}_{\text{Budget}} + \text{Score}_{\text{DTI}} + \text{Score}_{\text{Emergency}}$$

| Trụ cột | Điểm tối đa | Công thức & Điều kiện tính |
| :--- | :---: | :--- |
| **1. Tỷ lệ Tiết kiệm (Savings Ratio)** | **25đ** | $\text{SavingsRatio} = \frac{\text{Income} - \text{Expense}}{\text{Income}} \times 100\%$<br>• $\ge 20\% \rightarrow 25$đ<br>• $10\% - 19\% \rightarrow 15$đ<br>• $> 0\% \rightarrow 5$đ |
| **2. Tuân thủ Ngân sách (Budget Adherence)** | **25đ** | $\text{ExpenseRatio} = \frac{\text{Expense}}{\text{Income}} \times 100\%$<br>• $\le 50\% \rightarrow 25$đ<br>• $51\% - 80\% \rightarrow 15$đ<br>• $81\% - 99\% \rightarrow 5$đ |
| **3. Nợ trên Thu nhập (DTI - Debt to Income)** | **25đ** | $\text{TotalDebt} = \text{Group Debt} + \text{External Loan}$<br>$\text{DebtRatio} = \frac{\text{TotalDebt}}{\text{Income 3M}} \times 100\%$<br>• Không nợ / $\le 20\% \rightarrow 25$đ<br>• $21\% - 50\% \rightarrow 15$đ<br>• $51\% - 100\% \rightarrow 5$đ |
| **4. Quỹ Khẩn cấp (Emergency Reserve)** | **25đ** | Đánh giá mức độ tích lũy dòng tiền dự phòng ($\ge 15\% \rightarrow 25$đ). |

* **Xếp loại**: $\ge 80$: Tuyệt vời | $60 - 79$: Khá | $40 - 59$: Trung bình | $< 40$: Cảnh báo nguy cơ thâm hụt.
* **Mã nguồn tham chiếu**: [FinancialHealthService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/FinancialHealthService.java#L34-L206)

---

## 5. Thuật toán Tiền Nhàn Rỗi & Hạn Mức Chi Tiêu An Toàn (Safe-to-Spend & Idle Money)

### 5.1 Công thức Tính Hạn mức Chi tiêu Mỗi ngày
1. $\text{TotalIncome}$: Tổng thu nhập trong kỳ.
2. $\text{TotalBills} = \sum \max(\text{Limit}_{\text{Bill}}, \text{Spent}_{\text{Bill}})$ (khoản cố định).
3. $\text{FlexibleSpent} = \max(0, \text{TotalExpense} - \text{TotalBillSpent})$.
4. $\text{RawSafeBalance} = \max(0, \text{TotalIncome} - \text{TotalBills} - \text{FlexibleSpent})$.
5. $\text{TotalSavings} = 40\% \times \text{RawSafeBalance}$ (trích dự phòng tích lũy).
6. $\text{SafeBalanceTotal} = \text{RawSafeBalance} - \text{TotalSavings}$.
7. **Hạn mức an toàn mỗi ngày**:
   $$\text{SafeBalanceDaily} = \frac{\text{SafeBalanceTotal}}{\text{DaysLeft}}$$

### 5.2 Quy tắc Bảo vệ Quỹ Dự trữ (Safety Reserve Invariant)
$$\text{RequiredReserve} = \text{UnpaidBudgets} + \text{DebtOwing}$$
$$\text{IdleMoney} = \max(0, \text{WalletBalance} - \text{RequiredReserve})$$
*Nếu nạp tiền vào quỹ tiết kiệm vượt quá $\text{IdleMoney}$, hệ thống sẽ phát cảnh báo **Over-savings (Tiết kiệm quá mức làm cạn quỹ trả nợ)**.*

* **Mã nguồn tham chiếu**: [BudgetService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/BudgetService.java#L318-L387) và [SavingsGoalService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/SavingsGoalService.java#L83-L108)

---

## 6. Thuật toán Tự Động Phân Bổ Tiết Kiệm Tỷ Lệ Thuận (Proportional Auto-Allocation)

* **Mục đích**: Tự động gom tiền nhàn rỗi từ các ví để phân bổ vào nhiều mục tiêu tiết kiệm một cách công bằng theo tiến độ còn thiếu.
* **Quy trình tính toán**:
  1. **Ràng buộc Chu kỳ**: Mỗi tháng chỉ cho phép phân bổ tự động duy nhất 1 lần (`existsAutoAllocationInMonth`).
  2. $\text{AllocatableMoney} = \min(0.5 \times \text{IdleMoney}, \sum \text{Balance}_{\text{ActiveWallets}})$.
  3. Với mỗi mục tiêu $G_i$ có độ thiếu hụt $\Delta_i = \text{TargetAmount}_i - \text{CurrentAmount}_i$:
     $$\text{TotalRemaining} = \sum_{i} \Delta_i$$
     $$\text{Allocation}_i = \text{floor}\left(\text{AllocatableMoney} \times \frac{\Delta_i}{\text{TotalRemaining}}\right)$$
  4. **Thuật toán Trút ví lũy tiến (Progressive Wallet Drain)**: Duyệt các ví có số dư lớn nhất trước $\rightarrow$ Rút tiền lần lượt từng ví cho đến khi đủ $\text{Allocation}_i$.

* **Mã nguồn tham chiếu**: [SavingsGoalService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/SavingsGoalService.java#L225-L380)

* **Quy trình Tái Phân Bổ Khi Xóa Mục Tiêu (Re-allocation on Goal Deletion)**:
  * Do tiền tiết kiệm đã chuyển sang Tài khoản ngân hàng Tiết kiệm riêng biệt, khi người dùng xóa mục tiêu $G_{\text{del}}$ có số dư $S_{\text{freed}} > 0$:
  * **Bước 1**: Tìm các mục tiêu tiết kiệm còn lại $G_k \neq G_{\text{del}}$ chưa đạt $100\%$ tiến độ.
  * **Bước 2**: Tự động phân bổ $S_{\text{freed}}$ vào các mục tiêu còn lại theo tỷ lệ thiếu hụt $\Delta_k / \sum \Delta$, giúp số tiền tích lũy vẫn được giữ trọn vẹn trong Quỹ tiết kiệm ngân hàng.
  * **Bước 3**: Nếu không còn mục tiêu nào khác hoặc sau khi lấp đầy 100% tất cả các mục tiêu mà vẫn còn dư, số tiền thừa mới được ghi nhận thu hồi về ví chính.

---

## 7. Hệ Thống Cố Vấn Tài Chính Chuyên Gia & Dự Báo (Financial Advisor Engine)

1. **Gợi ý Ngân sách 1 Chạm (Moving Average Outlier-Filtered)**:
   * Lấy lịch sử chi tiêu 3 tháng gần nhất, lọc bỏ các tháng có chi phí $> 2 \times \text{Mean}$.
   * Làm tròn lên bội số $50.000$đ: $\text{SuggestedAmount} = \text{ceil}\left(\frac{\text{CleanAvg}}{50000}\right) \times 50000$.
2. **Dự báo Tốc độ Đốt tiền (Burn-Rate / Spending Velocity)**:
   * $\text{MonthProgress} = \frac{\text{DayOfMonth}}{\text{DaysInMonth}}$.
   * $\text{ProjectedSpend} = \frac{\text{CurrentSpent}}{\text{MonthProgress}}$.
   * Cảnh báo nếu $\text{ProjectedSpend} > 1.3 \times \text{Avg3Months}$ (tăng trên $30\%$).
3. **Phân tích Thói quen 50/30/20**:
   * Phân loại tự động: Needs ($50\%$), Wants ($30\%$), Savings ($20\%$).
   * Đưa ra mức cắt giảm cụ thể: $\Delta_{\text{Wants}} = \text{WantsAmount} - (30\% \times \text{Income})$.
4. **Tái cân bằng Ngân sách Phân tầng Động (Multi-Tier Dynamic Budget Rebalancing)**:
   * Khi 1 danh mục tiêu lố $\rightarrow$ Cắt giảm bù đắp từ **Tầng 1 (Hưởng thụ / Luxury)** trước $\rightarrow$ Sau đó mới đến **Tầng 2 (Sinh hoạt / Basic)**. Các khoản **Cố định (Fixed / Bills)** luôn được bảo vệ tuyệt đối.

* **Mã nguồn tham chiếu**: [FinancialAdvisorService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/FinancialAdvisorService.java#L167-L700)

---

## 8. Thuật toán Giới hạn Tần suất Truy cập (Fixed Window Rate Limiting)

* **Mục đích**: Ngăn chặn tấn công Brute-force mật khẩu và chống lạm dụng tài nguyên API.
* **Nguyên lý**:
  * Sử dụng `ConcurrentHashMap<String, RateLimitBucket>` với `AtomicInteger` (counter) và `AtomicLong` (windowStart).
  * Cửa sổ thời gian $60$ giây:
    * Nếu $\text{Now} - \text{WindowStart} > 60.000$ ms: Reset counter $= 1$.
    * Ngược lại: Counter tăng $1$. Nếu vượt ngưỡng ($60$ req/phút cho API thường, $10$ req/phút cho Auth), chặn và trả về HTTP 429 Too Many Requests.
  * Tự động dọn rác bộ nhớ (Memory Cleanup) định kỳ mỗi 10 phút.

* **Mã nguồn tham chiếu**: [RateLimitingFilter.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/security/RateLimitingFilter.java#L27-L117)

---

## 9. Thuật toán Chữ Ký Số & Mật Mã Toàn Vẹn (Cryptographic Security Algorithms)

1. **Băm mật khẩu BCrypt (Adaptive Slow Hash)**:
   * Cost factor $= 12$ ($2^{12} = 4.096$ vòng băm) kết hợp Salt ngẫu nhiên 128-bit.
2. **Ký số JWT (HMAC-SHA256)**:
   * Xác thực không trạng thái (Stateless). Băm `Header.Payload` với Secret Key.
3. **Chữ ký số VNPay (HMAC-SHA512)**:
   * Sắp xếp từ điển tham số $\rightarrow$ URL Encode UTF-8 $\rightarrow$ Băm `HmacSHA512`.
4. **Xác thực Webhook PayOS (HMAC-SHA256 & Constant-Time Verification)**:
   * Sắp xếp khóa qua `TreeMap` $\rightarrow$ Canonical string $\rightarrow$ Băm `HmacSHA256` đối chiếu chữ ký chống tấn công MITM.

* **Mã nguồn tham chiếu**: [VNPayService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/VNPayService.java), [PayOSService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/PayOSService.java), [JwtUtil.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/security/JwtUtil.java)

---

## 10. Thuật toán Xử Lý Bóc Tách Hóa Đơn (OCR & SSRF Defense)

1. **Bóc tách hóa đơn ảnh OCR (Mindee Computer Vision)**:
   * Gửi ảnh Multipart $\rightarrow$ Trích xuất cây thực thể `line_items` (tên món, số lượng, đơn giá, tổng tiền, thuế, tên quán).
2. **Phòng chống tấn công SSRF khi cào dữ liệu hóa đơn điện tử (SSRF Defense Algorithm)**:
   * Kiểm tra Scheme: Chỉ cho phép `http`/`https`.
   * Phân giải DNS kiểm tra toàn bộ danh sách IP: Chặn tuyệt đối IP loopback (`127.0.0.1`), IP nội bộ (dải `10.x.x.x`, `192.168.x.x`, `172.16.x.x`), Multicast và Link-local.
3. **Prompt Engineering & Dynamic Heuristic Fallback**:
   * Gọi LLM Gemini bóc tách JSON hoặc sinh tin nhắn đòi nợ theo ngữ cảnh cảm xúc. Khi mạng lỗi hoặc không có API Key, tự động chuyển sang bộ sinh tin nhắn dựa trên luật (Rule-based heuristic).

* **Mã nguồn tham chiếu**: [ReceiptScanService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/ReceiptScanService.java), [QrReceiptService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/QrReceiptService.java), [GeminiService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/GeminiService.java)

---

## 11. Thuật toán Tổng Hợp & Phân Tích Dòng Tiền Đa Chiều (Cashflow Aggregation)

1. **Cắt lát dòng tiền 4 tuần trong tháng (4-Week Dynamic Range Slicing)**:
   * Chia tháng thành 4 khoảng thời gian linh hoạt: Tuần 1 (1-7), Tuần 2 (8-14), Tuần 3 (15-21), Tuần 4 (22-hết tháng).
   * Tổng hợp thời gian thực: $\text{NetCashflow} = (\text{Income} + \text{DebtRecovery}) - (\text{Expense} + \text{DebtPayment})$.
2. **Tính tỷ trọng danh mục (Category Breakdown Percentage)**:
   * Tự động cộng gộp cả các giao dịch đơn lẻ lẫn các giao dịch chia nhỏ (Split Transactions):
     $$\text{Percentage}_k = \frac{\text{Amount}_k}{\sum \text{Amount}} \times 100\%$$

* **Mã nguồn tham chiếu**: [TransactionService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/TransactionService.java#L458-L761)

---

## BẢNG TỔNG HỢP 11 THUẬT TOÁN HỆ THỐNG

| STT | Tên thuật toán | Vị trí lớp (Service) | Mục đích nghiệp vụ cốt lõi | Độ phức tạp |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Greedy Min Cash Flow** | [DebtService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/DebtService.java) | Tinh giản công nợ nhóm tối thiểu ($N-1$ lệnh) | $O(N^2)$ |
| 2 | **Fair Equal & Custom Split** | [ExpenseService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/ExpenseService.java) | Chia tiền công bằng, xử lý phần dư làm tròn | $O(N)$ |
| 3 | **Z-Score Outlier Detection** | [AnomalyDetectionService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/AnomalyDetectionService.java) | Phát hiện chi tiêu bất thường theo thống kê | $O(M)$ |
| 4 | **Multi-factor Health Score** | [FinancialHealthService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/FinancialHealthService.java) | Chấm điểm sức khỏe tài chính đa chiều (0-100) | $O(1)$ |
| 5 | **Safe-to-Spend & Reserve** | [BudgetService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/BudgetService.java) | Tính hạn mức an toàn chi tiêu mỗi ngày | $O(K)$ |
| 6 | **Proportional Auto-Allocate** | [SavingsGoalService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/SavingsGoalService.java) | Phân bổ tiền nhàn rỗi tỷ lệ thuận vào quỹ | $O(G \times W)$ |
| 7 | **Moving Average & Burn-Rate** | [FinancialAdvisorService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/FinancialAdvisorService.java) | Cố vấn tài chính, cảnh báo tốc độ đốt tiền | $O(C)$ |
| 8 | **Fixed Window Rate Limiter** | [RateLimitingFilter.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/security/RateLimitingFilter.java) | Chống Spam / Brute-force mật khẩu | $O(1)$ |
| 9 | **HMAC-SHA512 / SHA256** | [VNPayService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/VNPayService.java), [PayOSService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/PayOSService.java) | Chữ ký số và bảo mật toàn vẹn thanh toán | $O(L \log L)$ |
| 10 | **SSRF DNS Defense & OCR** | [QrReceiptService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/QrReceiptService.java), [ReceiptScanService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/ReceiptScanService.java) | Bóc tách hóa đơn an toàn mạng | $O(T)$ |
| 11 | **Cashflow 4-Week Slicing** | [TransactionService.java](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/src/main/java/com/example/sharemoney/service/TransactionService.java) | Tổng hợp và phân tích dòng tiền đa chiều | $O(S)$ |
