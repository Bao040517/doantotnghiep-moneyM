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
- **1. Sự kiện kích hoạt:** Người dùng điền thông tin và nhấn *"Đăng ký"*.
- **2. API tiếp nhận:** `POST /api/auth/register` (Public Endpoint, bảo vệ bằng `RateLimitingFilter`).
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (Validation qua `@Valid`).
  - `AuthService.java`: 
    - Xử lý dữ liệu thô: Chuẩn hóa email bằng `trim().toLowerCase()`.
    - Bảo mật: Băm mật khẩu bằng thuật toán một chiều `BCryptPasswordEncoder` (Độ khó Work Factor 10 - chống Rainbow Table Attack).
  - `JwtUtil.java`: Ký chuỗi JWT (Access Token 15 phút) bằng thuật toán `HS256`.
  - `RefreshTokenService.java`: Sinh chuỗi UUID làm Refresh Token (sống 7 ngày).
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT COUNT(*) FROM users WHERE email = ?` (Kiểm tra trùng lặp - Chống đăng ký đôi).
  - `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'USER', NOW(), NOW())`.
  - `INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES (?, ?, 'Tiền mặt', 0, 'VND', false, NOW())` (Trigger tự động khởi tạo Ví Cold-start).
  - `INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES (?, ?, ?, ?, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "refreshToken": "d8f3a2b1-9c8e-4a7f...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "c7a8b9e0-...",
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
- **1. Sự kiện kích hoạt:** Một API bất kỳ gọi lên bị trả về `HTTP 401 Unauthorized` (do Access Token hết hạn). Ở Frontend, `Axios Interceptor` chặn lỗi lại, tạm dừng mọi API call đưa vào hàng đợi (`failedQueue`).
- **2. API tiếp nhận:** `POST /api/auth/refresh`.
- **3. File xử lý dữ liệu:**
  - `AuthController.java` (hàm `refreshToken()`).
  - `RefreshTokenService.java`: 
    - `verifyExpiration()`: Kiểm tra hạn 7 ngày.
    - Cơ chế **Token Rotation**: Hủy token cũ ngay lập tức (chống Replay Attack) và cấp một cặp Access+Refresh Token hoàn toàn mới.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM refresh_tokens WHERE token = ? AND revoked = false`.
  - `UPDATE refresh_tokens SET revoked = true WHERE id = ?`.
  - `INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES (?, ?, ?, ?, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "new-uuid-refresh-token...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
  ```

---

### 🔹 Luồng 1.4: Quên mật khẩu - Gửi mã OTP qua Gmail (Forgot Password)
- **1. Sự kiện kích hoạt:** Người dùng nhập Gmail và bấm *"Gửi mã xác thực"*.
- **2. API tiếp nhận:** `POST /api/auth/forgot-password`.
- **3. File xử lý dữ liệu:**
  - `UserRepository.java`: Rà soát email trong hệ thống.
  - `OtpService.java`: 
    - Sinh mã 6 số ngẫu nhiên qua `SecureRandom` (Bảo mật sinh trắc học cao).
    - Lưu vào bộ nhớ siêu tốc RAM (`ConcurrentHashMap`) thay vì Database. Thiết lập Thời gian sống (TTL) 300s và tối đa 5 lần nhập sai (`MAX_ATTEMPTS`).
  - `EmailService.java`: Render giao diện HTML Template chuyên nghiệp và gửi qua `JavaMailSender`.
- **4. Thao tác Cơ sở dữ liệu:** `SELECT * FROM users WHERE email = ?` (Chỉ đọc).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`

---

### 🔹 Luồng 1.5: Xác thực OTP & Đặt lại mật khẩu mới (Reset Password)
- **1. Sự kiện kích hoạt:** Người dùng nhập mã OTP 6 số, Mật khẩu mới & bấm *"Đổi mật khẩu"*.
- **2. API tiếp nhận:** `POST /api/auth/reset-password`.
- **3. File xử lý dữ liệu:**
  - `OtpService.java`: Quét trong RAM `ConcurrentHashMap`. 
    - Nếu hết 5 phút $\rightarrow$ Hủy OTP.
    - Nếu nhập sai $\rightarrow$ Trừ đi 1 lần thử. Sai quá 5 lần $\rightarrow$ Bắn lỗi khóa (Chống Brute-force Hacker).
  - `PasswordEncoder.java`: Băm mật khẩu mới bằng `BCrypt`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`

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
- **1. Sự kiện kích hoạt:** Người dùng mở ứng dụng, hệ thống tự động tải lại Profile để đồng bộ giao diện (`ProfileScreen.tsx`).
- **2. API tiếp nhận:** `GET /api/users/me` (Yêu cầu Header `Authorization: Bearer <token>`).
- **3. File xử lý dữ liệu:**
  - `UserController.java` (hàm `getCurrentUser()`).
  - `UserService.java`: Bóc tách UUID từ SecurityContext (`SecurityContextHolder.getContext().getAuthentication().getName()`).
  - `UserRepository.java`: Truy vấn JpaRepository.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM users WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Trả về DTO chuẩn hóa, che giấu Password Hash)
  ```json
  {
    "id": "c7a8b9e0-...",
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

### 🔹 Luồng 2.2: Cập nhật tài khoản ngân hàng (Main/Savings)
- **1. Sự kiện kích hoạt:** Người dùng thiết lập Ngân hàng chính (nhận nợ) hoặc Ngân hàng Tiết kiệm (hũ tự động).
- **2. API tiếp nhận:** `PUT /api/users/me`.
- **3. File xử lý dữ liệu:**
  - `UserController.java` (hàm `updateProfile()`).
  - `UserService.java`: 
    - Validation: Chống SQL Injection và XSS.
    - Chuẩn hóa: Tự động chuyển đổi `bankAccountName` thành IN HOA KHÔNG DẤU (`NGUYEN VAN A`) để in ra mã VietQR chuẩn xác.
- **4. Thao tác Cơ sở dữ liệu:**
  - `UPDATE users SET bank_bin = ?, bank_account_no = ?, bank_account_name = ?, updated_at = NOW() WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Trả về ProfileResponse bản mới nhất).

---

### 🔹 Luồng 2.3: Tra cứu tên chủ tài khoản ngân hàng Napas247 (VietQR Lookup)
- **1. Sự kiện kích hoạt:** Người dùng nhập xong STK và chuyển focus (onBlur) ra ngoài ô nhập liệu.
- **2. API tiếp nhận:** `POST /api/vietqr/lookup`.
- **3. File xử lý dữ liệu:**
  - `BankLookupController.java` (hàm `lookupAccount()`).
  - `BankLookupService.java`:
    - **Cơ chế Fallback/Mock thông minh**: Hệ thống đọc biến môi trường `.env`. Nếu có API Key doanh nghiệp thực tế (`x-client-id`), nó sẽ dùng `java.net.http.HttpClient` bắn REST request sang cổng Napas247.
    - Nếu không có Key (môi trường Dev/Đồ án), kích hoạt **Mock Data Store** (`KNOWN_ACCOUNTS` - HashMap tĩnh trong RAM) tự động mô phỏng trả về dữ liệu thành công chỉ trong 5ms.
- **4. Thao tác Cơ sở dữ liệu:** Không truy vấn DB nội bộ (Chỉ gọi cổng trung gian hoặc dùng Mock Data).
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

### 🔹 Luồng 2.4: Đăng ký mã Push Token & Tải lên Avatar (Thiết bị Native)
- **1. Sự kiện kích hoạt:** Khi đăng nhập thành công, App xin quyền Notification và chọn ảnh từ thư viện (`expo-image-picker`).
- **2. API tiếp nhận:** `POST /api/users/me/push-token` và `POST /api/users/me/avatar`.
- **3. File xử lý dữ liệu:**
  - `UserService.java`: Lưu chuỗi `ExponentPushToken[...]` vào bảng users để chuẩn bị bắn thông báo Firebase Cloud Messaging (FCM) / Expo Push.
  - Avatar được nén lại (Base64) hoặc tải lên máy chủ, cập nhật `avatarUrl`.
- **4. Thao tác DB:** `UPDATE users SET push_token = ?, avatar_url = ? WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`.

---

## 3. PHÂN HỆ QUẢN LÝ VÍ TÀI CHÍNH & TÀI SẢN RÒNG (WALLETS)

---

### 🔹 Luồng 3.1: Lấy danh sách ví & Tính tổng tài sản ròng (Net Worth)
- **1. Sự kiện kích hoạt:** Màn hình Dashboard hoặc Quản lý ví tải dữ liệu.
- **2. API tiếp nhận:** `GET /api/wallets` và `GET /api/wallets/total-balance`.
- **3. File xử lý dữ liệu:**
  - `WalletController.java` (hàm `getAllWallets()`, `getTotalBalance()`).
  - `WalletService.java`: 
    - Duyệt qua danh sách Ví của User.
    - Phân loại: Ví Tài sản (Tiền mặt, ATM) $\rightarrow$ Cộng vào `Assets`. Ví Nợ (Thẻ tín dụng) $\rightarrow$ Cộng vào `Liabilities`.
    - Tính toán Toán học: $\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$.
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

### 🔹 Luồng 3.2: Tạo ví tài chính mới & Khởi tạo Cold-start
- **1. Sự kiện kích hoạt:** Người dùng điền tên ví, số dư ban đầu, loại ví (Ví nợ / Ví tài sản) trên `WalletModal.tsx`.
- **2. API tiếp nhận:** `POST /api/wallets` (Hoặc gọi ngầm từ luồng Register).
- **3. File xử lý dữ liệu:**
  - `WalletController.java` (hàm `createWallet()`).
  - `WalletService.java`: Gắn cờ `isLiability = true` nếu đây là Thẻ Tín Dụng. 
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

### 🔹 Luồng 4.1: Thêm giao dịch Chi tiêu cá nhân (Expense) - Siêu Luồng
- **1. Sự kiện kích hoạt:** Nhập số tiền (50.000đ), Danh mục ("Ăn uống"), Ví, Quán ăn, Nhãn (`#AnSang`).
- **2. API tiếp nhận:** `POST /api/transactions`.
- **3. File xử lý dữ liệu (`TransactionService.java`):**
  - **Auto-create Dữ liệu phụ:** Tự động tra cứu Quán ăn (Payee) và Nhãn (Tags). Chưa có thì tự động `INSERT`.
  - **Đóng gói Builder Pattern:** Tạo đối tượng Transaction nguyên vẹn trên RAM.
  - **Kiểm tra Ngân sách (Smart Budgeting):** Dò xem tháng này có Ngân sách Ăn uống không, ghim `linkedBudgetId` vào hóa đơn để trừ dần.
  - **Trí tuệ Nhân tạo - Anomaly Detection:** Kích hoạt `AnomalyDetectionService.java` tính điểm **Z-Score**. So sánh 50.000đ với Phương sai (Variance) và Độ lệch chuẩn (StdDev) của 20 bữa ăn gần nhất. Nếu Z-Score > Ngưỡng $\rightarrow$ Gắn cờ cảnh báo bất thường.
- **4. Thao tác Cơ sở dữ liệu (Pessimistic Locking - Chống kẹt xe):**
  - Khóa số dư: `SELECT * FROM wallets WHERE id = ? FOR UPDATE` (Bảo đảm an toàn giao dịch đồng thời).
  - Trừ ví: `UPDATE wallets SET balance = balance - 50000 WHERE id = ?`.
  - Lưu hóa đơn: `INSERT INTO transactions (...) VALUES (...)`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`.

---

### 🔹 Luồng 4.2 - 4.8: Cập nhật, Khôi phục, Lọc và Chia tách (Advanced Transactions)
- **Cơ chế Khôi phục số dư (Revert Balance):** Khi Edit/Xóa một chi tiêu 50.000đ cũ $\rightarrow$ Code tự động **Cộng trả lại 50.000đ** vào Ví cũ, sau đó mới áp dụng số tiền mới hoặc Xóa. (Bảo toàn 100% tài sản).
- **Cơ chế Split Transaction (Chia nhỏ hóa đơn):** Hóa đơn siêu thị 500k $\rightarrow$ Chia thành 300k Thực phẩm + 200k Đồ gia dụng. Backend check Tổng Split = Tiền Hóa đơn Cha, sau đó ghi thành 2 dòng con vào bảng `transaction_splits`.
- **Cơ chế Phân trang & Lọc phức hợp:** `GET /api/transactions?month=9&year=2026&type=EXPENSE&categoryId=...`. Backend sử dụng JPA Specification để Build câu truy vấn động. Trả về Page(size=20).

---

## 5. PHÂN HỆ QUẢN LÝ NGÂN SÁCH & CẢNH BÁO CHI TIÊU (BUDGETS)

---

### 🔹 Luồng 5.1: Tạo ngân sách thông minh & Lên lịch hóa đơn (Create/Set Budget & Bills)
- **1. Sự kiện kích hoạt:** Người dùng thiết lập ngân sách tại `BudgetScreen.tsx`, bao gồm các thuộc tính: Số tiền (3.000.000đ), Danh mục (Ăn uống), Loại (`FLEXIBLE`/`FIXED`/`BILL`), Lặp lại hằng tháng (`is_recurring`), và Đánh dấu Bắt buộc (`is_mandatory` - Sao vàng).
- **2. API tiếp nhận:** `POST /api/budgets/set` (Sử dụng cơ chế Set/Upsert thay vì chỉ Create).
- **3. File xử lý dữ liệu:**
  - `BudgetController.java` (hàm `setBudget()`).
  - `BudgetService.java`: 
    - Xử lý Upsert: Kiểm tra xem đã có ngân sách cùng danh mục trong tháng chưa. Nếu có $\rightarrow$ Ghi đè (Cập nhật). Nếu chưa $\rightarrow$ Tạo mới.
    - Xử lý Hóa đơn (Bill): Nếu là hóa đơn đóng tiền điện/nhà (`BILL`), tự động liên kết thông tin người thụ hưởng (`payeeBankBin`, `payeeBankAccount`) và ngày đến hạn (`dueDayOfMonth`).
  - `BudgetRepository.java`.
- **4. Thao tác Cơ sở dữ liệu (Upsert Logic):**
  - `SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?`.
  - Nếu đã tồn tại: `UPDATE budgets SET limit_amount = 3000000, type = 'FLEXIBLE', is_recurring = true, is_mandatory = true WHERE id = ?`.
  - Nếu chưa có: `INSERT INTO budgets (id, user_id, category_id, limit_amount, month, year, type, is_recurring, is_mandatory, created_at) VALUES (...)`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Trả về `BudgetSummaryResponse` tổng hợp tính toán).
  ```json
  {
    "id": "b1c2d3e4-...",
    "name": "Ngân sách Ăn uống",
    "category": { "id": "...", "name": "Ăn uống" },
    "limitAmount": 3000000.0,
    "spentAmount": 0.0,
    "remainingAmount": 3000000.0,
    "percentageSpent": 0.0,
    "type": "FLEXIBLE",
    "isRecurring": true,
    "isMandatory": true,
    "dueDayOfMonth": null,
    "status": "NORMAL"
  }
  ```

---

### 🔹 Luồng 5.2: Tính toán chi tiêu ngân sách không hồi tố (`Creation-Date Aware`)
- **1. Sự kiện kích hoạt:** Gọi `GET /api/budgets/summary?month=9&year=2026`.
- **2. API tiếp nhận:** `GET /api/budgets/summary`.
- **3. File xử lý dữ liệu (`BudgetService.java`):**
  - **Logic Tính toán Non-Retroactive (Không hồi tố):** Rất nhiều app tài chính bị lỗi này: Nếu mùng 5 bạn tạo Ngân sách "Ăn uống 3 triệu", thì các khoản ăn uống ngày mùng 1, 2, 3, 4 có bị tính vào ngân sách không? ShareMoney xử lý triệt để: **Chỉ tính các giao dịch có thời gian sau khi tạo Ngân sách (`transaction_date >= budget.created_at`)**.
  - Tính tỷ lệ phần trăm: $\text{percentage} = (\text{spentAmount} / \text{limitAmount}) \times 100$.
  - Gắn cờ trạng thái thông minh: `< 80%` $\rightarrow$ `NORMAL`, `80% - 99%` $\rightarrow$ `WARNING`, `>= 100%` $\rightarrow$ `EXCEEDED`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?`.
  - `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ?) AND category_id = ? AND transaction_date >= ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Danh sách ngân sách kèm tỷ lệ % đã chi, trạng thái `NORMAL`, `WARNING (80%)`, hoặc `EXCEEDED`).

---

## 6. PHÂN HỆ HŨ TIẾT KIỆM HEO ĐẤT & PHÂN BỔ TỰ ĐỘNG (SAVINGS)

---

### 🔹 Luồng 6.1: Tạo mục tiêu tiết kiệm mới (Savings Goal)
- **1. Sự kiện kích hoạt:** Người dùng nhập Tên ("Mua Laptop"), Đích (15.000.000đ), Hạn chót, Mức độ ưu tiên (`HIGH`/`MEDIUM`/`LOW`) trên `SavingsScreen.tsx`.
- **2. API tiếp nhận:** `POST /api/savings-goals`.
- **3. File xử lý dữ liệu:** `SavingsGoalService.java` (Validation logic).
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, priority, status, created_at) VALUES (?, ?, 'Mua Laptop', 15000000, 0, '2026-12-31', 'HIGH', 'IN_PROGRESS', NOW())`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created`.

---

### 🔹 Luồng 6.2: Nạp tiền từ ví vào heo đất (Fund Savings Goal)
- **1. Sự kiện kích hoạt:** Bấm *"Nạp tiền"*, chọn Ví Tiền mặt, nhập 2.000.000đ.
- **2. API tiếp nhận:** `POST /api/savings-goals/{id}/fund`.
- **3. File xử lý dữ liệu (`SavingsGoalService.java`):**
  - Validation: Kiểm tra Ví Tiền mặt có đủ tiền không.
  - Xử lý kép: Trừ tiền Ví + Ghi nhận 1 `Transaction` lịch sử để minh bạch dòng tiền.
- **4. Thao tác Cơ sở dữ liệu (Database Transaction Nguyên tử):**
  - Khóa số dư: `SELECT * FROM wallets WHERE id = ? FOR UPDATE`.
  - Trừ ví: `UPDATE wallets SET balance = balance - 2000000 WHERE id = ?`.
  - Cộng hũ: `UPDATE savings_goals SET current_amount = current_amount + 2000000, status = (nếu >= target thì 'COMPLETED' else 'IN_PROGRESS') WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`.

---

### 🔹 Luồng 6.3: Phân bổ tiền Nhàn rỗi Tự động (Auto Allocate Algorithm)
- **1. Sự kiện kích hoạt:** User có một khoản thu nhập mới vào Tài khoản tiết kiệm $\rightarrow$ Bấm *"Phân bổ tự động"*.
- **2. API tiếp nhận:** `POST /api/savings-goals/auto-allocate`.
- **3. File xử lý dữ liệu (`SavingsGoalService.java` - hàm `autoAllocateSavingsGoals`):**
  - **Thuật toán Tham lam (Greedy Priority):** 
    1. Quét tài sản nhàn rỗi (Safe-to-spend).
    2. Gom tất cả `savings_goals` đang `IN_PROGRESS`.
    3. Sắp xếp theo ưu tiên: `HIGH` $\rightarrow$ `MEDIUM` $\rightarrow$ `LOW`. Cùng ưu tiên thì sắp xếp theo Hạn chót (Deadline gần nhất đổ trước).
    4. Vòng lặp rót tiền: Rót đầy hũ A, còn dư tiếp tục rót sang hũ B, hũ C cho đến khi hết tiền rảnh.
  - Xử lý đồng thời (Batch Update) và tạo Lịch sử giao dịch hàng loạt.
- **4. Thao tác DB:** Update nhiều bản ghi `savings_goals` và `wallets` trong 1 `@Transactional`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` trả về danh sách các hũ đã được bơm tiền.


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

### 🔹 Luồng 7.3: Thuật toán Bù Lẻ Remainder (Equal Split Algorithm)
- **1. Sự kiện kích hoạt:** Người trả A tạo hóa đơn 100.000đ chia đều cho 3 người (A, B, C) trên `AddExpenseModal.tsx`.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/expenses`.
- **3. File xử lý dữ liệu (`ExpenseService.java`):**
  - Vấn đề Tin học: $100.000 / 3 = 33.333,333...$ Gây thất thoát tiền.
  - Thuật toán Bù Lẻ: 
    - Tính `baseAmount = Math.floor(100.000 / 3) = 33.333đ`
    - Tính `remainder = 100.000 - (33.333 \times 3) = 1đ`
    - Vòng lặp chia tiền: Cộng thêm 1đ cho những người đầu tiên trong mảng.
    - Kết quả: Người 1: $33.334đ$, Người 2: $33.333đ$, Người 3: $33.333đ$ (Tổng khớp $100.000đ$).
  - Lưu vào `ExpenseSplitRepository.java`.
- **4. Thao tác Cơ sở dữ liệu:**
  - `INSERT INTO expenses (id, group_id, paid_by, amount, title, category, created_at) VALUES (?, ?, ?, 100000, 'Ăn tối', 'Ăn uống', NOW())`.
  - `INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES`
    - `(..., userA, 33334, true)` (Tự gạch nợ)
    - `(..., userB, 33333, false)`
    - `(..., userC, 33333, false)`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` (Trả về Mảng `splits` đã chia hoàn hảo).

---

### 🔹 Luồng 7.4: Thuật toán Chia tiền tùy chỉnh (Custom Split) & Kiểm định vẹn toàn (Validation)
- **1. Sự kiện kích hoạt:** Người dùng tự tay gõ số tiền cho từng người: "A nợ 50k, B nợ 30k, C nợ 20k".
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/expenses` (Truyền lên mảng `splitAmounts`).
- **3. File xử lý dữ liệu (`ExpenseService.java`):**
  - **Tắt chế độ Equal Split:** Khi hệ thống bắt được tham số `splitAmounts`, hàm `calculateCustomSplits` sẽ được gọi thay vì `calculateSplits`.
  - **Kiểm định tính vẹn toàn (Data Integrity):** Ngăn chặn gian lận (người dùng cố tình gõ tổng chia tiền nhỏ hoặc lớn hơn hóa đơn gốc).
  - So khớp $\sum \text{splitAmounts} == \text{totalAmount}$.
  - Nếu sai lệch $\rightarrow$ Bắn lỗi `CUSTOM_SPLIT_MISMATCH`.
- **4. Thao tác Cơ sở dữ liệu:**
  - Nếu hợp lệ, lưu chính xác số tiền do người dùng chỉ định vào bảng `expense_splits`.
- **5. Dữ liệu Phản hồi:** `HTTP 201 Created` hoặc `HTTP 400 Bad Request` kèm mã lỗi `CUSTOM_SPLIT_MISMATCH`.

---

### 🔹 Luồng 7.5: Xóa thành viên & Rời khỏi nhóm an toàn (`Zero-Debt Balance Protection`)
- **1. Sự kiện kích hoạt:** 
  - Chủ nhóm (`OWNER`) bấm nút xóa 🗑️ cạnh một thành viên trong tab *Thành viên*.
  - Hoặc thành viên (`MEMBER`) tự bấm *"Rời nhóm"* trên `GroupDetailScreen.tsx`.
- **2. API tiếp nhận:** `DELETE /api/groups/{groupId}/members/{memberId}`.
- **3. File xử lý dữ liệu (`GroupService.java`):**
  - **Kiểm tra quyền hạn:** Chỉ Chủ nhóm mới được xóa thành viên khác; Thành viên chỉ được tự rời nhóm của mình; Chủ nhóm không được tự rời nếu chưa chuyển nhượng quyền chủ nhóm (`OWNER_CANNOT_LEAVE`).
  - **Kiểm định Tất toán Công nợ (Zero-Debt Integrity Rule):** Gọi `DebtService.calculateGroupDebts(groupId, requesterId)`. 
  - Truy vấn số dư nợ ròng (`net balance`) của thành viên cần xóa.
  - Nếu `balance != 0` (đang nợ người khác hoặc được người khác nợ) $\rightarrow$ Ngăn chặn và trả về lỗi `HTTP 400 Bad Request` (`DEBT_NOT_SETTLED`).
  - Nếu `balance == 0` (đã sòng phẳng 100%) $\rightarrow$ Thực hiện xóa khỏi bảng `group_members`.
  - Bắn thông báo Push / Realtime `GROUP_MEMBER_REMOVED` cho thành viên bị xóa.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM group_members WHERE group_id = ? AND user_id = ?`.
  - `DELETE FROM group_members WHERE id = ?`.
- **5. Dữ liệu Phản hồi:** `HTTP 204 No Content` (Xóa thành công) hoặc `HTTP 400 Bad Request` (`DEBT_NOT_SETTLED`).

---

## 8. PHÂN HỆ THUẬT TOÁN GREEDY RÚT GỌN NỢ & QUYẾT TOÁN VIETQR (DEBT SETTLEMENT)

---

### 🔹 Luồng 8.1: Thuật toán Tối giản nợ (Greedy Min-Cash-Flow Algorithm)
- **1. Sự kiện kích hoạt:** Người dùng mở tab *"Sổ nợ"* (Bảng cân đối kế toán nhóm).
- **2. API tiếp nhận:** `GET /api/groups/{groupId}/debts`.
- **3. File xử lý dữ liệu (`DebtService.java`):**
  - **Bài toán:** A nợ B 50k, B nợ C 50k $\rightarrow$ 2 giao dịch.
  - **Mục tiêu:** Cắt giảm thành 1 giao dịch: A trả C 50k. $O(N^2) \rightarrow O(N)$.
  - **Bước 1 (Tính Net Balance Matrix):** Duyệt qua toàn bộ `expense_splits` chưa trả. Cứ nợ ai thì `-`, được nợ thì `+`. Cuối cùng ra được mảng Tài sản ròng mỗi người.
  - **Bước 2 (Tham Lam Greedy):** Chia 2 danh sách `Debtors` (số dư < 0) và `Creditors` (số dư > 0). Người nợ nhiều nhất lấy tiền trả cho Người chủ nợ nhiều nhất. Lặp lại cho đến khi cả 2 danh sách bằng 0.
- **4. Thao tác Cơ sở dữ liệu:**
  - `SELECT * FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = ? AND es.is_settled = false`.
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK` (Trả về Danh sách giao dịch đã tối ưu hóa).

---

### 🔹 Luồng 8.2: Trả nợ 1-chạm & Mở App Ngân Hàng (App-to-App Deep Linking)
- **1. Sự kiện kích hoạt:** Con nợ B bấm nút **"Trả nợ 📲"** bên cạnh khoản nợ A.
- **2. API tiếp nhận:** Mobile App gọi `GET /api/vietqr/generate` hoặc dùng thuật toán nội bộ.
- **3. File xử lý dữ liệu:**
  - Kỹ thuật Deep Linking: App tự động nhúng Data vào chuỗi URL Scheme (VD: `mbcustom://`, `vcb://`).
  - Gắn kèm số tiền và nội dung chuyển khoản tự động để chống sai sót.
- **4. Thao tác Cơ sở dữ liệu:** Không ghi DB.
- **5. Dữ liệu Phản hồi:** Mở trực tiếp App Ngân hàng, người dùng chỉ việc quét FaceID để chuyển tiền.

---

### 🔹 Luồng 8.3: Báo đã chuyển tiền (Webhook/Payment pending)
- **1. Sự kiện kích hoạt:** B chuyển khoản xong bấm nút *"Tôi đã chuyển"* (Báo cáo thủ công) HOẶC qua Webhook PayOS (Tự động hóa hoàn toàn).
- **2. File xử lý dữ liệu:** Lưu trạng thái `PENDING`, đồng thời dùng `NotificationService` bắn WebSocket và Push FCM cho Chủ nợ.
- **3. Thao tác DB:** `INSERT INTO payments (..., status = 'PENDING')`.

---

### 🔹 Luồng 8.4: Chủ nợ duyệt thanh toán & Thủ thuật Sổ cái (Settle Debt)
- **1. Sự kiện kích hoạt:** Chủ nợ A bấm nút *"Xác nhận đã nhận tiền"*.
- **2. API tiếp nhận:** `POST /api/groups/{groupId}/debts/settle`.
- **3. File xử lý dữ liệu (`DebtService.java`):**
  - **Thủ thuật SETTLEMENT:** Khi A xác nhận B đã trả tiền, làm sao để B hết nợ A trên Sổ cái? Hệ thống sẽ tạo một **"Giao dịch Ảo" (Virtual Expense)** kiểu `SETTLEMENT`. 
  - Trong giao dịch này: "B là người trả tiền hóa đơn, và A là người mượn tiền B". Khoản mượn ngược này sẽ triệt tiêu hoàn toàn khoản nợ gốc.
- **4. Thao tác Cơ sở dữ liệu (Giao dịch ACID):**
  - `UPDATE payments SET status = 'COMPLETED' WHERE id = ?`.
  - `INSERT INTO expenses (..., paid_by = B, category = 'SETTLEMENT')`.
  - `INSERT INTO expense_splits (..., user_id = A, is_settled = true)`.
  - `UPDATE expense_splits SET is_settled = true WHERE id IN (...)` (Đóng đinh nợ cũ).
- **5. Dữ liệu Phản hồi:** `HTTP 200 OK`. B hết nợ.

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

### 🔹 Luồng 10.1: AI Chatbot Cố vấn Tài chính & Kỹ thuật Context Injection
- **1. Sự kiện kích hoạt:** Nhắn tin *"Phân tích chi tiêu tuần này"* trên `AdvisorScreen.tsx`.
- **2. API tiếp nhận:** `POST /api/ai/chat`.
- **3. File xử lý dữ liệu (`AiAssistantService.java` $\rightarrow$ `GeminiService.java`):**
  - **Kỹ thuật Context Injection:** AI mặc định rất "ngu", không biết tiền của User là bao nhiêu. Backend phải "lấy cắp" dữ liệu trong DB (Tổng thu, Tổng chi, Số dư 3 ví, 5 ngân sách, 8 hóa đơn gần nhất) $\rightarrow$ Nhồi (Inject) vào System Prompt ẩn trước khi gửi cho `gemini-3.6-flash`.
  - Kết quả: AI trả lời chính xác từng đồng dựa trên hoàn cảnh của User.
- **4. Thao tác DB:** 3 vòng Query `SELECT` gom dữ liệu Ví, Ngân sách, Giao dịch.
- **5. Dữ liệu Phản hồi:** DTO JSON với câu trả lời, `intent` và mảng `suggestedChips`.

---

### 🔹 Luồng 10.2: Agent AI Tự động hóa - Lập kế hoạch tài chính (Function Calling / Intents)
- **1. Sự kiện kích hoạt:** Nhắn tin: *"Lương 20tr, thiết lập quỹ ăn uống 5tr, xăng xe 1tr"*.
- **2. File xử lý dữ liệu (`AiAssistantService.java`):**
  - AI phân tích câu nói, trích xuất Intent (Ý định) là `SETUP_FINANCIAL_PLAN` và bóc tách thực thể (Entities): `{category: Ăn uống, amount: 5000000}`.
  - Backend nhận Intent $\rightarrow$ Bắn trả cục JSON cấu trúc (Function Calling). App đọc JSON $\rightarrow$ Render UI thẻ *"Xác nhận lập kế hoạch"*. Bấm Xác nhận $\rightarrow$ Gọi API `POST /api/budgets/batch` chèn đồng loạt 4 ngân sách vào Database.

---

### 🔹 Luồng 10.3: Tính điểm Sức khỏe Tài chính toàn diện (Financial Health Score)
- **1. Sự kiện kích hoạt:** Mở tab Tư vấn.
- **2. API tiếp nhận:** `GET /api/financial-health`.
- **3. File xử lý dữ liệu (`FinancialHealthService.java`):**
  - Chạy thuật toán chấm 100 điểm chia đều 4 trụ cột (Mỗi trụ 25 điểm):
    1. **Savings Ratio (Tỷ lệ tiết kiệm):** (Thu - Chi) / Thu. Khung chuẩn 20%.
    2. **Budget Adherence (Kỷ luật ngân sách):** Phạt điểm nếu Over-budget.
    3. **Debt-to-Income (DTI - Nợ trên thu nhập):** Nợ an toàn < 35%.
    4. **Emergency Fund (Quỹ khẩn cấp):** Phải đủ sống 3-6 tháng.
- **4. Dữ liệu Phản hồi:** JSON Điểm số và Lời khuyên hệ chuyên gia.

---

## 11. PHÂN HỆ PHÁT HIỆN DỊ THƯỜNG Z-SCORE & THÔNG BÁO THỜI GIAN THỰC (NOTIFICATIONS)

---

### 🔹 Luồng 11.1: Trí tuệ Nhân tạo nội sinh - Phát hiện dị thường (Z-Score Event Driven)
- **1. Sự kiện kích hoạt:** Ngay khi User lưu 1 giao dịch thành công.
- **2. Cấu trúc Kiến trúc:** Sử dụng cơ chế Pub/Sub của Spring Boot (`ApplicationEventPublisher`). Quá trình này **Tách rời hoàn toàn khỏi Main Thread** (Bất đồng bộ) để API lưu hóa đơn phản hồi trong 5ms mà không bắt người dùng đợi.
- **3. File xử lý dữ liệu (`PfmEventListener.java`):**
  - Nhận sự kiện `TransactionCreatedEvent`.
  - Bắn sang `AnomalyDetectionService.java`. Code tải xuống 20 giao dịch cùng loại gần nhất. Tính Phương sai (Variance) và Độ lệch chuẩn (StdDev). Tính $Z = (X - \mu) / \sigma$.
  - Nếu $Z > 2.0$ $\rightarrow$ Báo động đỏ.
- **4. Kênh Phản hồi:**
  - Lưu vào DB `notifications`.
  - Bắn tín hiệu WebSocket STOMP real-time về App để rung điện thoại (SnackBar đỏ).
  - Giao tiếp với Native Expo Push Service để bắn Push Notification hệ thống.

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
