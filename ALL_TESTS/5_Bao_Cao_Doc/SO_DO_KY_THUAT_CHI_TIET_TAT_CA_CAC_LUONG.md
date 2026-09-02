# 🏛️ SƠ ĐỒ KỸ THUẬT VÀ TRUY VẾT CHI TIẾT TẤT CẢ CÁC LUỒNG HỆ THỐNG SHAREMONEY
**Dự án**: ShareMoney - Personal Financial Management (PFM) & Smart Group Debt Settlement  
**Tài liệu phục vụ**: Thuyết minh Chi tiết Kiến trúc Hệ thống cho Hội đồng Giám khảo & Thầy Cô  
**Mô hình truy vết chuẩn 5 bước**:
> **1. Sự kiện kích hoạt (Event / Trigger)**  
> **2. API tiếp nhận (Endpoint & HTTP Method)**  
> **3. File & Lớp xử lý dữ liệu (Controller $\rightarrow$ Service $\rightarrow$ Helper)**  
> **4. Thao tác Cơ sở dữ liệu (Database Tables & SQL Execution)**  
> **5. Dữ liệu Phản hồi (HTTP Status & Response DTO Payload)**  

---

## 📑 MỤC LỤC CÁC PHÂN HỆ NGHIỆP VỤ

1. [Phân hệ 1: Xác thực, Phân quyền & Quên mật khẩu OTP](#1-phân-hệ-xác-thực-phân-quyền--quên-mật-khẩu-otp-auth)
2. [Phân hệ 2: Hồ sơ Người dùng & Ngân hàng VietQR](#2-phân-hệ-hồ-sơ-người-dùng--ngân-hàng-vietqr-user--profile)
3. [Phân hệ 3: Quản lý Ví Tài chính & Tài sản Ròng](#3-phân-hệ-quản-lý-ví-tài-chính--tài-sản-ròng-wallets)
4. [Phân hệ 4: Quản lý Giao dịch Thu/Chi Cá nhân & Bóc tách SMS](#4-phân-hệ-quản-lý-giao-dịch-thuchi-cá-nhân-transactions)
5. [Phân hệ 5: Quản lý Ngân sách & Cảnh báo Chi tiêu](#5-phân-hệ-quản-lý-ngân-sách--cảnh-báo-chi-tiêu-budgets)
6. [Phân hệ 6: Hũ Tiết kiệm Heo đất & Phân bổ Tự động](#6-phân-hệ-hũ-tiết-kiệm-heo-đất--phân-bổ-tự-động-savings)
7. [Phân hệ 7: Quản lý Nhóm Chi tiêu & Thuật toán Chia tiền](#7-phân-hệ-quản-lý-nhóm-chi-tiêu--thuật-toán-chia-tiền-groups--expenses)
8. [Phân hệ 8: Thuật toán Greedy Rút gọn Nợ & Quyết toán VietQR](#8-phân-hệ-thuật-toán-greedy-rút-gọn-nợ--quyết-toán-vietqr-debt-settlement)
9. [Phân hệ 9: Cổng Thanh toán Trực tuyến (VNPay & PayOS Open Banking)](#9-phân-hệ-cổng-thanh-toán-trực-tuyến-vnpay--payos)
10. [Phân hệ 10: Trí tuệ Nhân tạo AI Gemini & Điểm Sức khỏe Tài chính](#10-phân-hệ-trí-tuệ-nhân-tạo-ai-gemini--điểm-sức-khỏe-tài-chính-ai--health)
11. [Phân hệ 11: Phát hiện Dị thường Z-Score & Thông báo Thời gian thực](#11-phân-hệ-phát-hiện-dị-thường-z-score--thông-báo-thời-gian-thực-notifications)

---

## 1. PHÂN HỆ XÁC THỰC, PHÂN QUYỀN & QUÊN MẬT KHẨU OTP (AUTH)

---

### 🔹 Luồng 1.1: Đăng ký tài khoản người dùng mới (Register)
- **1. Sự kiện kích hoạt:** Người dùng điền Họ tên, Email (`@gmail.com`), Mật khẩu (>= 6 ký tự gồm chữ & số) trên `AuthScreen.tsx` và nhấn nút *"Đăng ký"*.
- **2. API tiếp nhận:** `POST /api/auth/register` (Công khai, đi qua `RateLimitingFilter`).
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `register(@Valid @RequestBody RegisterRequest request)`)
  - `AuthService.java` (chuẩn hóa email `trim().toLowerCase()`, mã hóa `PasswordEncoder.encode(password)`)
  - `JwtUtil.java` (sinh chuỗi Access Token 15 phút và Refresh Token 7 ngày)
  - `RefreshTokenService.java` (quản lý lưu trữ Refresh Token).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT COUNT(*) FROM users WHERE email = ?` (Kiểm tra trùng lặp).
  - `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'USER', NOW(), NOW())`.
  - `INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES (?, ?, 'Tiền mặt', 0, 'VND', false, NOW())` (Tự động khởi tạo ví mặc định).
  - `INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES (?, ?, ?, ?, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "refreshToken": "d8f3a2b1-9c8e-4a7f...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "c7a8b9e0-1234-5678-9abc-def012345678",
      "email": "vana@gmail.com",
      "name": "Nguyễn Văn A",
      "role": "USER"
    }
  }
  ```

---

### 🔹 Luồng 1.2: Đăng nhập hệ thống (Login)
- **1. Sự kiện kích hoạt:** Người dùng nhập Email & Mật khẩu trên `AuthScreen.tsx` và nhấn nút *"Đăng nhập"*.
- **2. API tiếp nhận:** `POST /api/auth/login`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `login()`)
  - `AuthenticationManager.java` $\rightarrow$ `CustomUserDetailsService.java` (truy vấn user và so khớp băm BCrypt)
  - `JwtUtil.java` & `RefreshTokenService.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM users WHERE email = ?`.
  - `INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES (?, ?, ?, ?, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "4b6a8c2d-...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": { "id": "...", "email": "...", "name": "...", "avatarUrl": "..." }
  }
  ```

---

### 🔹 Luồng 1.3: Làm mới Token tự động (Silent Token Refresh)
- **1. Sự kiện kích hoạt:** Một API bất kỳ trả về `HTTP 401 Unauthorized` do Access Token hết hạn (sau 15 phút). `client.ts` (Axios Interceptor) tự động bắt lỗi và kích hoạt hàng đợi refresh.
- **2. API tiếp nhận:** `POST /api/auth/refresh`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `refreshToken()`)
  - `RefreshTokenService.java` (hàm `verifyExpiration()`, `createRefreshToken()`).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM refresh_tokens WHERE token = ? AND revoked = false`.
  - `UPDATE refresh_tokens SET revoked = true WHERE id = ?` (Thu hồi token cũ - Token Rotation).
  - `INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES (?, ?, ?, ?, false)` (Cấp token mới).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "new-refresh-token-uuid...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
  ```

---

### 🔹 Luồng 1.4: Quên mật khẩu - Gửi mã OTP qua Gmail (Forgot Password)
- **1. Sự kiện kích hoạt:** Người dùng bấm *"Quên mật khẩu?"* trên modal `ForgotPasswordModal.tsx`, nhập địa chỉ Gmail và bấm *"Gửi mã xác thực"*.
- **2. API tiếp nhận:** `POST /api/auth/forgot-password`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `forgotPassword()`)
  - `UserRepository.java` (kiểm tra email tồn tại)
  - `OtpService.java` (sinh mã 6 số `SecureRandom`, lưu vào `ConcurrentHashMap` với TTL 300s, max 5 attempts)
  - `EmailService.java` (tạo email template HTML ShareMoney, gửi qua JavaMailSender).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM users WHERE email = ?` (Chỉ đọc, không ghi DB vì OTP lưu tạm bộ nhớ an toàn).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "status": "SUCCESS",
    "message": "Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!"
  }
  ```

---

### 🔹 Luồng 1.5: Xác thực OTP & Đặt lại mật khẩu mới (Reset Password)
- **1. Sự kiện kích hoạt:** Người dùng nhập mã OTP 6 số, Mật khẩu mới & Xác nhận mật khẩu mới trên `ForgotPasswordModal.tsx` và bấm *"Đổi mật khẩu"*.
- **2. API tiếp nhận:** `POST /api/auth/reset-password`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `resetPassword()`)
  - `OtpService.java` (hàm `validateOtp()`: kiểm tra mã, kiểm tra hết hạn, trừ số lần thử sai)
  - `PasswordEncoder.java` (băm mật khẩu mới bằng BCrypt)
  - `UserRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "status": "SUCCESS",
    "message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ."
  }
  ```

---

### 🔹 Luồng 1.6: Đăng xuất an toàn (Logout)
- **1. Sự kiện kích hoạt:** Người dùng bấm nút *"Đăng xuất"* trong tab Tài khoản (`ProfileScreen.tsx`).
- **2. API tiếp nhận:** `POST /api/auth/logout`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `logout()`)
  - `RefreshTokenService.java` (hàm `revokeToken()`).
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE refresh_tokens SET revoked = true WHERE token = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "status": "SUCCESS",
    "message": "Đăng xuất thành công!"
  }
  ```

---

## 2. PHÂN HỆ HỒ SƠ NGƯỜI DÙNG & NGÂN HÀNG VIETQR (USER & PROFILE)

---

### 🔹 Luồng 2.1: Xem thông tin cá nhân (Get Profile)
- **1. Sự kiện kích hoạt:** Người dùng mở ứng dụng hoặc chuyển sang tab Tài khoản `ProfileScreen.tsx`.
- **2. API tiếp nhận:** `GET /api/users/me` (Kèm Header `Authorization: Bearer <token>`).
- **3. File xử lý dữ liệu:**
  - `UserController.java` (hàm `getCurrentUser()`)
  - `UserService.java` $\rightarrow$ `UserRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM users WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "id": "c7a8b9e0-1234-5678-9abc-def012345678",
    "email": "vana@gmail.com",
    "name": "Nguyễn Văn A",
    "phoneNumber": "0986523787",
    "avatarUrl": "https://...",
    "bankBin": "970422",
    "bankAccountNo": "0986523787",
    "bankAccountName": "NGUYEN VAN A",
    "savingsBankBin": "970436",
    "savingsBankAccountNo": "1018273645",
    "savingsBankAccountName": "NGUYEN VAN A"
  }
  ```

---

### 🔹 Luồng 2.2: Cập nhật tài khoản ngân hàng chính VietQR
- **1. Sự kiện kích hoạt:** Người dùng chọn ngân hàng (VD: MBBank), nhập STK và nhấn nút *"Lưu thông tin"* trên `ProfileScreen.tsx`.
- **2. API tiếp nhận:** `PUT /api/users/me`.
- **3. File xử lý dữ liệu:**
  - `UserController.java` (hàm `updateProfile()`)
  - `UserService.java` (chuẩn hóa tên chủ thẻ in hoa không dấu)
  - `UserRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE users SET bank_bin = ?, bank_account_no = ?, bank_account_name = ?, updated_at = NOW() WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Trả về ProfileResponse mới nhất).

---

### 🔹 Luồng 2.3: Tra cứu tên chủ tài khoản ngân hàng Napas247 (VietQR Lookup)
- **1. Sự kiện kích hoạt:** Người dùng nhập xong STK và chuyển focus ra ngoài ô nhập liệu.
- **2. API tiếp nhận:** `POST /api/vietqr/lookup`.
- **3. File xử lý dữ liệu:**
  - `VietQrController.java` (hàm `lookupAccount()`)
  - `VietQrService.java` (gọi REST Client tới API Napas/VietQR Gateway).
- **4. Thao tác Cơ sở dữ liệu:** Không truy vấn DB (Chỉ gọi cổng trung gian Napas247).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "bankBin": "970422",
    "accountNumber": "0986523787",
    "accountName": "NGUYEN VAN A",
    "isValid": true
  }
  ```

---

## 3. PHÂN HỆ QUẢN LÝ VÍ TÀI CHÍNH & TÀI SẢN RÒNG (WALLETS)

---

### 🔹 Luồng 3.1: Lấy danh sách ví & Tính tổng tài sản ròng (Net Worth)
- **1. Sự kiện kích hoạt:** Màn hình Dashboard hoặc Quản lý ví tải dữ liệu.
- **2. API tiếp nhận:** `GET /api/wallets` và `GET /api/wallets/total-balance`.
- **3. File xử lý dữ liệu:**
  - `WalletController.java` (hàm `getAllWallets()`, `getTotalBalance()`)
  - `WalletService.java` (tính: $\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM wallets WHERE user_id = ? ORDER BY created_at ASC`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "totalBalance": 7000000.0,
    "totalAssets": 10000000.0,
    "totalLiabilities": 3000000.0,
    "currency": "VND"
  }
  ```

---

### 🔹 Luồng 3.2: Tạo ví tài chính mới (Ví Tiền mặt, Ngân hàng, Thẻ tín dụng)
- **1. Sự kiện kích hoạt:** Người dùng điền tên ví, số dư ban đầu, loại ví và bấm *"Tạo ví"* trên `WalletModal.tsx`.
- **2. API tiếp nhận:** `POST /api/wallets`.
- **3. File xử lý dữ liệu:**
  - `WalletController.java` (hàm `createWallet()`)
  - `WalletService.java` $\rightarrow$ `WalletRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO wallets (id, user_id, name, balance, currency, bank_bin, bank_account_no, bank_account_name, is_liability, created_at) VALUES (?, ?, ?, ?, 'VND', ?, ?, ?, ?, NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`
  ```json
  {
    "id": "e1f2a3b4-...",
    "name": "Tài khoản Vietcombank",
    "balance": 5000000.0,
    "currency": "VND",
    "isLiability": false
  }
  ```

---

### 🔹 Luồng 3.3: Xóa ví & Chặn xóa ví đã có lịch sử giao dịch
- **1. Sự kiện kích hoạt:** Người dùng bấm nút Xóa ví.
- **2. API tiếp nhận:** `DELETE /api/wallets/{walletId}`.
- **3. File xử lý dữ liệu:**
  - `WalletController.java` $\rightarrow$ `WalletService.java` $\rightarrow$ `TransactionRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT EXISTS(SELECT 1 FROM transactions WHERE wallet_id = ?)`
  - *Nếu có giao dịch:* Ném `AppException(ErrorCode.WALLET_HAS_TRANSACTIONS)` $\rightarrow$ Trả về `HTTP 400 Bad Request`.
  - *Nếu không có giao dịch:* `DELETE FROM wallets WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 204 No Content` (hoặc `HTTP 400` nếu có giao dịch).

---

## 4. PHÂN HỆ QUẢN LÝ GIAO DỊCH THU/CHI CÁ NHÂN (TRANSACTIONS)

---

### 🔹 Luồng 4.1: Thêm giao dịch Chi tiêu cá nhân (Expense Transaction)
- **1. Sự kiện kích hoạt:** Người dùng nhập số tiền (50.000đ), chọn Danh mục ("Ăn uống"), chọn Ví ("Tiền mặt") và bấm *"Lưu giao dịch"* trên `AddTransactionModal.tsx`.
- **2. API tiếp nhận:** `POST /api/transactions`.
- **3. File xử lý dữ liệu:**
  - `TransactionController.java` (hàm `createTransaction()`)
  - `TransactionService.java` (trừ số dư ví, cập nhật ngân sách liên quan)
  - `AnomalyDetectionService.java` (tính điểm Z-Score phát hiện chi tiêu bất thường)
  - `WalletRepository.java`, `TransactionRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM wallets WHERE id = ? FOR UPDATE` (Khóa dòng chống tranh chấp số dư).
  - `UPDATE wallets SET balance = balance - 50000 WHERE id = ?`.
  - `INSERT INTO transactions (id, wallet_id, category_id, amount, type, transaction_date, note, created_at) VALUES (?, ?, ?, 50000, 'EXPENSE', NOW(), ?, NOW())`.
  - `SELECT * FROM transactions WHERE user_id = ? AND category_id = ? ORDER BY transaction_date DESC LIMIT 20` (Đọc lịch sử để tính Z-Score).
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`
  ```json
  {
    "id": "t1a2b3c4-...",
    "amount": 50000.0,
    "type": "EXPENSE",
    "category": { "id": "...", "name": "Ăn uống", "icon": "🍔" },
    "wallet": { "id": "...", "name": "Tiền mặt", "balance": 4950000.0 },
    "transactionDate": "2026-09-02T12:30:00"
  }
  ```

---

### 🔹 Luồng 4.2: Tự động bắt biến động số dư từ Clipboard ngân hàng (Auto Bank Sniffer)
- **1. Sự kiện kích hoạt:** Người dùng vừa copy tin nhắn biến động số dư ngân hàng và mở ShareMoney.
- **2. API tiếp nhận:** Frontend xử lý tại chỗ qua `bankNotificationParser.ts` trong <1ms $\rightarrow$ Mở `BankNotificationModal.tsx` $\rightarrow$ Khi bấm *"Xác nhận"* gọi `POST /api/transactions`.
- **3. File xử lý dữ liệu:**
  - Frontend: `bankNotificationParser.ts` (bóc tách Regex số tiền, loại biến động +/- và tên cửa hàng).
  - Backend: `TransactionService.java`.
- **4. Thao tác Cơ sở dữ liệu:** (Tương tự Luồng 4.1).
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` kèm Toast *"Ghi nhận tự động thành công!"*.

---

## 5. PHÂN HỆ QUẢN LÝ NGÂN SÁCH & CẢNH BÁO CHI TIÊU (BUDGETS)

---

### 🔹 Luồng 5.1: Tạo ngân sách hạn mức danh mục (Create Budget)
- **1. Sự kiện kích hoạt:** Người dùng chọn danh mục (Ăn uống), đặt hạn mức (3.000.000đ), chọn tháng và bấm *"Lưu ngân sách"* trên `BudgetScreen.tsx`.
- **2. API tiếp nhận:** `POST /api/budgets`.
- **3. File xử lý dữ liệu:**
  - `BudgetController.java` (hàm `createBudget()`)
  - `BudgetService.java` (kiểm tra không trùng ngân sách cùng danh mục trong tháng)
  - `BudgetRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT COUNT(*) FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?`.
  - `INSERT INTO budgets (id, user_id, category_id, amount, month, year, budget_type, is_recurring, is_mandatory, created_at) VALUES (?, ?, ?, 3000000, 9, 2026, 'FLEXIBLE', false, false, NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`
  ```json
  {
    "id": "b1c2d3e4-...",
    "category": { "id": "...", "name": "Ăn uống" },
    "amount": 3000000.0,
    "spentAmount": 0.0,
    "remainingAmount": 3000000.0,
    "percentageSpent": 0.0,
    "status": "NORMAL"
  }
  ```

---

### 🔹 Luồng 5.2: Tính toán chi tiêu ngân sách không hồi tố (`Creation-Date Aware`)
- **1. Sự kiện kích hoạt:** Gọi `GET /api/budgets/summary?month=9&year=2026`.
- **2. API tiếp nhận:** `GET /api/budgets/summary`.
- **3. File xử lý dữ liệu:**
  - `BudgetService.java` (hàm `getBudgetSummary()`): Nếu ngân sách tạo mới giữa tháng, chỉ tính $\sum \text{amount}$ của các transaction có `transactionDate >= budget.createdAt`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?`.
  - `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ?) AND category_id = ? AND transaction_date >= ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Danh sách ngân sách kèm tỷ lệ % đã chi, trạng thái `NORMAL`, `WARNING (80%)`, hoặc `EXCEEDED`).

---

## 6. PHÂN HỆ HŨ TIẾT KIỆM HEO ĐẤT & PHÂN BỔ TỰ ĐỘNG (SAVINGS)

---

### 🔹 Luồng 6.1: Tạo mục tiêu tiết kiệm mới (Savings Goal)
- **1. Sự kiện kích hoạt:** Người dùng nhập Tên ("Mua Laptop"), Đích (15.000.000đ), Hạn chót (31/12/2026) trên `SavingsScreen.tsx`.
- **2. API tiếp nhận:** `POST /api/savings-goals`.
- **3. File xử lý dữ liệu:**
  - `SavingsGoalController.java` $\rightarrow$ `SavingsGoalService.java` $\rightarrow$ `SavingsGoalRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, priority, status, created_at) VALUES (?, ?, 'Mua Laptop', 15000000, 0, '2026-12-31', 'HIGH', 'IN_PROGRESS', NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` (Trả về SavingsGoalResponse).

---

### 🔹 Luồng 6.2: Nạp tiền từ ví vào heo đất (Deposit to Goal)
- **1. Sự kiện kích hoạt:** Bấm *"Nạp tiền"*, chọn Ví Tiền mặt, nhập 2.000.000đ và bấm *"Xác nhận"*.
- **2. API tiếp nhận:** `POST /api/savings-goals/{id}/deposit`.
- **3. File xử lý dữ liệu:**
  - `SavingsGoalController.java` $\rightarrow$ `SavingsGoalService.java` $\rightarrow$ `WalletRepository.java` & `SavingsGoalRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE wallets SET balance = balance - 2000000 WHERE id = ?`.
  - `UPDATE savings_goals SET current_amount = current_amount + 2000000, updated_at = NOW() WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "id": "s1a2b3c4-...",
    "name": "Mua Laptop",
    "targetAmount": 15000000.0,
    "currentAmount": 2000000.0,
    "percentage": 13.33,
    "status": "IN_PROGRESS"
  }
  ```

---

## 7. PHÂN HỆ QUẢN LÝ NHÓM CHI TIÊU & THUẬT TOÁN CHIA TIỀN (GROUPS & EXPENSES)

---

### 🔹 Luồng 7.1: Tạo nhóm chi tiêu mới (Create Group)
- **1. Sự kiện kích hoạt:** Người dùng nhập Tên nhóm ("Hội Bạn Thân"), chọn ảnh bìa và bấm *"Tạo nhóm"* trên `GroupsScreen.tsx`.
- **2. API tiếp nhận:** `POST /api/groups`.
- **3. File xử lý dữ liệu:**
  - `GroupController.java` $\rightarrow$ `GroupService.java` $\rightarrow$ `GroupRepository.java` & `GroupMemberRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO "groups" (id, name, description, avatar_url, created_by, created_at) VALUES (?, 'Hội Bạn Thân', ?, ?, ?, NOW())`.
  - `INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES (?, ?, ?, 'OWNER', NOW())` (Tự động gán Owner làm thành viên đầu tiên).
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` (Trả về GroupResponse).

---

### 🔹 Luồng 7.2: Quét mã QR gia nhập nhóm 1-chạm (Join Group via QR)
- **1. Sự kiện kích hoạt:** Thành viên dùng Camera quét mã QR Vector của nhóm và bấm *"Tham gia ngay"*.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/join`.
- **3. File xử lý dữ liệu:**
  - `GroupController.java` $\rightarrow$ `GroupService.java` $\rightarrow$ `NotificationService.java` (Bắn thông báo cho Owner).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?`.
  - `INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES (?, ?, ?, 'MEMBER', NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "status": "SUCCESS",
    "message": "Bạn đã tham gia nhóm thành công!",
    "groupId": "g1a2b3c4-..."
  }
  ```

---

### 🔹 Luồng 7.3: Tạo hóa đơn chia tiền đều & Thuật toán Bù Lẻ Remainder (Equal Split)
- **1. Sự kiện kích hoạt:** Người trả A tạo hóa đơn 100.000đ chia đều cho 3 người (A, B, C) trên `AddExpenseModal.tsx`.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/expenses`.
- **3. File xử lý dữ liệu:**
  - `ExpenseController.java` (hàm `createExpense()`)
  - `ExpenseService.java`:
    - Tính $\text{base} = \lfloor 100.000 / 3 \rfloor = 33.333đ$
    - Tính $\text{remainder} = 100.000 - (33.333 \times 3) = 1đ$
    - Gán người 1: $33.334đ$, người 2: $33.333đ$, người 3: $33.333đ$ (Tổng chuẩn $100.000đ$).
  - `ExpenseRepository.java`, `ExpenseSplitRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO expenses (id, group_id, paid_by, amount, title, category, created_at) VALUES (?, ?, ?, 100000, 'Ăn tối', 'Ăn uống', NOW())`.
  - `INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES`
    - `(?, ?, userA_id, 33334, true)` (Người trả tự gạch nợ cho mình)
    - `(?, ?, userB_id, 33333, false)`
    - `(?, ?, userC_id, 33333, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` (Trả về ExpenseResponse với 3 bản ghi Splits).

---

## 8. PHÂN HỆ THUẬT TOÁN GREEDY RÚT GỌN NỢ & QUYẾT TOÁN VIETQR (DEBT SETTLEMENT)

---

### 🔹 Luồng 8.1: Thuật toán Greedy Min-Cash-Flow tính toán nợ chéo tối ưu
- **1. Sự kiện kích hoạt:** Người dùng mở tab *"Sổ nợ"* trong nhóm hoặc trang chủ.
- **2. API tiếp nhận:** `GET /api/groups/{groupId}/debts`.
- **3. File xử lý dữ liệu:**
  - `DebtController.java` (hàm `getGroupDebts()`)
  - `DebtService.java` (xây dựng Net Balance Matrix $\rightarrow$ Chạy thuật toán Greedy Min-Cash-Flow $\rightarrow$ Rút gọn $N \times (N-1)$ nợ vòng tròn xuống tối đa $N-1$ giao dịch).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = ? AND es.is_settled = false`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "groupId": "g1a2b3c4-...",
    "transactions": [
      {
        "from": { "id": "userB_id", "name": "B" },
        "to": { "id": "userA_id", "name": "A", "bankBin": "970422", "bankAccountNo": "0986523787" },
        "amount": 33333.0
      }
    ],
    "memberBalances": [
      { "user": { "id": "userA_id", "name": "A" }, "balance": 66667.0 },
      { "user": { "id": "userB_id", "name": "B" }, "balance": -33333.0 },
      { "user": { "id": "userC_id", "name": "C" }, "balance": -33333.0 }
    ]
  }
  ```

---

### 🔹 Luồng 8.2: Trả nợ 1-chạm & Mở App Ngân Hàng (App-to-App Deep Linking)
- **1. Sự kiện kích hoạt:** Con nợ B bấm nút **"Trả nợ 📲"** bên cạnh khoản nợ A.
- **2. API tiếp nhận:** Mobile App gọi `GET /api/vietqr/generate` hoặc render mã VietQR nội bộ.
- **3. File xử lý dữ liệu:**
  - `VietQrService.java` (sinh chuỗi chuẩn Napas247: `https://img.vietqr.io/image/970422-0986523787-compact2.png?amount=33333&addInfo=TRA%20NO%20SHAREMONEY`)
  - Frontend: `Linking.openURL('mbcustom://...')` hoặc DeepLink ngân hàng cài trên máy.
- **4. Thao tác Cơ sở dữ liệu:** Không ghi DB.
- **5. Dữ liệu Phản hồi:** Mở trực tiếp App Ngân hàng MBBank/VCB của người dùng với STK và Số tiền điền sẵn 100%.

---

### 🔹 Luồng 8.3: Báo đã chuyển tiền (`Payment pending`)
- **1. Sự kiện kích hoạt:** B chuyển khoản xong bấm nút *"Tôi đã chuyển"* trên ứng dụng.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/debts/notify-payment`.
- **3. File xử lý dữ liệu:**
  - `DebtController.java` $\rightarrow$ `DebtService.java` $\rightarrow$ `PaymentRepository.java` $\rightarrow$ `NotificationService.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO payments (id, group_id, from_user_id, to_user_id, amount, status, created_at) VALUES (?, ?, userB_id, userA_id, 33333, 'PENDING', NOW())`.
  - `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, userA_id, 'Xác nhận thanh toán', 'B vừa báo đã chuyển 33.333đ cho bạn. Hãy kiểm tra nhé!', 'DEBT_PAYMENT', false, NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Bắn WebSocket thông báo đến tài khoản của A).

---

### 🔹 Luồng 8.4: Chủ nợ duyệt thanh toán & Cân bằng sổ cái (Settle Debt)
- **1. Sự kiện kích hoạt:** Chủ nợ A bấm nút *"Xác nhận đã nhận tiền"*.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/debts/settle`.
- **3. File xử lý dữ liệu:**
  - `DebtController.java` (hàm `settleDebt()`)
  - `DebtService.java` (tạo Expense `SETTLEMENT` đối trừ nợ)
  - `PaymentRepository.java`, `ExpenseRepository.java`, `ExpenseSplitRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE payments SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?`.
  - `INSERT INTO expenses (id, group_id, paid_by, amount, title, category, created_at) VALUES (?, ?, userB_id, 33333, 'Thanh toán nợ cho A', 'SETTLEMENT', NOW())`.
  - `INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES (?, ?, userA_id, 33333, true)`.
  - `UPDATE expense_splits SET is_settled = true WHERE id = ?` (Gạch nợ cũ).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Nợ của B đối với A chính thức về 0đ).

---

## 9. PHÂN HỆ CỔNG THANH TOÁN TRỰC TUYẾN (VNPAY & PAYOS)

---

### 🔹 Luồng 9.1: Tạo liên kết thanh toán VNPay Sandbox
- **1. Sự kiện kích hoạt:** Người dùng chọn thanh toán qua VNPay.
- **2. API tiếp nhận:** `POST /api/vnpay/create-payment`.
- **3. File xử lý dữ liệu:**
  - `VNPayController.java` $\rightarrow$ `VNPayService.java` (tính chữ ký HMAC SHA512 theo mã bí mật `vnp_HashSecret`) $\rightarrow$ `PaymentOrderRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO payment_orders (id, user_id, order_code, amount, order_type, status, payment_gateway, created_at) VALUES (?, ?, ?, 50000, 'DEBT', 'PENDING', 'VNPAY', NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=5000000&vnp_Command=pay&vnp_CreateDate=20260902...",
    "orderCode": "VNP1725289900"
  }
  ```

---

### 🔹 Luồng 9.2: Webhook PayOS đối soát tự động & Gạch nợ tức thì
- **1. Sự kiện kích hoạt:** Người dùng chuyển tiền vào tài khoản VietQR PayOS $\rightarrow$ PayOS Server bắn Webhook về hệ thống.
- **2. API tiếp nhận:** `POST /api/payos/webhook` (Công khai cho IP PayOS).
- **3. File xử lý dữ liệu:**
  - `PayOSController.java` $\rightarrow$ `PayOSService.java` (xác thực chữ ký HMAC SHA256) $\rightarrow$ `DebtService.java` (gạch nợ tự động).
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE payment_orders SET status = 'SUCCESS', updated_at = NOW() WHERE order_code = ?`.
  - `INSERT INTO expenses (title, category, amount, ...) VALUES ('Thanh toán qua PayOS', 'SETTLEMENT', ...)`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "error": 0,
    "message": "Webhook processed successfully",
    "data": null
  }
  ```

---

## 10. PHÂN HỆ TRÍ TUỆ NHÂN TẠO AI GEMINI & ĐIỂM SỨC KHỎE TÀI CHÍNH (AI & HEALTH)

---

### 🔹 Luồng 10.1: AI Chatbot Cố vấn Tài chính (Gemini AI Financial Advisor)
- **1. Sự kiện kích hoạt:** Người dùng gửi câu hỏi tư vấn trong tab *"Tư vấn AI"* (`AdvisorScreen.tsx`).
- **2. API tiếp nhận:** `POST /api/ai/chat`.
- **3. File xử lý dữ liệu:**
  - `AiController.java` (hàm `chat()`)
  - `AiAssistantService.java` (truy vấn DB lấy: Tổng thu, Tổng chi, Số dư từng ví, 5 ngân sách, 8 giao dịch gần nhất)
  - `GeminiService.java` (gửi System Prompt kèm Context tới mô hình `gemini-3.6-flash`, kèm Heuristic Fallback Engine 3s).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM wallets WHERE user_id = ?`.
  - `SELECT * FROM transactions WHERE wallet_id IN (...) AND transaction_date >= ?`.
  - `SELECT * FROM budgets WHERE user_id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "reply": "Chào Văn A! Tháng 9 này bạn đã chi 4.250.000đ (chiếm 65% ngân sách Ăn uống). Bạn nên cắt giảm các bữa ăn ngoài để đạt mục tiêu Mua Laptop nhé!",
    "intent": "FINANCIAL_ADVICE",
    "suggestedChips": ["Xem ngân sách Ăn uống", "Mẹo tiết kiệm tuần này", "Kiểm tra sổ nợ"]
  }
  ```

---

### 🔹 Luồng 10.2: Tự động thiết lập kế hoạch tài chính 1-chạm (`SETUP_FINANCIAL_PLAN`)
- **1. Sự kiện kích hoạt:** Người dùng chat: *"Tháng này lương 20tr, tiền nhà 4tr, tiền ăn 5tr, tiền điện nước 1tr, mua sắm 2tr"*.
- **2. API tiếp nhận:** `POST /api/ai/chat`.
- **3. File xử lý dữ liệu:**
  - `AiAssistantService.java` nhận diện ý định `SETUP_FINANCIAL_PLAN` $\rightarrow$ Trả về DTO kế hoạch phân bổ $\rightarrow$ Khi người dùng bấm *"Tạo toàn bộ ngân sách"* gọi `POST /api/budgets/batch`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO budgets (user_id, category_id, amount, month, year, ...) VALUES` (Tạo đồng loạt 4 ngân sách trong 1 Transaction).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` kèm Thẻ kế hoạch tài chính `FinancialPlanCard.tsx`.

---

### 🔹 Luồng 10.3: Tính điểm Sức khỏe Tài chính toàn diện (Financial Health Score)
- **1. Sự kiện kích hoạt:** Mở tab Tư vấn hoặc Dashboard.
- **2. API tiếp nhận:** `GET /api/financial-health`.
- **3. File xử lý dữ liệu:**
  - `AiController.java` $\rightarrow$ `FinancialHealthService.java` (tính 4 trụ cột: Savings Ratio 25đ, Budget Adherence 25đ, Debt-to-Income 25đ, Emergency Fund 25đ).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT SUM(amount) FROM transactions WHERE type = 'INCOME' AND ...`.
  - `SELECT SUM(amount) FROM transactions WHERE type = 'EXPENSE' AND ...`.
  - `SELECT SUM(balance) FROM wallets WHERE user_id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "totalScore": 82.5,
    "status": "EXCELLENT",
    "savingsScore": 22.5,
    "budgetScore": 20.0,
    "debtScore": 25.0,
    "emergencyFundScore": 15.0,
    "advice": "Tình hình tài chính của bạn rất lành mạnh! Tỷ lệ tiết kiệm đạt 28% vượt mức chuẩn."
  }
  ```

---

## 11. PHÂN HỆ PHÁT HIỆN DỊ THƯỜNG Z-SCORE & THÔNG BÁO THỜI GIAN THỰC (NOTIFICATIONS)

---

### 🔹 Luồng 11.1: Phát hiện chi tiêu bất thường theo thời gian thực (Z-Score Anomaly)
- **1. Sự kiện kích hoạt:** Một giao dịch chi tiêu mới được tạo tại `TransactionService.java`.
- **2. API tiếp nhận:** Xử lý ngầm (Event Listener / Internal Service Call).
- **3. File xử lý dữ liệu:**
  - `AnomalyDetectionService.java` (tính trung bình $\mu$ và độ lệch chuẩn $\sigma$ của 20 giao dịch gần nhất cùng danh mục $\rightarrow$ Tính $Z = \frac{X - \mu}{\sigma}$).
  - `NotificationService.java` (nếu $Z > 2.0$, bắn thông báo đẩy).
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES (?, ?, 'Cảnh báo chi tiêu bất thường ⚠️', 'Khoản chi 5.000.000đ cho Ăn uống cao đột biến so với mức trung bình 180.000đ.', 'SPENDING_ANOMALY', false, NOW())`.
- **5. Dữ liệu Phản hồi:** Gửi gói tin STOMP WebSocket tới `/topic/notifications/{userId}` và Native Push Notification tới thiết bị.

---

### 🔹 Luồng 11.2: Đánh dấu thông báo đã đọc & Cập nhật quả chuông Unread Badge
- **1. Sự kiện kích hoạt:** Người dùng chạm vào thông báo trong `NotificationBottomSheet.tsx`.
- **2. API tiếp nhận:** `PATCH /api/notifications/{id}/read` hoặc `PATCH /api/notifications/read-all`.
- **3. File xử lý dữ liệu:**
  - `NotificationController.java` $\rightarrow$ `NotificationService.java` $\rightarrow$ `NotificationRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?`.
  - `SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false` (Đếm lại số chưa đọc).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "unreadCount": 0
  }
  ```
