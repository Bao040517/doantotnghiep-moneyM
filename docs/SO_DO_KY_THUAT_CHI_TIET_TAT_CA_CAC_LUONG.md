# 🏛️ SƠ ĐỒ KỸ THUẬT VÀ TRUY VẾT CHI TIẾT TẤT CẢ CÁC LUỒNG HỆ THỐNG SHAREMONEY
**Dự án**: ShareMoney - Quản lý Tài chính Cá nhân (PFM) & Quyết toán Sổ nợ Nhóm Thông minh (Smart Group Debt Settlement)  
**Tài liệu phục vụ**: Thuyết minh Chi tiết Kiến trúc Hệ thống, Logic File, Thao tác Database & Luồng Dữ liệu Toàn diện cho Hội đồng Giám khảo & Thầy Cô  

---

### 📌 MÔ HÌNH TRUY VẾT CHUẨN HÓA 5 BƯỚC (5-STAGE TRACEABILITY FRAMEWORK)
Mỗi luồng nghiệp vụ trong tài liệu này được cấu trúc nhất quán và chuẩn mực theo đúng quy trình xử lý dữ liệu thực tế:
1. **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
   - *Hành động của người dùng*: Thao tác điều hướng, mở Modal, BottomSheet trên React Native Mobile App (`.tsx`).
   - *Thao tác nhập liệu*: Các giá trị điền vào Form, bàn phím số, chọn danh mục, gắn thẻ Tag.
   - *Xử lý tại Client*: Thẩm tra ràng buộc dữ liệu (Validation), format tiền tệ VND, gọi hàm Axios Service đóng gói Payload.
2. **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
   - *Giao thức mạng*: `HTTPS / RESTful API / WebSocket STOMP`.
   - *API Endpoint*: Phương thức HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) và URI đường dẫn.
   - *Headers*: Đính kèm mã định danh bảo mật `Authorization: Bearer <JWT_Token>`.
   - *Request Body (Payload JSON)*: Cấu trúc dữ liệu JSON chi tiết gửi từ Client lên Server.
3. **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
   - Danh sách và vai trò của từng File (`Filter`, `Controller`, `Service`, `Repository`, `Entity`, `Utils`, `EventListener`).
   - Thứ tự thực thi tuần tự, các giải thuật toán học/nghiệp vụ, kiểm soát giao dịch nguyên tử `@Transactional`.
4. **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
   - *Bảng tác động*: Danh sách các bảng Database PostgreSQL bị tác động (`INSERT`, `UPDATE`, `DELETE`, `SELECT FOR UPDATE`).
   - *Câu lệnh SQL thực thi*: Các câu lệnh SQL tường minh, cơ chế Khóa bi quan (*Pessimistic Locking*), điều kiện `Rollback` khi gặp sự cố.
5. **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
   - *Phản hồi từ máy chủ*: Mã trạng thái HTTP Status (`200 OK`, `201 Created`, `204 No Content`) và JSON Response.
   - *Xử lý tại Client*: Cập nhật State, Hook (`useAuth`, `useAppData`), lưu trữ Secure Storage, hiển thị Toast/Dialog và hiệu ứng âm thanh/chuyển cảnh.

---

## 📑 MỤC LỤC 11 PHÂN HỆ NGHIỆP VỤ HỆ THỐNG

1. [Phân hệ 1: Xác thực, Phân quyền & Quên mật khẩu OTP (Auth)](#1-phân-hệ-xác-thực-phân-quyền--quên-mật-khẩu-otp-auth)
2. [Phân hệ 2: Hồ sơ Người dùng & Ngân hàng VietQR (User & Profile)](#2-phân-hệ-hồ-sơ-người-dùng--ngân-hàng-vietqr-user--profile)
3. [Phân hệ 3: Quản lý Ví Tài chính & Tài sản Ròng (Wallets)](#3-phân-hệ-quản-lý-ví-tài-chính--tài-sản-ròng-wallets)
4. [Phân hệ 4: Quản lý Giao dịch Thu/Chi Cá nhân & Báo cáo Dòng tiền (Transactions & Cashflow)](#4-phân-hệ-quản-lý-giao-dịch-thuchi-cá-nhân-transactions)
5. [Phân hệ 5: Quản lý Ngân sách & Cảnh báo Chi tiêu (Budgets)](#5-phân-hệ-quản-lý-ngân-sách--cảnh-báo-chi-tiêu-budgets)
6. [Phân hệ 6: Hũ Tiết kiệm Heo đất & Phân bổ Tự động (Savings)](#6-phân-hệ-hũ-tiết-kiệm-heo-đất--phân-bổ-tự-động-savings)
7. [Phân hệ 7: Quản lý Nhóm Chi tiêu & Thuật toán Chia tiền (Groups & Expenses)](#7-phân-hệ-quản-lý-nhóm-chi-tiêu--thuật-toán-chia-tiền-groups--expenses)
8. [Phân hệ 8: Thuật toán Greedy Rút gọn Nợ & Quyết toán VietQR (Debt Settlement)](#8-phân-hệ-thuật-toán-greedy-rút-gọn-nợ--quyết-toán-vietqr-debt-settlement)
9. [Phân hệ 9: Cổng Thanh toán Trực tuyến (VNPay & PayOS Open Banking)](#9-phân-hệ-cổng-thanh-toán-trực-tuyến-vnpay--payos)
10. [Phân hệ 10: Trí tuệ Nhân tạo AI Gemini & Điểm Sức khỏe Tài chính (AI & Health)](#10-phân-hệ-trí-tuệ-nhân-tạo-ai-gemini--điểm-sức-khỏe-tài-chính-ai--health)
11. [Phân hệ 11: Phát hiện Dị thường Z-Score & Thông báo Thời gian thực (Notifications)](#11-phân-hệ-phát-hiện-dị-thường-z-score--thông-báo-thời-gian-thực-notifications)
12. [Bảng Tổng kết Ma trận 30 File Lõi & Vai trò Hệ thống](#-bảng-tổng-kết-ma-trận-30-file-lõi--vai-trò-hệ-thống)
13. [Bảng Tổng hợp Ma trận 16 Bảng Database & Ý nghĩa Thực thể](#️-bảng-tổng-hợp-ma-trận-16-bảng-database--ý-nghĩa-thực-thể-database-schema--impact-matrix)

---

## 1. PHÂN HỆ XÁC THỰC, PHÂN QUYỀN & QUÊN MẬT KHẨU OTP (AUTH)

---

### 🔹 Luồng 1.1: Đăng ký tài khoản người dùng mới (Register)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở ứng dụng, tại màn hình `AuthScreen.tsx` chuyển sang tab *"Đăng ký"*.
  - *Thao tác nhập liệu*: Nhập Họ tên ("Nguyễn Văn A"), Email ("nguyenvana@gmail.com"), Mật khẩu ("123456"), Số điện thoại ("0986523787") và nhấn nút *"Đăng ký"*.
  - *Xử lý tại Client*: File `AuthScreen.tsx` kiểm tra định dạng email regex chuẩn RFC 5322, kiểm tra độ dài mật khẩu $\ge 6$ ký tự. Sau đó gọi `authService.register()` đóng gói dữ liệu.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/register` (Public Endpoint, Rate-limit 10 req/phút).
  - *Request Body (Payload JSON)*:
    ```json
    {
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@gmail.com",
      "password": "Password@123",
      "phoneNumber": "0986523787"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `RateLimitingFilter.java`: Kiểm tra IP client bằng thuật toán Token Bucket để chống tạo tài khoản ảo hàng loạt.
  2. `AuthController.java`: Tiếp nhận request, kích hoạt validation bean `@Valid` để thẩm định dữ liệu DTO.
  3. `AuthService.java` (`@Transactional`):
     - Chuẩn hóa email: `email.trim().toLowerCase()`.
     - Kiểm tra trùng lặp email qua `UserRepository.existsByEmail()`. Nếu trùng $\rightarrow$ Bắn `AppException(ErrorCode.USER_ALREADY_EXISTS)`.
     - Mã hóa mật khẩu: Sử dụng `BCryptPasswordEncoder` (Work Factor = 10) chống tấn công Rainbow Table.
     - Tạo Entity `User` với vai trò mặc định `ROLE_USER`.
     - **Cơ chế Cold-start Wallet Initialization**: Tự động tạo ngay 1 Ví mặc định mang tên *"Tiền mặt"* (số dư 0đ) liên kết với user mới để người dùng có thể thao tác ghi chép ngay sau khi vào app.
  4. `JwtUtil.java`: Tạo mã JWT Access Token (hạn 15 phút) chứa Claims `{userId, role}`.
  5. `RefreshTokenService.java`: Sinh chuỗi Refresh Token ngẫu nhiên (UUID v4) có thời hạn sống 7 ngày.
  6. `UserRepository.java`, `WalletRepository.java`, `RefreshTokenRepository.java`: Lưu các thực thể vào DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (INSERT), `wallets` (INSERT), `refresh_tokens` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    -- 1. Kiểm tra tính duy nhất của email
    SELECT COUNT(*) FROM users WHERE email = 'nguyenvana@gmail.com';

    -- 2. Thêm người dùng mới vào hệ thống
    INSERT INTO users (id, email, password_hash, name, phone_number, role, created_at, updated_at) 
    VALUES ('u-uuid-1', 'nguyenvana@gmail.com', '$2a$10$e8...', 'Nguyễn Văn A', '0986523787', 'USER', NOW(), NOW());

    -- 3. Khởi tạo ví tiền mặt mặc định ban đầu
    INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) 
    VALUES ('w-uuid-1', 'u-uuid-1', 'Tiền mặt', 0, 'VND', false, NOW());

    -- 4. Lưu Refresh Token phiên đăng nhập
    INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) 
    VALUES ('rt-uuid-1', 'u-uuid-1', 'd3b07384-d113-46d8-99eb-033d5964f434', NOW() + INTERVAL '7 days', false);
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created` kèm JSON:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "d3b07384-d113-46d8-99eb-033d5964f434",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "user": { "id": "u-uuid-1", "email": "nguyenvana@gmail.com", "name": "Nguyễn Văn A", "role": "USER" }
    }
    ```
  - *Xử lý tại Client*: `useAuth.ts` lưu Access Token và Refresh Token vào Secure Storage / `AsyncStorage`, cập nhật AuthContext, kích hoạt điều hướng vào màn hình chính `DashboardScreen.tsx`.

---

### 🔹 Luồng 1.2: Đăng nhập hệ thống (Login)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng nhập Email và Mật khẩu tại màn hình `AuthScreen.tsx` và nhấn nút *"Đăng nhập"*.
  - *Xử lý tại Client*: Kiểm tra không để trống trường, bật loading indicator trên nút đăng nhập, gọi `authService.login()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/login`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "email": "nguyenvana@gmail.com",
      "password": "Password@123"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AuthController.java`: Tiếp nhận request, ủy quyền cho Spring `AuthenticationManager`.
  2. `CustomUserDetailsService.java`: Tìm kiếm người dùng qua `UserRepository.findByEmail()`.
  3. `DaoAuthenticationProvider.java`: So khớp mật khẩu nhập vào với mã băm BCrypt trong Database. Nếu sai $\rightarrow$ Bắn lỗi `UNAUTHORIZED` (401).
  4. `AuthService.java`: Gọi `JwtUtil` cấp Access Token mới và `RefreshTokenService` cấp Refresh Token mới.
  5. `RefreshTokenRepository.java`: Lưu Refresh Token mới vào DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (SELECT), `refresh_tokens` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM users WHERE email = 'nguyenvana@gmail.com';
    INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES ('rt-uuid-2', 'u-uuid-1', '...', NOW() + INTERVAL '7 days', false);
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `AuthResponse`.
  - *Xử lý tại Client*: Lưu trữ mã Token, khởi tạo kết nối WebSocket STOMP nhận thông báo real-time, chuyển người dùng vào Dashboard.

---

### 🔹 Luồng 1.3: Làm mới Token tự động (Silent Token Refresh)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng đang sử dụng app thì Access Token 15 phút hết hạn. Một API bất kỳ (ví dụ: `GET /api/wallets`) trả về lỗi `HTTP 401 Unauthorized`.
  - *Xử lý tại Client*: Interceptor trong `api.ts` chặn mã lỗi 401, tạm dừng các request khác đưa vào hàng đợi `failedQueue`, tự động kích hoạt API làm mới token ngầm mà người dùng không hề hay biết.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/refresh`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "refreshToken": "d3b07384-d113-46d8-99eb-033d5964f434"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AuthController.java`: Tiếp nhận request.
  2. `RefreshTokenService.java`:
     - Kiểm tra tính hợp lệ và thời hạn 7 ngày của Refresh Token.
     - **Cơ chế Token Rotation**: Thu hồi ngay lập tức (`revoked = true`) Token cũ để chống tấn công phát lại (Replay Attack), cấp phát một Refresh Token hoàn toàn mới.
  3. `JwtUtil.java`: Cấp Access Token mới (15 phút).
  4. `RefreshTokenRepository.java`: Cập nhật trạng thái và lưu token mới.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `refresh_tokens` (SELECT, UPDATE, INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM refresh_tokens WHERE token = 'd3b07384...' AND revoked = false;
    UPDATE refresh_tokens SET revoked = true WHERE id = 'rt-uuid-1';
    INSERT INTO refresh_tokens (id, user_id, token, expiry_date, revoked) VALUES ('rt-uuid-3', 'u-uuid-1', 'new-uuid', NOW() + INTERVAL '7 days', false);
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `{ accessToken, refreshToken, expiresIn: 900 }`.
  - *Xử lý tại Client*: `api.ts` cập nhật Authorization Header mới, tự động phát lại toàn bộ các request đang chờ trong `failedQueue`. Trải nghiệm của người dùng hoàn toàn liền mạch.

---

### 🔹 Luồng 1.4: Quên mật khẩu - Gửi mã OTP qua Gmail (Forgot Password)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng bấm *"Quên mật khẩu?"*, nhập Email tài khoản trên `ForgotPasswordModal.tsx` và nhấn *"Gửi mã xác thực"*.
  - *Xử lý tại Client*: Kiểm tra email hợp lệ, khởi động đồng hồ đếm ngược 60s trên nút gửi lại, gọi `authService.forgotPassword()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/forgot-password`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "email": "nguyenvana@gmail.com"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AuthController.java`: Tiếp nhận request.
  2. `UserRepository.java`: Kiểm tra xem email có tồn tại trên hệ thống không.
  3. `OtpService.java` (High Performance RAM Cache):
     - Sinh mã OTP 6 chữ số ngẫu nhiên qua thuật toán an toàn `SecureRandom`.
     - Lưu mã vào bộ nhớ RAM siêu tốc (`ConcurrentHashMap`) kèm thời gian sống TTL = 300 giây (5 phút), giới hạn tối đa 5 lần thử.
  4. `EmailService.java`:
     - Render template Email HTML chuyên nghiệp có logo ShareMoney và mã OTP nổi bật.
     - Sử dụng `JavaMailSender` truyền qua giao thức SMTP gửi thư đến hòm thư Gmail của người dùng.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (SELECT - Chỉ đọc). Không ghi DB vì quản lý vòng đời OTP hoàn toàn trên RAM siêu tốc.
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM users WHERE email = 'nguyenvana@gmail.com';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` (`"Mã OTP đã được gửi đến email của bạn"`).
  - *Xử lý tại Client*: Chuyển giao diện sang bước nhập mã OTP 6 ô (`OtpInput`) và form nhập mật khẩu mới.

---

### 🔹 Luồng 1.5: Xác thực OTP & Đặt lại mật khẩu mới (Reset Password)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng nhập 6 số OTP nhận được từ Gmail, nhập Mật khẩu mới và bấm *"Xác nhận đổi mật khẩu"*.
  - *Xử lý tại Client*: Kiểm tra đủ 6 ký tự số, kiểm tra độ mạnh mật khẩu mới, gọi `authService.resetPassword()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/reset-password`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "email": "nguyenvana@gmail.com",
      "otp": "839201",
      "newPassword": "NewPassword@2026"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AuthController.java`: Tiếp nhận request.
  2. `OtpService.java`:
     - So khớp OTP trong RAM: Nếu quá 5 phút $\rightarrow$ Báo lỗi `OTP_EXPIRED`.
     - Nếu sai $\rightarrow$ Giảm số lần thử còn lại (`attempts - 1`). Nếu sai quá 5 lần $\rightarrow$ Hủy mã OTP và khóa thao tác (`MAX_OTP_ATTEMPTS_EXCEEDED` - Chống Brute-force).
     - Nếu đúng $\rightarrow$ Xóa mã OTP khỏi RAM để chống tái sử dụng.
  3. `AuthService.java`: Băm mật khẩu mới bằng `BCryptPasswordEncoder`.
  4. `UserRepository.java`: Cập nhật mật khẩu mới vào cơ sở dữ liệu.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE users SET password_hash = '$2a$10$new...', updated_at = NOW() WHERE email = 'nguyenvana@gmail.com';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` (`"Đặt lại mật khẩu thành công"`).
  - *Xử lý tại Client*: Hiển thị Toast thông báo thành công, đóng Modal và tự động điền Email trên form đăng nhập để người dùng đăng nhập lại.

---

### 🔹 Luồng 1.6: Đăng xuất an toàn (Logout)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng vào màn hình Cài đặt tài khoản (`ProfileScreen.tsx`), bấm *"Đăng xuất"* và xác nhận trên Dialog.
  - *Xử lý tại Client*: Gọi `authService.logout()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/auth/logout`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "refreshToken": "d3b07384-d113-46d8-99eb-033d5964f434"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AuthController.java`: Tiếp nhận request.
  2. `RefreshTokenService.java`: Tìm token trong DB và đổi trạng thái `revoked = true`.
  3. `RefreshTokenRepository.java`: Thực thi Update.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `refresh_tokens` (UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE refresh_tokens SET revoked = true WHERE token = 'd3b07384-d113-46d8-99eb-033d5964f434';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` (`"Đăng xuất thành công"`).
  - *Xử lý tại Client*: Xóa toàn bộ Token trong AsyncStorage, ngắt kết nối WebSocket STOMP, xóa sạch Cache RAM và đưa người dùng về `AuthScreen.tsx`.

---

## 2. PHÂN HỆ HỒ SƠ NGƯỜI DÙNG & NGÂN HÀNG VIETQR (USER & PROFILE)

---

### 🔹 Luồng 2.1: Xem thông tin hồ sơ cá nhân (Get Profile)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở tab Hồ sơ (`ProfileScreen.tsx`).
  - *Xử lý tại Client*: Gọi `userService.getProfile()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/users/me`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `UserController.java`: Lấy `userId` từ token thông qua `SecurityUtils.getCurrentUserId()`.
  2. `UserService.java`: Truy vấn thông tin người dùng từ DB, chuyển đổi sang `UserProfileResponse` (loại bỏ trường nhạy cảm `password_hash`).
  3. `UserRepository.java`: Truy vấn bảng `users`.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (SELECT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT id, email, name, phone_number, avatar_url, bank_bin, bank_account_no, bank_account_name, savings_bank_bin, savings_bank_account_no, savings_bank_account_name, role, created_at 
    FROM users WHERE id = 'u-uuid-1';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `UserProfileResponse`.
  - *Xử lý tại Client*: Render thông tin avatar, tên, số điện thoại, thông tin liên kết ngân hàng nhận nợ và ngân hàng tiết kiệm.

---

### 🔹 Luồng 2.2: Cập nhật thông tin & Tài khoản Ngân hàng nhận nợ (Update Bank Details)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Mở `EditProfileModal.tsx`, chọn Ngân hàng Vietcombank (BIN: 970436), nhập STK ("1018273645"), Tên chủ tài khoản ("NGUYEN VAN A") và bấm *"Lưu thay đổi"*.
  - *Xử lý tại Client*: Kiểm tra định dạng STK, gọi `userService.updateProfile()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `PUT /api/users/me`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "name": "Nguyễn Văn A",
      "phoneNumber": "0986523787",
      "bankBin": "970436",
      "bankAccountNo": "1018273645",
      "bankAccountName": "NGUYEN VAN A",
      "savingsBankBin": "970422",
      "savingsBankAccountNo": "0986523787",
      "savingsBankAccountName": "NGUYEN VAN A"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `UserController.java`: Tiếp nhận request.
  2. `UserService.java` (`@Transactional`):
     - Chuẩn hóa tên chủ tài khoản thành chữ IN HOA KHÔNG DẤU (`NGUYEN VAN A`) để in ra mã chuẩn VietQR Napas247.
     - Cập nhật thông tin vào Database.
  3. `UserRepository.java`: Thực thi lệnh Update.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE users 
    SET name = 'Nguyễn Văn A', phone_number = '0986523787', bank_bin = '970436', bank_account_no = '1018273645', bank_account_name = 'NGUYEN VAN A', updated_at = NOW() 
    WHERE id = 'u-uuid-1';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `UserProfileResponse` mới nhất.
  - *Xử lý tại Client*: Hiển thị Toast *"Cập nhật tài khoản ngân hàng thành công"*, đóng Modal.

---

### 🔹 Luồng 2.3: Tra cứu tên chủ tài khoản ngân hàng Napas247 (VietQR Lookup)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng chọn ngân hàng MBBank (BIN: 970422), nhập STK "0986523787" và chuyển con trỏ chuột ra ngoài (sự kiện `onBlur`).
  - *Xử lý tại Client*: Tự động kích hoạt gọi API tra cứu ngầm.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/vietqr/lookup`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "bankBin": "970422",
      "accountNumber": "0986523787"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `BankLookupController.java`: Tiếp nhận request.
  2. `BankLookupService.java`:
     - **Cơ chế Dual Mode (Production API / Smart Dev Mock)**: Nếu có API Key doanh nghiệp trong biến môi trường, hệ thống kết nối trực tiếp đến cổng Napas247 / VietQR Gateway qua `HttpClient`.
     - Nếu chạy môi trường cục bộ/đồ án không có API Key, kích hoạt bộ nhớ `KNOWN_ACCOUNTS` (Mock Data RAM) để phân giải ngay lập tức tên chủ tài khoản tương ứng chỉ trong 5ms.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: Không truy vấn DB nội bộ (Truy vấn qua API Cổng Napas247 hoặc RAM Cache).
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm:
    ```json
    {
      "bankBin": "970422",
      "accountNumber": "0986523787",
      "accountName": "NGUYEN VAN A",
      "isValid": true
    }
    ```
  - *Xử lý tại Client*: Tự động điền tên chủ thẻ vào ô `Tên chủ tài khoản`, hiển thị dấu tích xanh ✅ *"Đã xác thực Napas247"*.

---

### 🔹 Luồng 2.4: Đăng ký mã Push Token thiết bị Native (Native Push Token Register)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở ứng dụng và cấp quyền nhận thông báo trên điện thoại Android/iOS.
  - *Xử lý tại Client*: `useNotifications.ts` gọi `Notifications.getExpoPushTokenAsync()` lấy mã Push Token thiết bị.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/users/me/push-token`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "pushToken": "ExponentPushToken[AbCdEf123456...]"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `UserController.java`: Tiếp nhận mã Push Token.
  2. `UserService.java`: Cập nhật thuộc tính `push_token` của user vào DB.
  3. `UserRepository.java`: Thực thi lệnh Update.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `users` (UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE users SET push_token = 'ExponentPushToken[AbCdEf123456...]' WHERE id = 'u-uuid-1';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Sẵn sàng nhận thông báo Push Notification khi có biến động nợ hoặc cảnh báo tài chính.

---

## 3. PHÂN HỆ QUẢN LÝ VÍ TÀI CHÍNH & TÀI SẢN RÒNG (WALLETS)

---

### 🔹 Luồng 3.1: Lấy danh sách ví & Tính tổng tài sản ròng (Net Worth Calculation)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở màn hình Dashboard hoặc tab Ví (`WalletScreen.tsx`).
  - *Xử lý tại Client*: Gọi đồng thời `walletService.getWallets()` và `walletService.getTotalBalance()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/wallets` và `GET /api/wallets/total-balance`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `WalletController.java`: Tiếp nhận request.
  2. `WalletService.java`:
     - Lấy danh sách toàn bộ các ví của user.
     - Phân loại ví: Nếu `isLiability = false` (Ví tài sản: Tiền mặt, Tiết kiệm, ATM) $\rightarrow$ Cộng vào `Total Assets`. Nếu `isLiability = true` (Ví nợ: Thẻ tín dụng) $\rightarrow$ Cộng vào `Total Liabilities`.
     - **Công thức Tài sản Ròng (Net Worth Formula)**:
       $$\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$$
  3. `WalletRepository.java`: Truy vấn bảng `wallets`.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM wallets WHERE user_id = 'u-uuid-1' ORDER BY created_at ASC;
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm:
    ```json
    {
      "totalBalance": 15000000.0,
      "totalAssets": 20000000.0,
      "totalLiabilities": 5000000.0,
      "currency": "VND"
    }
    ```
  - *Xử lý tại Client*: Render danh sách thẻ ví, hiển thị Card Tổng tài sản ròng với dải màu gradient sang trọng.

---

### 🔹 Luồng 3.2: Tạo ví tài chính mới (Create Wallet)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở `AddWalletBottomSheet.tsx`, điền Tên ví ("Vietcombank Digibank"), Số dư ban đầu (5.000.000đ), chọn Loại ví (Tài sản) và bấm *"Tạo ví"*.
  - *Xử lý tại Client*: Format tiền tệ VND, validate không để trống tên ví, gọi `walletService.createWallet()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/wallets`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "name": "Vietcombank Digibank",
      "balance": 5000000,
      "currency": "VND",
      "bankBin": "970436",
      "bankAccountNo": "1018273645",
      "bankAccountName": "NGUYEN VAN A",
      "isLiability": false
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `WalletController.java`: Tiếp nhận payload, gọi `@Valid`.
  2. `WalletService.java` (`@Transactional`): Khởi tạo thực thể `Wallet` gán liên kết với `User` hiện tại, lưu vào DB.
  3. `WalletRepository.java`: Thực thi lệnh INSERT.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO wallets (id, user_id, name, balance, currency, bank_bin, bank_account_no, bank_account_name, is_liability, created_at) 
    VALUES ('w-uuid-2', 'u-uuid-1', 'Vietcombank Digibank', 5000000, 'VND', '970436', '1018273645', 'NGUYEN VAN A', false, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created` kèm thông tin ví mới tạo.
  - *Xử lý tại Client*: Đóng BottomSheet, làm mới danh sách ví và cập nhật lại số dư khả dụng tức thì trên Dashboard.

---

### 🔹 Luồng 3.3: Chuyển tiền giữa các ví nội bộ (Internal Wallet Transfer)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở `TransferModal.tsx`, chọn Ví nguồn ("Vietcombank"), Ví đích ("Tiền mặt"), nhập số tiền 1.000.000đ và bấm *"Chuyển tiền"*.
  - *Xử lý tại Client*: Kiểm tra Ví nguồn $\ne$ Ví đích, số tiền $> 0$, gọi `walletService.transfer()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/wallets/transfer`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "fromWalletId": "w-uuid-2",
      "toWalletId": "w-uuid-1",
      "amount": 1000000,
      "note": "Rút tiền ATM tiêu vặt"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `WalletController.java`: Tiếp nhận request.
  2. `WalletService.java` (`@Transactional` ACID):
     - **Khóa bi quan (Pessimistic Write Lock)**: Khóa cả 2 ví bằng `SELECT ... FOR UPDATE` chống tranh chấp dữ liệu khi chuyển tiền đồng thời.
     - Kiểm tra số dư Ví nguồn: Nếu `balance < amount` $\rightarrow$ Bắn lỗi `INSUFFICIENT_WALLET_BALANCE`.
     - Trừ tiền Ví nguồn, Cộng tiền Ví đích.
     - Tạo 2 bản ghi giao dịch đối ứng (1 `EXPENSE` cho ví nguồn và 1 `INCOME` cho ví đích) mang danh mục *"Chuyển tiền nội bộ"*.
  3. `WalletRepository.java` & `TransactionRepository.java`: Cập nhật ví và lưu giao dịch.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT FOR UPDATE, UPDATE), `transactions` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    -- 1. Khóa 2 ví trong phiên làm việc
    SELECT * FROM wallets WHERE id IN ('w-uuid-2', 'w-uuid-1') FOR UPDATE;

    -- 2. Trừ tiền ví nguồn và cộng tiền ví đích
    UPDATE wallets SET balance = balance - 1000000 WHERE id = 'w-uuid-2';
    UPDATE wallets SET balance = balance + 1000000 WHERE id = 'w-uuid-1';

    -- 3. Ghi nhận 2 bản ghi giao dịch đối ứng
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, transaction_date, created_at) 
    VALUES ('tx-uuid-1', 'w-uuid-2', 1000000, 'EXPENSE', 'Chuyển tiền nội bộ', 'Rút tiền ATM tiêu vặt', NOW(), NOW());
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, transaction_date, created_at) 
    VALUES ('tx-uuid-2', 'w-uuid-1', 1000000, 'INCOME', 'Nhận tiền nội bộ', 'Rút tiền ATM tiêu vặt', NOW(), NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` (`"Chuyển tiền thành công"`).
  - *Xử lý tại Client*: Hiển thị Toast thông báo thành công, đóng Modal và cập nhật số dư cả 2 ví.

---

### 🔹 Luồng 3.4: Xóa ví & Chặn xóa ví có lịch sử giao dịch (Protected Wallet Deletion)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bấm nút Xóa ví trong chi tiết ví và xác nhận xóa.
  - *Xử lý tại Client*: Gọi `walletService.deleteWallet(walletId)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `DELETE /api/wallets/{walletId}`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `WalletController.java`: Tiếp nhận request.
  2. `WalletService.java`:
     - Kiểm tra quyền sở hữu ví của user.
     - **Kiểm định Toàn vẹn Lịch sử Kế toán**: Truy vấn bảng `transactions`. Nếu ví này đã từng phát sinh bất kỳ giao dịch nào $\rightarrow$ Chặn đứng và bắn lỗi `AppException(ErrorCode.WALLET_HAS_TRANSACTIONS)` để bảo toàn sổ cái.
     - Nếu ví trống $\rightarrow$ Thực hiện xóa.
  3. `WalletRepository.java`: Thực thi xóa.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transactions` (SELECT EXISTS), `wallets` (DELETE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT EXISTS(SELECT 1 FROM transactions WHERE wallet_id = 'w-uuid-2');
    DELETE FROM wallets WHERE id = 'w-uuid-2' AND user_id = 'u-uuid-1';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 204 No Content` (hoặc `HTTP 400 Bad Request` nếu ví có giao dịch).
  - *Xử lý tại Client*: Xóa ví khỏi danh sách, làm mới Dashboard.

---

## 4. PHÂN HỆ QUẢN LÝ GIAO DỊCH THU/CHI CÁ NHÂN (TRANSACTIONS)

---

### 🔹 Luồng 4.1: Thêm giao dịch Chi tiêu cá nhân (Create Expense) - Siêu Luồng Tích Hợp
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở `AddTransactionModal.tsx`.
  - *Thao tác nhập liệu*: Nhập số tiền 65.000đ, chọn loại `EXPENSE`, chọn danh mục "Ăn uống", chọn ví "Tiền mặt", nhập tên quán "Phở Bò Gia Truyền", gắn tag `#AnSang` và bấm *"Lưu giao dịch"*.
  - *Xử lý tại Client*: Validate số tiền $> 0$, gọi `transactionService.createTransaction()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/transactions`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "walletId": "w-uuid-1",
      "amount": 65000,
      "type": "EXPENSE",
      "category": "Ăn uống",
      "payeeName": "Phở Bò Gia Truyền",
      "tags": ["AnSang"],
      "transactionDate": "2026-09-03T07:30:00Z",
      "description": "Ăn sáng phở bò"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `RateLimitingFilter.java` & `SecurityUtils.java`: Thẩm định JWT và kiểm soát tần suất request.
  2. `TransactionController.java`: Tiếp nhận request, gọi `@Valid`.
  3. `TransactionService.java` (`@Transactional`):
     - **Quản lý Payee & Tags tự động**: Tìm kiếm quán "Phở Bò Gia Truyền" và tag `#AnSang` trong DB, nếu chưa có thì tự động tạo mới (`Auto-creation`).
     - **Khóa dòng an toàn (Pessimistic Write Lock)**: Thực hiện `SELECT ... FOR UPDATE` trên ví Tiền mặt để trừ tiền chính xác tuyệt đối trong môi trường đa luồng.
     - **Trừ tiền ví**: `wallet.setBalance(wallet.getBalance().subtract(amount))`.
     - **Liên kết Ngân sách**: Tra cứu ngân sách tháng của "Ăn uống", tính lũy kế chi tiêu và cập nhật tiến trình ngân sách.
     - **Kích hoạt Bất đồng bộ Phát hiện Dị thường**: Đóng gói `TransactionCreatedEvent` bắn sang Spring `ApplicationEventPublisher` kích hoạt thuật toán Z-Score chạy ngầm mà không làm chậm API.
  4. `TransactionRepository.java` & `WalletRepository.java`: Lưu giao dịch và cập nhật số dư ví.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT FOR UPDATE, UPDATE), `payees` (INSERT), `transactions` (INSERT), `budgets` (SELECT/UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    -- 1. Khóa và đọc thông tin ví
    SELECT * FROM wallets WHERE id = 'w-uuid-1' FOR UPDATE;

    -- 2. Khấu trừ số dư ví
    UPDATE wallets SET balance = balance - 65000 WHERE id = 'w-uuid-1';

    -- 3. Tạo địa điểm quán ăn nếu chưa tồn tại
    INSERT INTO payees (id, user_id, name, created_at) 
    VALUES ('p-uuid-1', 'u-uuid-1', 'Phở Bò Gia Truyền', NOW()) 
    ON CONFLICT DO NOTHING;

    -- 4. Lưu bản ghi giao dịch chi tiêu mới
    INSERT INTO transactions (id, wallet_id, amount, type, category_id, payee_id, transaction_date, note, created_at) 
    VALUES ('tx-uuid-3', 'w-uuid-1', 65000, 'EXPENSE', 'cat-uuid-an-uong', 'p-uuid-1', NOW(), 'Ăn sáng phở bò', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created` kèm `TransactionResponse`.
  - *Xử lý tại Client*: Cập nhật số dư ví trên Dashboard, đưa giao dịch lên đầu danh sách lịch sử, phát âm thanh hiệu ứng "ting-ting" nhẹ.

---

### 🔹 Luồng 4.2: Sửa giao dịch & Cơ chế Hoàn tác Số dư Tự động (Revert & Re-apply Balance)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng sửa số tiền giao dịch từ 65.000đ thành 50.000đ và đổi sang Ví Vietcombank trong `EditTransactionModal.tsx`.
  - *Xử lý tại Client*: Gọi `transactionService.updateTransaction()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `PUT /api/transactions/{id}`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "walletId": "w-uuid-2",
      "amount": 50000,
      "type": "EXPENSE",
      "category": "Ăn uống",
      "description": "Ăn sáng bún bò"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `TransactionController.java`: Tiếp nhận request.
  2. `TransactionService.java` (`@Transactional`):
     - **Thuật toán Hoàn tác số dư (Balance Revert Algorithm)**: Lấy lại thông tin giao dịch cũ. Do là `EXPENSE` cũ 65k $\rightarrow$ Tự động **cộng hoàn trả lại 65k** vào Ví Tiền mặt cũ.
     - Áp dụng thông tin giao dịch mới: **Trừ 50k** vào Ví Vietcombank mới chọn.
     - Bảo đảm tuyệt đối số dư tài sản không bao giờ bị lệch sổ kế toán.
  3. `TransactionRepository.java` & `WalletRepository.java`: Cập nhật DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transactions` (SELECT FOR UPDATE, UPDATE), `wallets` (UPDATE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM transactions WHERE id = 'tx-uuid-3' FOR UPDATE;
    UPDATE wallets SET balance = balance + 65000 WHERE id = 'w-uuid-1'; -- Hoàn trả ví cũ
    UPDATE wallets SET balance = balance - 50000 WHERE id = 'w-uuid-2'; -- Trừ tiền ví mới
    UPDATE transactions SET amount = 50000, wallet_id = 'w-uuid-2', updated_at = NOW() WHERE id = 'tx-uuid-3';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Cập nhật số dư các ví liên quan và cập nhật lại dòng lịch sử giao dịch.

---

### 🔹 Luồng 4.3: Xóa giao dịch & Hoàn tiền về ví (Delete Transaction & Refund)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng bấm nút Xóa giao dịch trong `TransactionDetailModal.tsx`.
  - *Xử lý tại Client*: Gọi `transactionService.deleteTransaction()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `DELETE /api/transactions/{id}`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `TransactionService.java` (`@Transactional`): Khóa ví, nếu xóa khoản chi `EXPENSE` $\rightarrow$ Tự động cộng hoàn lại tiền vào ví; xóa bản ghi giao dịch.
  2. `TransactionRepository.java` & `WalletRepository.java`: Thực thi Update ví và Delete giao dịch.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (UPDATE), `transactions` (DELETE).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE wallets SET balance = balance + 50000 WHERE id = (SELECT wallet_id FROM transactions WHERE id = 'tx-uuid-3');
    DELETE FROM transactions WHERE id = 'tx-uuid-3';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 204 No Content`.
  - *Xử lý tại Client*: Xóa item khỏi danh sách, cộng lại số dư ví trên UI.

---

### 🔹 Luồng 4.4: Chia nhỏ giao dịch đa danh mục (Split Transaction)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Đi siêu thị hết 500.000đ, người dùng muốn tách thành 300.000đ "Ăn uống" và 200.000đ "Đồ gia dụng" trên `SplitTransactionModal.tsx`.
  - *Xử lý tại Client*: Kiểm tra tổng tiền các phần chia == 500.000đ, gọi `transactionService.splitTransaction()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/transactions/{id}/split`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "splits": [
        { "categoryId": "cat-uuid-an-uong", "amount": 300000 },
        { "categoryId": "cat-uuid-gia-dung", "amount": 200000 }
      ]
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `TransactionController.java`: Tiếp nhận request.
  2. `TransactionService.java` (`@Transactional`):
     - Xác thực tổng tiền các phần chia nhỏ phải khớp chính xác 100% với giao dịch cha (`SPLIT_AMOUNT_MISMATCH`).
     - Lưu các dòng con vào bảng `transaction_splits`.
  3. `TransactionSplitRepository.java`: Thực thi lưu DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transaction_splits` (INSERT), `transactions` (SELECT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO transaction_splits (id, transaction_id, category_id, amount, created_at) 
    VALUES ('ts-1', 'tx-uuid-4', 'cat-uuid-an-uong', 300000, NOW()), ('ts-2', 'tx-uuid-4', 'cat-uuid-gia-dung', 200000, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Hiển thị icon đa danh mục trên thẻ giao dịch.

---

### 🔹 Luồng 4.5: Báo cáo Thống kê Dòng tiền & Cơ cấu Chi tiêu Đa Chiều (Cashflow & Category Analytics)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở màn hình Báo cáo (`ReportScreen.tsx`), chuyển đổi giữa các tab xem Dòng tiền 6 Tuần, 6 Tháng, 5 Năm hoặc xem Biểu đồ tròn Cơ cấu chi tiêu theo Danh mục.
  - *Xử lý tại Client*: Gọi `transactionService.getMonthlySummary(year, month)` và `transactionService.getCashflowSummary(year, month)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/transactions/summary/monthly?year=2026&month=9` và `GET /api/transactions/summary/cashflow?year=2026&month=9`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `TransactionController.java`: Tiếp nhận request, phân giải tham số tháng/năm.
  2. `TransactionService.java`:
     - Gom nhóm và tính tổng doanh số Thu (`INCOME`) và Chi (`EXPENSE`) trong kỳ kế toán.
     - **Động cơ phân tích Dòng tiền Đối xứng (Two-way Symmetric Cashflow Engine)**: Tính Net Cashflow = Thu - Chi (Cột dương thể hiện thặng dư tài chính, cột âm thể hiện thâm hụt tài chính).
     - Gom nhóm theo từng danh mục (`Category Breakdown`), tính tỷ trọng phần trăm (%) chi tiêu trên tổng ngân sách và sắp xếp giảm dần.
  3. `TransactionRepository.java`: Thực thi các câu lệnh truy vấn gom nhóm (`GROUP BY`) tối ưu tốc độ.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transactions` (SELECT Aggregate GROUP BY), `categories` (SELECT JOIN), `wallets` (SELECT subquery).
  - **Câu lệnh SQL thực thi**:
    ```sql
    -- 1. Gom tổng thu chi theo từng danh mục trong tháng
    SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) AS total_amount 
    FROM transactions t 
    JOIN categories c ON t.category_id = c.id 
    WHERE t.wallet_id IN (SELECT id FROM wallets WHERE user_id = 'u-uuid-1') 
      AND EXTRACT(MONTH FROM t.transaction_date) = 9 
      AND EXTRACT(YEAR FROM t.transaction_date) = 2026 
    GROUP BY c.name, c.icon 
    ORDER BY total_amount DESC;
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `MonthlySummaryResponse` / `CashflowSummaryResponse`.
  - *Xử lý tại Client*: Kết xuất biểu đồ tròn Donut Chart SVG đa phân đoạn và Biểu đồ cột đối xứng 2 chiều qua mốc 0 cực kỳ trực quan.

---

## 5. PHÂN HỆ QUẢN LÝ NGÂN SÁCH & CẢNH BÁO CHI TIÊU (BUDGETS)

---

### 🔹 Luồng 5.1: Thiết lập ngân sách & Lên lịch hóa đơn (Set Budget & Bills)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở `BudgetScreen.tsx`, đặt hạn mức danh mục "Ăn uống" là 3.000.000đ trong tháng 9/2026 và bấm *"Lưu ngân sách"*.
  - *Xử lý tại Client*: Validate số tiền $> 0$, gọi `budgetService.setBudget()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/budgets/set` (Cơ chế Upsert thông minh).
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "categoryId": "cat-uuid-an-uong",
      "limitAmount": 3000000,
      "month": 9,
      "year": 2026,
      "type": "FLEXIBLE",
      "isRecurring": true,
      "isMandatory": true,
      "dueDayOfMonth": null
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `BudgetController.java`: Tiếp nhận request.
  2. `BudgetService.java` (`@Transactional`):
     - **Logic Upsert (Cập nhật hoặc Tạo mới)**: Kiểm tra xem user đã tạo ngân sách cho danh mục này trong tháng chưa. Nếu có $\rightarrow$ Ghi đè hạn mức mới; Nếu chưa $\rightarrow$ Tạo bản ghi mới.
     - **Xử lý Hóa đơn định kỳ (`BILL`)**: Tự động liên kết ngày đến hạn (`dueDayOfMonth`) để nhắc nợ tiền điện/tiền nhà.
  3. `BudgetRepository.java`: Thực thi truy vấn và lưu DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `budgets` (SELECT, UPDATE hoặc INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM budgets WHERE user_id = 'u-uuid-1' AND category_id = 'cat-uuid-an-uong' AND month = 9 AND year = 2026;
    -- Nếu đã tồn tại:
    UPDATE budgets SET limit_amount = 3000000, type = 'FLEXIBLE', is_recurring = true, updated_at = NOW() WHERE id = 'b-uuid-1';
    -- Nếu chưa tồn tại:
    INSERT INTO budgets (id, user_id, category_id, limit_amount, month, year, type, is_recurring, is_mandatory, created_at) 
    VALUES ('b-uuid-1', 'u-uuid-1', 'cat-uuid-an-uong', 3000000, 9, 2026, 'FLEXIBLE', true, true, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `BudgetSummaryResponse`.
  - *Xử lý tại Client*: Thêm thẻ ngân sách vào màn hình, hiển thị trạng thái ban đầu `"OK"` 🟢.

---

### 🔹 Luồng 5.2: Tính toán tiến độ ngân sách không hồi tố (Creation-Date Aware Non-Retroactive)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Mở `BudgetScreen.tsx` để xem tiến độ chi tiêu các khoản ngân sách.
  - *Xử lý tại Client*: Gọi `budgetService.getBudgetSummary(month, year)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/budgets/summary?month=9&year=2026`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `BudgetController.java`: Tiếp nhận tham số tháng/năm.
  2. `BudgetService.java`:
     - **Thuật toán Tính toán Non-Retroactive (Không hồi tố thời gian)**: Nếu ngày mùng 5 người dùng mới tạo ngân sách "Ăn uống 3 triệu", thì các khoản ăn uống ngày 1, 2, 3, 4 sẽ **không bị tính vào ngân sách** này. Hệ thống chỉ gom các giao dịch có `transaction_date >= budget.created_at`.
     - Tính tỷ lệ phần trăm đã tiêu: `percentage = (spentAmount / limitAmount) * 100`.
     - Gán cờ trạng thái 3 dải màu:
       - `percentage < 80%` $\rightarrow$ Trạng thái `"OK"` 🟢 (An toàn).
       - `80% <= percentage < 100%` $\rightarrow$ Trạng thái `"WARNING"` 🟡 (Cảnh báo sắp chạm trần).
       - `percentage >= 100%` $\rightarrow$ Trạng thái `"OVER"` 🔴 (Đã vượt hạn mức / Bội chi).
  3. `BudgetRepository.java` & `TransactionRepository.java`: Thực thi truy vấn.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `budgets` (SELECT), `transactions` (SELECT aggregate SUM), `wallets` (SELECT subquery).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM budgets WHERE user_id = 'u-uuid-1' AND month = 9 AND year = 2026;
    SELECT COALESCE(SUM(amount), 0) FROM transactions 
    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = 'u-uuid-1') 
      AND category_id = 'cat-uuid-an-uong' 
      AND transaction_date >= '2026-09-01T00:00:00Z';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm danh sách `BudgetSummaryResponse`.
  - *Xử lý tại Client*: Render thanh tiến độ hiển thị trực quan theo 3 dải màu Xanh/Vàng/Đỏ.

---

### 🔹 Luồng 5.3: Tính toán Số dư Khả dụng Thực tế (Real Safe-to-Spend)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Xem Card Hero *"SỐ DƯ KHẢ DỤNG"* và *"Chi tiêu an toàn hôm nay"* trên `DashboardScreen.tsx`.
  - *Xử lý tại Client*: Gọi `budgetService.getSafeToSpend()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/budgets/safe-to-spend?year=2026&month=9`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `BudgetService.java`:
     - Gom tổng thu nhập trong tháng: $\text{Total Income}$.
     - Gom tổng các hóa đơn bắt buộc phải trả: $\text{Total Bills}$.
     - Gom tổng chi tiêu linh hoạt đã tiêu: $\text{Flexible Spent}$.
     - **Công thức Số dư Khả dụng Thực tế (100% Real Money Formula)**:
       $$\text{Safe Balance Total} = \text{Total Income} - \text{Total Bills} - \text{Flexible Spent}$$
     - Tính hạn mức chi tiêu an toàn theo ngày: $\text{Safe Daily} = \text{Safe Balance Total} / \text{Days Left}$.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transactions` (SELECT aggregate SUM), `budgets` (SELECT), `wallets` (SELECT).
  - **Câu lệnh SQL thực thi**: Tính tổng thu/chi từ bảng `transactions` kết hợp các ví của người dùng.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm:
    ```json
    {
      "totalIncome": 20000000.0,
      "totalBills": 5000000.0,
      "flexibleSpent": 3500000.0,
      "safeBalanceTotal": 11500000.0,
      "safeBalanceDaily": 425925.0,
      "daysLeft": 27
    }
    ```
  - *Xử lý tại Client*: Hiển thị số tiền khả dụng to rõ trên Card chính của Dashboard.

---

## 6. PHÂN HỆ HŨ TIẾT KIỆM HEO ĐẤT & PHÂN BỔ TỰ ĐỘNG (SAVINGS)

---

### 🔹 Luồng 6.1: Tạo mục tiêu tiết kiệm heo đất mới (Create Savings Goal)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bấm nút `+` trên `SavingsScreen.tsx`, nhập Tên mục tiêu ("Mua MacBook Pro M3"), Số tiền đích (45.000.000đ), Hạn chót (31/12/2026), Mức ưu tiên (`HIGH`) và bấm *"Tạo hũ"*.
  - *Xử lý tại Client*: Validate số tiền $> 0$, gọi `savingsGoalService.createGoal()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/savings-goals`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "name": "Mua MacBook Pro M3",
      "targetAmount": 45000000,
      "deadline": "2026-12-31",
      "priority": "HIGH"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `SavingsGoalController.java`: Tiếp nhận request.
  2. `SavingsGoalService.java` (`@Transactional`): Khởi tạo đối tượng `SavingsGoal` với `currentAmount = 0`, trạng thái `"IN_PROGRESS"`.
  3. `SavingsGoalRepository.java`: Thực thi INSERT.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `savings_goals` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, priority, status, created_at) 
    VALUES ('sg-uuid-1', 'u-uuid-1', 'Mua MacBook Pro M3', 45000000, 0, '2026-12-31', 'HIGH', 'IN_PROGRESS', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created` kèm `SavingsGoalResponse`.
  - *Xử lý tại Client*: Thêm thẻ hũ heo đất vào giao diện.

---

### 🔹 Luồng 6.2: Nạp tiền tích lũy vào heo đất (Fund Savings Goal)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bấm nút *"Nạp tiền"* trên thẻ mục tiêu tiết kiệm, chọn nguồn từ Ví Tiền mặt, nhập 5.000.000đ và xác nhận.
  - *Xử lý tại Client*: Gọi `savingsGoalService.fundGoal(goalId, walletId, 5000000)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/savings-goals/{id}/fund`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "walletId": "w-uuid-1",
      "amount": 5000000
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `SavingsGoalController.java`: Tiếp nhận request.
  2. `SavingsGoalService.java` (`@Transactional`):
     - Khóa ví `SELECT ... FOR UPDATE` kiểm tra số dư khả dụng.
     - Trừ 5.000.000đ từ Ví Tiền mặt.
     - Cộng 5.000.000đ vào `currentAmount` của hũ tiết kiệm.
     - Tự động kiểm tra: Nếu `currentAmount >= targetAmount` $\rightarrow$ Chuyển trạng thái thành `"COMPLETED"` 🎉 và gửi thông báo chúc mừng.
     - Tạo 1 bản ghi `Transaction` kiểu `EXPENSE` danh mục *"Tích lũy tiết kiệm"* để sao kê ví không bị mất dấu tiền.
  3. `WalletRepository.java` & `SavingsGoalRepository.java`: Cập nhật DB đồng thời.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT FOR UPDATE, UPDATE), `savings_goals` (SELECT, UPDATE), `transactions` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM wallets WHERE id = 'w-uuid-1' FOR UPDATE;
    UPDATE wallets SET balance = balance - 5000000 WHERE id = 'w-uuid-1';
    UPDATE savings_goals SET current_amount = current_amount + 5000000, status = CASE WHEN current_amount + 5000000 >= target_amount THEN 'COMPLETED' ELSE 'IN_PROGRESS' END, updated_at = NOW() WHERE id = 'sg-uuid-1';
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at) VALUES ('tx-uuid-5', 'w-uuid-1', 5000000, 'EXPENSE', 'Tích lũy tiết kiệm', 'Trích gửi mục tiêu Mua MacBook', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Cập nhật thanh % tiến độ heo đất, trừ tiền ví trên UI.

---

### 🔹 Luồng 6.3: Rút tiền từ heo đất về ví (Withdraw from Savings Goal)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bấm nút *"Rút tiền"* từ hũ tiết kiệm về lại Ví Vietcombank số tiền 2.000.000đ.
  - *Xử lý tại Client*: Gọi `savingsGoalService.withdraw()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/savings-goals/{id}/withdraw`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "walletId": "w-uuid-2",
      "amount": 2000000
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `SavingsGoalService.java` (`@Transactional`):
     - Kiểm tra số dư trong hũ: Nếu `currentAmount < amount` $\rightarrow$ Báo lỗi `INSUFFICIENT_SAVINGS_BALANCE`.
     - Trừ tiền hũ tiết kiệm, cộng tiền vào Ví chỉ định.
     - Tạo bản ghi `Transaction` kiểu `INCOME` danh mục *"Rút tiền tiết kiệm"*.
  2. `SavingsGoalRepository.java` & `WalletRepository.java`: Cập nhật DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `savings_goals` (UPDATE), `wallets` (UPDATE), `transactions` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE savings_goals SET current_amount = current_amount - 2000000, status = 'IN_PROGRESS', updated_at = NOW() WHERE id = 'sg-uuid-1';
    UPDATE wallets SET balance = balance + 2000000 WHERE id = 'w-uuid-2';
    INSERT INTO transactions (id, wallet_id, amount, type, category, description, created_at) VALUES ('tx-uuid-6', 'w-uuid-2', 2000000, 'INCOME', 'Rút tiền tiết kiệm', 'Rút từ hũ MacBook', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Giảm % tích lũy trên thẻ hũ, cộng số dư ví.

---

### 🔹 Luồng 6.4: Thuật toán Phân bổ Tiết kiệm Tự động (Greedy Priority Auto-Allocate)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bấm nút *"Phân bổ tiết kiệm tự động"* trên `SavingsScreen.tsx`.
  - *Xử lý tại Client*: Gọi `savingsGoalService.autoAllocate()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/savings-goals/auto-allocate`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `SavingsGoalService.java` (Giải thuật Tham lam Ưu tiên):
     - **Bước 1**: Lấy số dư an toàn khả dụng (`Safe-to-Spend`).
     - **Bước 2**: Lấy danh sách các hũ tiết kiệm đang dở dang (`IN_PROGRESS`).
     - **Bước 3 - Sắp xếp đa tầng**:
       - Tầng 1: Sắp xếp theo độ ưu tiên: `HIGH` $\rightarrow$ `MEDIUM` $\rightarrow$ `LOW`.
       - Tầng 2: Nếu cùng độ ưu tiên, sắp xếp theo Hạn chót (Deadline gần nhất ưu tiên rót trước).
     - **Bước 4 - Vòng lặp rót tiền Water-Filling**: Lần lượt đổ đầy số tiền còn thiếu của từng hũ. Hũ A đầy $\rightarrow$ Số dư còn thừa tiếp tục đổ vào hũ B, hũ C cho đến khi cạn ngân sách an toàn.
  2. `SavingsGoalRepository.java`: Batch Update trạng thái các hũ.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `savings_goals` (SELECT, BATCH UPDATE).
  - **Câu lệnh SQL thực thi**: Cập nhật đồng loạt các bản ghi `savings_goals` trong 1 Transaction duy nhất.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm danh sách chi tiết các hũ đã được rót vốn thành công.
  - *Xử lý tại Client*: Hiển thị animation rót tiền vào các hũ.

---

## 7. PHÂN HỆ QUẢN LÝ NHÓM CHI TIÊU & THUẬT TOÁN CHIA TIỀN (GROUPS & EXPENSES)

---

### 🔹 Luồng 7.1: Tạo nhóm chi tiêu mới (Create Group)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng nhập Tên nhóm ("Hội Du Lịch Đà Lạt"), chọn ảnh bìa, chọn bạn bè và bấm *"Tạo nhóm"* trên `GroupsScreen.tsx`.
  - *Xử lý tại Client*: Validate tên nhóm không để trống, gọi `groupService.createGroup()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/groups`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "name": "Hội Du Lịch Đà Lạt",
      "description": "Chuyến đi 3 ngày 2 đêm",
      "avatarUrl": "https://api.dicebear.com/7.x/identicon/svg?seed=dalat",
      "memberIds": ["u-uuid-2", "u-uuid-3"]
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `GroupController.java`: Tiếp nhận request.
  2. `GroupService.java` (`@Transactional`):
     - Tạo Entity `Group`, tự động gán người tạo làm `owner`.
     - Tạo Entity `GroupMember` với vai trò `"owner"` cho người tạo nhóm.
     - Duyệt qua `memberIds`, tạo `GroupMember` với vai trò `"member"` cho các thành viên được mời.
     - Gọi `NotificationService` gửi thông báo Push/Realtime `GROUP_MEMBER_ADDED` cho bạn bè.
  3. `GroupRepository.java` & `GroupMemberRepository.java`: Lưu nhóm và thành viên.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `"groups"` (INSERT), `group_members` (INSERT), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO "groups" (id, name, description, avatar_url, owner_id, created_at) VALUES ('g-uuid-1', 'Hội Du Lịch Đà Lạt', 'Chuyến đi 3 ngày 2 đêm', '...', 'u-uuid-1', NOW());
    INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES ('gm-1', 'g-uuid-1', 'u-uuid-1', 'owner', NOW());
    INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES ('gm-2', 'g-uuid-1', 'u-uuid-2', 'member', NOW());
    INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES ('gm-3', 'g-uuid-1', 'u-uuid-3', 'member', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created` kèm `GroupResponse`.
  - *Xử lý tại Client*: Thêm nhóm mới vào danh sách trên `GroupsScreen.tsx`.

---

### 🔹 Luồng 7.2: Quét mã QR gia nhập nhóm 1-chạm (Join Group via Vector QR)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Thành viên mở camera quét mã QR của nhóm trên màn hình bạn bè và bấm *"Tham gia ngay"* trên `GroupPreviewModal.tsx`.
  - *Xử lý tại Client*: Gọi `groupService.joinGroup(groupId)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/groups/{groupId}/preview` (xem trước) và `POST /api/groups/{groupId}/join` (tham gia).
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `GroupController.java`: Tiếp nhận request.
  2. `GroupService.java`: Kiểm tra xem user đã là thành viên chưa (`existsByGroup_IdAndUser_Id`). Nếu chưa $\rightarrow$ Thêm bản ghi `GroupMember`. Gửi thông báo cho Chủ nhóm.
  3. `GroupMemberRepository.java`: Lưu bản ghi mới.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `group_members` (SELECT COUNT, INSERT), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT COUNT(*) FROM group_members WHERE group_id = 'g-uuid-1' AND user_id = 'u-uuid-4';
    INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES ('gm-4', 'g-uuid-1', 'u-uuid-4', 'member', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Đóng Modal Preview, mở thẳng màn hình chi tiết nhóm `GroupDetailScreen.tsx`.

---

### 🔹 Luồng 7.3: Thuật toán Chia đều Bù lẻ Remainder (Equal Split Algorithm)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Bạn A trả tiền hóa đơn ăn tối 100.000đ cho 3 người (A, B, C) theo phương thức chia đều.
  - *Xử lý tại Client*: Gọi `groupService.createExpense()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/groups/{groupId}/expenses`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "title": "Ăn tối",
      "amount": 100000,
      "category": "Ăn uống",
      "paidBy": "u-uuid-1",
      "splitUserIds": ["u-uuid-1", "u-uuid-2", "u-uuid-3"]
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `ExpenseController.java`: Tiếp nhận request.
  2. `ExpenseService.java` (Thuật toán Bù Lẻ Remainder Engine):
     - **Bài toán số học**: $100.000 / 3 = 33.333,3333...$ Gây thất thoát tiền nếu làm tròn thô sơ.
     - **Giải thuật Bù Lẻ**:
       1. Tính tiền cơ sở: `baseAmount = Math.floor(100.000 / 3) = 33.333đ`.
       2. Tính số dư thừa lẻ: `remainder = 100.000 - (33.333 * 3) = 1đ`.
       3. Vòng lặp chia tiền: Cộng thêm 1đ cho các thành viên đầu tiên trong mảng.
       4. Kết quả: Người A gánh 33.334đ, Người B gánh 33.333đ, Người C gánh 33.333đ $\rightarrow$ Tổng khớp chính xác **100.000đ**.
     - Tạo các bản ghi `ExpenseSplit` (Người trả A được tự động đánh dấu `isSettled = true`, người B và C có `isSettled = false`).
  3. `ExpenseRepository.java` & `ExpenseSplitRepository.java`: Lưu hóa đơn và các phần chia.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `expenses` (INSERT), `expense_splits` (BATCH INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO expenses (id, group_id, paid_by, amount, title, category, created_at) VALUES ('exp-1', 'g-uuid-1', 'u-uuid-1', 100000, 'Ăn tối', 'Ăn uống', NOW());
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES 
      ('es-1', 'exp-1', 'u-uuid-1', 33334, true),
      ('es-2', 'exp-1', 'u-uuid-2', 33333, false),
      ('es-3', 'exp-1', 'u-uuid-3', 33333, false);
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created`.
  - *Xử lý tại Client*: Cập nhật danh sách hóa đơn và làm mới tab "Ai nợ ai".

---

### 🔹 Luồng 7.4: Thuật toán Chia tiền tùy chỉnh (Custom Exact Split)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Chọn tab *"Số tiền cụ thể"*, gõ số tiền riêng cho từng người: "A: 50.000đ, B: 30.000đ, C: 20.000đ" (tổng 100.000đ).
  - *Xử lý tại Client*: Bật card cảnh báo màu vàng khi tổng tiền nhập chưa khớp hóa đơn, ẩn hoàn toàn khi khớp 100%. Gọi `groupService.createExpense()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/groups/{groupId}/expenses`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "title": "Ăn lẩu",
      "amount": 100000,
      "paidBy": "u-uuid-1",
      "splitUserIds": ["u-uuid-1", "u-uuid-2", "u-uuid-3"],
      "splitAmounts": { "u-uuid-1": 50000, "u-uuid-2": 30000, "u-uuid-3": 20000 }
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `ExpenseController.java`: Tiếp nhận request.
  2. `ExpenseService.java` (`@Transactional`):
     - **Kiểm định Vẹn toàn Số liệu (Data Integrity)**: Tính tổng $\sum \text{splitAmounts}$. Nếu $\sum \ne \text{amount}$ $\rightarrow$ Chặn đứng và bắn lỗi `AppException(ErrorCode.SPLIT_AMOUNT_MISMATCH)`.
     - Lưu từng số tiền cụ thể vào bảng `expense_splits`.
  3. `ExpenseRepository.java` & `ExpenseSplitRepository.java`: Thực thi lưu DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `expenses` (INSERT), `expense_splits` (BATCH INSERT).
  - **Câu lệnh SQL thực thi**: Lưu các dòng split với đúng số tiền người dùng đã gõ trong 1 Transaction.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 201 Created`.
  - *Xử lý tại Client*: Ghi nhận hóa đơn vào danh sách nhóm.

---

### 🔹 Luồng 7.5: Xóa thành viên & Rời khỏi nhóm an toàn (Zero-Debt Balance Protection)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Chủ nhóm bấm icon thùng rác 🗑️ cạnh một thành viên hoặc Thành viên tự bấm *"Rời nhóm"* 🚪 bên cạnh tên mình trên `GroupDetailScreen.tsx`.
  - *Xử lý tại Client*: Mở Dialog xác nhận, gọi `groupService.removeMember()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `DELETE /api/groups/{groupId}/members/{memberId}`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `GroupController.java`: Tiếp nhận request.
  2. `GroupService.java` (`@Transactional`):
     - **Phân quyền chặt chẽ**: Chỉ Chủ nhóm mới được xóa người khác (`NOT_GROUP_MEMBER`); Thành viên chỉ được rời nhóm của chính mình; Chủ nhóm không được tự rời nếu chưa chuyển quyền (`OWNER_CANNOT_LEAVE`).
     - **Quy tắc Kiểm tra Tất toán Công nợ (Zero-Debt Balance Rule - Chống quỵt nợ)**: Gọi `DebtService.calculateGroupDebts(groupId, requesterId)`. Lấy số dư nợ ròng (`net balance`) của thành viên đó trong nhóm.
     - Nếu `balance != 0` (đang nợ tiền người khác hoặc đang được người khác nợ tiền) $\rightarrow$ Ngăn chặn tuyệt đối và bắn lỗi `AppException(ErrorCode.DEBT_NOT_SETTLED)` (*"Không thể xóa hoặc rời nhóm khi chưa tất toán công nợ!"*).
     - Nếu `balance == 0` (đã sòng phẳng 100%) $\rightarrow$ Thực hiện xóa khỏi bảng `group_members`.
     - Gửi thông báo Push/Realtime `GROUP_MEMBER_REMOVED` cho thành viên bị xóa.
  3. `GroupMemberRepository.java`: Xóa bản ghi thành viên.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `group_members` (SELECT, DELETE), `expense_splits` (SELECT check nợ), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT * FROM group_members WHERE group_id = 'g-uuid-1' AND user_id = 'u-uuid-2';
    DELETE FROM group_members WHERE id = 'gm-2';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 204 No Content` (hoặc `HTTP 400 Bad Request` nếu còn nợ).
  - *Xử lý tại Client*: Xóa thành viên khỏi danh sách hoặc đưa người dùng quay lại màn hình danh sách nhóm.

---

### 🔹 Luồng 7.6: Phân quyền Xóa khoản chi & Quy trình Yêu cầu Chỉnh sửa (Revision Request Workflow)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: 
    - Thành viên B (không phải người trả tiền) mở chi tiết khoản chi, bấm *"Yêu cầu chỉnh sửa"*, nhập số tiền đề xuất (40.000đ) và lý do *"Mình không uống nước ngọt, tính lại giúp mình nhé"* trên `ExpenseDetailBottomSheet.tsx`.
    - Hoặc Người trả tiền A bấm nút *"Xóa"* khoản chi.
  - *Xử lý tại Client*: Với người không phải Payer $\rightarrow$ Ẩn hoàn toàn nút "Xóa", hiển thị form đề xuất chỉnh sửa; Với Payer $\rightarrow$ Hiển thị banner cảnh báo màu vàng kèm nút *"Áp dụng & Sửa"* và *"Từ chối"*.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: 
    - `POST /api/groups/{groupId}/expenses/{expenseId}/request-revision` (Đề xuất sửa).
    - `POST /api/groups/{groupId}/expenses/{expenseId}/reject-revision` (Từ chối đề xuất).
    - `DELETE /api/groups/{groupId}/expenses/{expenseId}` (Xóa khoản chi).
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "proposedTitle": "Ăn tối (không nước ngọt)",
      "proposedAmount": 80000,
      "note": "Mình không uống nước ngọt, tính lại giúp mình nhé"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `ExpenseController.java`: Tiếp nhận request.
  2. `ExpenseService.java` (`@Transactional`):
     - **Phân quyền Xóa**: Chỉ Payer hoặc Group Owner mới được xóa khoản chi; nếu thành viên khác gửi lệnh DELETE $\rightarrow$ Bắn lỗi `UNAUTHORIZED_EXPENSE_DELETION` (HTTP 403).
     - **Yêu cầu Chỉnh sửa**: Cập nhật `isPendingRevision = true`, lưu `proposedTitle`, `proposedAmount`, `revisionNote` và bắn thông báo `EXPENSE_REVISION_REQUESTED` đến Payer.
     - **Từ chối / Cập nhật**: Reset `isPendingRevision = false` khi Payer lưu cập nhật mới hoặc bấm từ chối.
  3. `ExpenseRepository.java` & `NotificationRepository.java`: Cập nhật DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `expenses` (SELECT, UPDATE, DELETE), `expense_splits` (DELETE), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE expenses 
    SET is_pending_revision = true, revision_requester_id = 'u-uuid-2', revision_note = 'Mình không uống nước ngọt...', proposed_title = 'Ăn tối...', proposed_amount = 80000 
    WHERE id = 'exp-1';
    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) 
    VALUES ('notif-1', 'u-uuid-1', 'Yêu cầu sửa khoản chi', 'Thành viên B yêu cầu sửa khoản Ăn tối', 'EXPENSE_REVISION_REQUESTED', false, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Hiển thị badge ⚠️ *"Chờ sửa"* trên thẻ khoản chi trong danh sách nhóm.

---

## 8. PHÂN HỆ THUẬT TOÁN GREEDY RÚT GỌN NỢ & QUYẾT TOÁN VIETQR (DEBT SETTLEMENT)

---

### 🔹 Luồng 8.1: Thuật toán Greedy Tối giản hóa Sổ nợ (Min-Cash-Flow Greedy Algorithm)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở tab *"Ai nợ ai"* trên `GroupDetailScreen.tsx`.
  - *Xử lý tại Client*: Gọi `groupService.getGroupDebts(groupId)`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/groups/{groupId}/debts`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `DebtController.java`: Tiếp nhận request.
  2. `DebtService.java` (Thuật toán Rút gọn dòng tiền Tham lam):
     - **Bài toán**: Trong nhóm có 10 người, nếu lưu giao dịch thô sẽ phát sinh $N \times (N - 1) = 90$ giao dịch chéo nhau gây rối loạn sổ sách.
     - **Mục tiêu**: Cắt giảm xuống tối đa $N - 1 = 9$ giao dịch thanh toán duy nhất ($O(N^2) \rightarrow O(N)$).
     - **Bước 1 - Ma trận Số dư ròng (Net Balance Matrix)**: Quét toàn bộ `expense_splits` chưa trả (`isSettled = false`) trong nhóm:
       - Người trả tiền hóa đơn: $\text{Balance} = \text{Balance} + \text{amount}$.
       - Người tham gia chịu nợ: $\text{Balance} = \text{Balance} - \text{amount}$.
     - **Bước 2 - Thuật toán Tham lam (Greedy Matching)**:
       - Tách thành 2 tập hợp: Danh sách con nợ `Debtors` ($\text{Balance} < 0$) và Danh sách chủ nợ `Creditors` ($\text{Balance} > 0$).
       - Lấy người nợ nhiều nhất (`maxDebtor`) trả cho người được nợ nhiều nhất (`maxCreditor`) một khoản `min(|maxDebtor|, maxCreditor)`.
       - Cập nhật lại số dư và lặp lại cho đến khi toàn bộ số dư của nhóm triệt tiêu về 0.
     - **Kiểm tra Khoản chi đang chờ sửa (`hasPendingRevision`)**: Nếu khoản nợ liên quan đến hóa đơn đang có tranh chấp/chờ sửa, gán cờ `hasPendingRevision = true` kèm `pendingRevisionMessage`.
  3. `ExpenseSplitRepository.java`: Lấy toàn bộ split chưa tất toán.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `expense_splits` (SELECT), `expenses` (SELECT JOIN).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT es.*, e.is_pending_revision 
    FROM expense_splits es 
    JOIN expenses e ON es.expense_id = e.id 
    WHERE e.group_id = 'g-uuid-1' AND es.is_settled = false;
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `DebtSummaryResponse`:
    ```json
    {
      "memberBalances": [...],
      "transactions": [
        { "from": "u-uuid-2", "to": "u-uuid-1", "amount": 33333, "hasPendingRevision": false }
      ]
    }
    ```
  - *Xử lý tại Client*: Render danh sách các khoản nợ rút gọn trực quan gồm 2 mục: *"Người khác nợ bạn"* và *"Bạn nợ người khác"*.

---

### 🔹 Luồng 8.2: Trả nợ 1-chạm & Mở App Ngân hàng (VietQR Deep Linking)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người nợ B bấm nút **"Trả nợ 📲"** bên cạnh khoản nợ A trên giao diện.
  - *Xử lý tại Client*:
    - **Kiểm tra Khoản chi chưa hoàn tất**: Nếu `debtItem.hasPendingRevision == true` $\rightarrow$ Chặn không mở thanh toán, hiện popup Alert: *"Khoản chi chưa hoàn tất: Khoản chi này đang có yêu cầu chỉnh sửa từ thành viên nhóm và chưa được chủ khoản chi xác nhận. Vui lòng đợi chủ khoản chi cập nhật trước khi thanh toán để tránh sai lệch số tiền!"*.
    - Nếu hợp lệ $\rightarrow$ Tạo chuỗi mã hóa chuẩn EMVCo QR Code Napas247 chứa Bank BIN, STK, Số tiền và Nội dung chuyển khoản chuẩn hóa (`SM_PAYMENT_xxx`).
    - Gọi cơ chế **App-to-App Deep Linking** (`Linking.openURL()`): Mở trực tiếp App ngân hàng trên máy (VCB, MB, TCB...) điền sẵn thông tin.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - Xử lý Deep Link Client hoặc gọi `POST /api/vietqr/generate`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  - `VietQrService.java`: Sinh chuỗi mã QR chuẩn Napas247.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: Không ghi DB ở bước sinh mã QR.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - Mở ứng dụng Mobile Banking để người dùng xác thực FaceID chuyển tiền.

---

### 🔹 Luồng 8.3: Báo đã chuyển tiền & Gửi thông báo cho Chủ nợ (Notify Payment)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Sau khi chuyển khoản thành công, người nợ B bấm *"Tôi đã chuyển tiền"*.
  - *Xử lý tại Client*: Gọi `groupService.notifyPayment()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/groups/{groupId}/debts/notify-payment`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "toUserId": "u-uuid-1",
      "amount": 33333
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `DebtController.java`: Tiếp nhận request.
  2. `DebtService.java`:
     - Lưu một bản ghi thanh toán vào bảng `payments` với trạng thái `"PENDING"`.
     - Gọi `NotificationService` bắn WebSocket STOMP real-time về máy của Chủ nợ A kèm Push Notification: `"{B} đã chuyển 33.333đ cho bạn, bấm để xác nhận"`.
  3. `PaymentRepository.java` & `NotificationRepository.java`: Lưu bản ghi.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `payments` (INSERT), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO payments (id, group_id, from_user_id, to_user_id, amount, status, created_at) 
    VALUES ('pay-uuid-1', 'g-uuid-1', 'u-uuid-2', 'u-uuid-1', 33333, 'PENDING', NOW());
    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) 
    VALUES ('notif-2', 'u-uuid-1', 'Thông báo chuyển tiền', 'Thành viên B đã báo chuyển tiền cho bạn', 'PAYMENT_PENDING', false, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Hiển thị tag *"⏳ Chờ duyệt"* trên máy người nợ B.

---

### 🔹 Luồng 8.4: Chủ nợ duyệt thanh toán & Thủ thuật Sổ cái (Virtual Settlement Expense)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Chủ nợ A nhận được tiền vào tài khoản và bấm nút *"Xác nhận đã nhận tiền"* trên popup thông báo.
  - *Xử lý tại Client*: Gọi `groupService.approveSettle()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/groups/{groupId}/debts/approve-settle`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "debtorId": "u-uuid-2",
      "amount": 33333
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `DebtController.java`: Tiếp nhận lệnh duyệt.
  2. `DebtService.java` (`@Transactional` ACID):
     - **Thủ thuật Kế toán Giao dịch Ảo (Virtual Settlement Expense)**: Để đóng khoản nợ giữa B và A mà không làm mất lịch sử các hóa đơn cũ, hệ thống tự động tạo một khoản chi đặc biệt mang category là `"SETTLEMENT"`:
       - Người trả tiền: B.
       - Người chịu chi phí: A (số tiền 33.333đ).
       - Đánh dấu `isSettled = true` cho dòng split này.
     - Cập nhật toàn bộ các `expense_splits` nợ cũ của B đối với A thành `isSettled = true`.
     - Cập nhật bảng `payments` thành `"COMPLETED"`.
     - Bắn thông báo cho B: `"Chủ nợ A đã xác nhận nhận tiền thành công"`.
  3. `ExpenseRepository.java`, `ExpenseSplitRepository.java`, `PaymentRepository.java`: Thực thi ghi DB.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `payments` (UPDATE), `expenses` (INSERT), `expense_splits` (INSERT, UPDATE), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    -- 1. Cập nhật trạng thái payment hoàn tất
    UPDATE payments SET status = 'COMPLETED', updated_at = NOW() 
    WHERE group_id = 'g-uuid-1' AND from_user_id = 'u-uuid-2' AND to_user_id = 'u-uuid-1' AND status = 'PENDING';

    -- 2. Tạo hóa đơn thanh toán ảo đóng sổ
    INSERT INTO expenses (id, group_id, paid_by, amount, title, category, created_at) 
    VALUES ('exp-settle-1', 'g-uuid-1', 'u-uuid-2', 33333, 'Thanh toán nợ cho A', 'SETTLEMENT', NOW());

    -- 3. Tạo split đối ứng đã tất toán
    INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) 
    VALUES ('es-settle-1', 'exp-settle-1', 'u-uuid-1', 33333, true);

    -- 4. Đánh dấu tất toán các khoản nợ cũ
    UPDATE expense_splits SET is_settled = true 
    WHERE user_id = 'u-uuid-2' AND expense_id IN (SELECT id FROM expenses WHERE group_id = 'g-uuid-1' AND paid_by = 'u-uuid-1');
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Sổ nợ của B đối với A được xóa sạch về 0đ.

---

## 9. PHÂN HỆ CỔNG THANH TOÁN TRỰC TUYẾN (VNPAY & PAYOS)

---

### 🔹 Luồng 9.1: Tạo liên kết thanh toán VNPay Sandbox (VNPay Gateway Integration)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng chọn phương thức thanh toán qua cổng VNPay trên giao diện.
  - *Xử lý tại Client*: Gọi `paymentService.createVNPayPayment()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/vnpay/create-payment`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "amount": 100000,
      "orderInfo": "Thanh toan no nhom ShareMoney"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `VNPayController.java`: Tiếp nhận request.
  2. `VNPayService.java`:
     - Xây dựng danh sách tham số chuẩn VNPay: `vnp_Version`, `vnp_Command`, `vnp_TmnCode`, `vnp_Amount`, `vnp_CurrCode`, `vnp_TxnRef`, `vnp_OrderInfo`, `vnp_ReturnUrl`.
     - Sắp xếp thứ tự bảng chữ cái các tham số (`Alphabetical Sorting`).
     - Tạo chuỗi băm bảo mật sử dụng thuật toán **HMAC SHA512** với khóa bí mật `vnp_HashSecret`.
     - Tạo bản ghi đơn hàng trong bảng `payment_orders` với trạng thái `"PENDING"`.
  3. `PaymentOrderRepository.java`: Lưu đơn hàng.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `payment_orders` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    INSERT INTO payment_orders (id, user_id, order_code, amount, order_type, status, payment_gateway, created_at) 
    VALUES ('po-uuid-1', 'u-uuid-1', 'VNP1725289900', 100000, 'DEBT', 'PENDING', 'VNPAY', NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `{ paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...", orderCode: "VNP1725289900" }`.
  - *Xử lý tại Client*: Mở `WebView` để người dùng nhập thông tin thẻ ngân hàng hoặc quét mã VNPAY-QR.

---

### 🔹 Luồng 9.2: Webhook PayOS đối soát tự động & Gạch nợ tức thì (PayOS Open Banking Webhook)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng quét mã VietQR PayOS chuyển khoản thành công $\rightarrow$ Máy chủ PayOS phát tín hiệu Webhook Callback về hệ thống ShareMoney.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful Webhook.
  - *API Endpoint*: `POST /api/payos/webhook` (Endpoint công khai có bảo vệ chữ ký).
  - *Request Body (Payload JSON)*:
    ```json
    {
      "code": "00",
      "desc": "success",
      "data": {
        "orderCode": 1725289900,
        "amount": 100000,
        "description": "SM_PAYMENT_1725289900",
        "reference": "FT2624798321",
        "transactionDateTime": "2026-09-03 07:45:00"
      },
      "signature": "a8fbc736..."
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `PayOSController.java`: Tiếp nhận Webhook.
  2. `PayOSService.java` (`@Transactional`):
     - **Xác thực Chữ ký điện tử (HMAC SHA256 Signature Verification)**: So khớp chữ ký `signature` nhận được với chuỗi hash tạo từ `data` và `checksumKey` của PayOS nhằm chống giả mạo dữ liệu.
     - Kiểm tra mã phản hồi: Nếu `code == "00"` (Thành công) $\rightarrow$ Tìm đơn hàng trong bảng `payment_orders`.
     - Gọi `DebtService.approveSettle()` tự động kích hoạt gạch nợ trên Sổ cái nhóm.
     - Bắn thông báo realtime qua WebSocket STOMP cho các bên liên quan.
  3. `PaymentOrderRepository.java`: Cập nhật trạng thái đơn hàng sang `"SUCCESS"`.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `payment_orders` (UPDATE), `payments` (UPDATE), `expenses` (INSERT), `expense_splits` (INSERT/UPDATE), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE payment_orders SET status = 'SUCCESS', updated_at = NOW() WHERE order_code = '1725289900';
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` (`{ "error": 0, "message": "Webhook processed successfully" }`).
  - *Xử lý tại Client*: Cập nhật trạng thái đã thanh toán ngay lập tức trên app.

---

## 10. PHÂN HỆ TRÍ TUỆ NHÂN TẠO AI GEMINI & ĐIỂM SỨC KHỎE TÀI CHÍNH (AI & HEALTH)

---

### 🔹 Luồng 10.1: Chatbot AI Cố vấn Tài chính & Kỹ thuật Context Injection
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở `AdvisorScreen.tsx`, gõ câu hỏi: *"Phân tích chi tiêu tuần này của tôi và cho lời khuyên tiết kiệm"*.
  - *Xử lý tại Client*: Bật thanh typing indicator khi AI đang suy nghĩ, gọi `aiService.chat()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/ai/chat`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
  - *Request Body (Payload JSON)*:
    ```json
    {
      "message": "Phân tích chi tiêu tuần này của tôi và cho lời khuyên tiết kiệm"
    }
    ```
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AiController.java`: Tiếp nhận câu hỏi.
  2. `AiAssistantService.java` (Kỹ thuật Bơm ngữ cảnh Context Injection):
     - Thu thập toàn bộ dữ liệu tài chính thực tế của user trong tháng từ Database: Tổng thu, Tổng chi, Số dư các ví, Danh mục vượt ngân sách, Tiến độ hũ tiết kiệm, Sổ nợ nhóm.
     - Đóng gói toàn bộ số liệu trên vào **System Prompt** ẩn để làm giàu ngữ cảnh (`Grounding Context`).
  3. `GeminiService.java`: Gửi System Prompt + Lịch sử hội thoại sang Google Cloud Gemini Flash API, nhận câu trả lời có cấu trúc kèm các gợi ý bấm nhanh (`suggestedChips`).
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT), `transactions` (SELECT), `budgets` (SELECT), `savings_goals` (SELECT), `expense_splits` (SELECT).
  - **Câu lệnh SQL thực thi**: Gom dữ liệu tổng hợp qua các câu `SELECT` từ nhiều bảng.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm:
    ```json
    {
      "reply": "Chào bạn, tuần này bạn đã chi 1.250.000đ cho Ăn uống (chiếm 65% ngân sách)... Lời khuyên là bạn nên giảm bớt các bữa ăn ngoài...",
      "intent": "EXPENSE_ANALYSIS",
      "suggestedChips": ["Xem ngân sách ăn uống", "Cách cắt giảm 20%"]
    }
    ```
  - *Xử lý tại Client*: Render bong bóng tin nhắn của AI và danh sách chip gợi ý bấm nhanh.

---

### 🔹 Luồng 10.2: Agent AI Tự động hóa - Lập kế hoạch tài chính (Function Calling & Intents)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng nhắn: *"Tháng này lương tôi 20 triệu, hãy chia ngân sách: Ăn uống 6tr, Tiền trọ 4tr, Tiết kiệm 4tr, Xăng xe 1tr"*.
  - *Xử lý tại Client*: Gửi tin nhắn sang API AI.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `POST /api/ai/chat` $\rightarrow$ `POST /api/budgets/batch`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `AiAssistantService.java`: AI phân tích ngữ nghĩa, nhận diện Intent `SETUP_FINANCIAL_PLAN` và bóc tách các thực thể JSON có cấu trúc.
  2. `AdvisorScreen.tsx` (Client): Nhận JSON intent, tự động render Card tương tác *"Xác nhận áp dụng kế hoạch ngân sách"* với nút bấm trực tiếp.
  3. `BudgetController.java`: Tiếp nhận lệnh xác nhận, thực thi lưu hàng loạt ngân sách vào DB chỉ với 1 chạm.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `budgets` (BATCH INSERT).
  - **Câu lệnh SQL thực thi**: Batch Insert vào bảng `budgets` trong 1 Transaction.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK`.
  - *Xử lý tại Client*: Toàn bộ ngân sách trong tháng được thiết lập tự động.

---

### 🔹 Luồng 10.3: Tính điểm Sức khỏe Tài chính 4 Trụ cột (Financial Health Score)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng mở màn hình Điểm sức khỏe trên `AdvisorScreen.tsx`.
  - *Xử lý tại Client*: Gọi `financialHealthService.getScore()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `GET /api/financial-health`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `FinancialHealthController.java`: Tiếp nhận request.
  2. `FinancialHealthService.java` (Giải thuật Chấm điểm 100 điểm theo 4 trụ cột):
     1. **Trụ cột 1: Tỷ lệ Tiết kiệm (Savings Ratio - 25 điểm)**: Tính $(\text{Thu} - \text{Chi}) / \text{Thu}$. Đạt $\ge 20\%$ được trọn 25 điểm.
     2. **Trụ cột 2: Kỷ luật Ngân sách (Budget Adherence - 25 điểm)**: Tỷ lệ các danh mục không bị Over-budget. Bị vượt 1 danh mục trừ 5 điểm.
     3. **Trụ cột 3: Tỷ lệ Nợ trên Thu nhập (Debt-to-Income DTI - 25 điểm)**: $\text{Tổng nợ} / \text{Thu nhập}$. DTI $< 30\%$ an toàn tối đa 25 điểm.
     4. **Trụ cột 4: Quỹ Khẩn cấp (Emergency Fund - 25 điểm)**: $\text{Số dư ví} / \text{Chi phí sống 1 tháng}$. Đủ sống $3 - 6$ tháng đạt 25 điểm.
     - Tổng hợp điểm số ($0 - 100$), phân loại mức độ: Xuất sắc (85-100), Tốt (70-84), Trung bình (50-69), Báo động (<50).
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `wallets` (SELECT), `transactions` (SELECT aggregate), `budgets` (SELECT), `expense_splits` (SELECT).
  - **Câu lệnh SQL thực thi**: Đọc và tính toán số liệu tổng hợp trong tháng.
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm:
    ```json
    {
      "totalScore": 82,
      "level": "GOOD",
      "breakdown": { "savingsScore": 22, "budgetScore": 20, "debtScore": 25, "emergencyScore": 15 },
      "recommendations": ["Nên tăng thêm 2 triệu vào Quỹ khẩn cấp để đạt điểm tuyệt đối."]
    }
    ```
  - *Xử lý tại Client*: Render đồng hồ đo điểm số Gauge Chart và biểu đồ radar 4 trụ cột.

---

## 11. PHÂN HỆ PHÁT HIỆN DỊ THƯỜNG Z-SCORE & THÔNG BÁO THỜI GIAN THỰC (NOTIFICATIONS)

---

### 🔹 Luồng 11.1: Trí tuệ Nhân tạo Nội sinh - Phát hiện Giao dịch Bất thường (Z-Score Anomaly Detection)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Ngay sau khi người dùng lưu một giao dịch `EXPENSE` thành công.
  - *Cấu trúc Kiến trúc Hướng Sự kiện (Event-Driven Architecture)*: `TransactionService` phát ra sự kiện `TransactionCreatedEvent` qua Spring `ApplicationEventPublisher`. Quá trình tính toán Z-Score chạy hoàn toàn **Bất đồng bộ (Asynchronous `@Async`) trên Background Thread Pool**, không làm chậm API chính.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - Kích hoạt qua Event Bus nội bộ của Spring Boot và truyền thông báo qua WebSocket STOMP kênh `/topic/notifications/{userId}`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `PfmEventListener.java`: Lắng nghe sự kiện `TransactionCreatedEvent`, chuyển giao cho Service AI nội sinh.
  2. `AnomalyDetectionService.java` (Giải thuật Z-Score Thống kê):
     - Tải về lịch sử 20 giao dịch gần nhất cùng danh mục của user.
     - Tính Giá trị Trung bình Mẫu: $\mu = \frac{1}{N} \sum X_i$.
     - Tính Phương sai và Độ lệch chuẩn Mẫu: $\sigma = \sqrt{\frac{1}{N-1} \sum (X_i - \mu)^2}$.
     - Tính Điểm chuẩn hóa Z-Score:
       $$Z = \frac{X - \mu}{\sigma}$$
     - **Ngưỡng Cảnh báo Anomaly Threshold**: Nếu $Z > 2.0$ (tức là số tiền của giao dịch này cao bất thường vượt ngoài 95.45% phân phối chuẩn lịch sử) $\rightarrow$ Tạo bản ghi Thông báo loại `"ANOMALY_EXPENSE"` vào bảng `notifications`.
  3. `NotificationService.java`: Bắn tín hiệu WebSocket STOMP về thiết bị và gửi Push Notification qua Expo Push Service.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `transactions` (SELECT LIMIT 20), `wallets` (SELECT subquery), `notifications` (INSERT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    SELECT amount FROM transactions 
    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = 'u-uuid-1') AND category_id = 'cat-uuid-an-uong' 
    ORDER BY transaction_date DESC LIMIT 20;

    INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) 
    VALUES ('notif-3', 'u-uuid-1', 'Cảnh báo chi tiêu bất thường', 'Giao dịch 5.000.000đ cho Ăn uống cao gấp 3.2 lần bình thường!', 'ANOMALY_EXPENSE', false, NOW());
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - Điện thoại rung nhẹ, hiển thị Banner cảnh báo đỏ thời gian thực ngay trên màn hình.

---

### 🔹 Luồng 11.2: Đánh dấu đã đọc & Cập nhật Quả chuông Thông báo (Unread Badge Count)
- **Bước 1: Sự kiện kích hoạt tại Giao diện (Client UI Event)**:
  - *Hành động của người dùng*: Người dùng chạm vào icon Quả chuông trên Header mở `NotificationBottomSheet.tsx` và bấm vào 1 thông báo hoặc bấm *"Đánh dấu tất cả đã đọc"*.
  - *Xử lý tại Client*: Gọi `notificationService.markAsRead()`.
- **Bước 2: API tiếp nhận và Giao thức truyền tải (Endpoint & HTTP Protocol)**:
  - *Giao thức*: HTTPS / RESTful API.
  - *API Endpoint*: `PATCH /api/notifications/{id}/read` hoặc `PATCH /api/notifications/read-all`.
  - *Header*: `Authorization: Bearer <JWT_Token>`.
- **Bước 3: Tiếp nhận và xử lý tại các File của Máy chủ (Backend Execution Pipeline)**:
  1. `NotificationController.java`: Tiếp nhận request.
  2. `NotificationService.java`: Cập nhật `is_read = true` cho thông báo, tính lại tổng số lượng thông báo chưa đọc (`unreadCount`).
  3. `NotificationRepository.java`: Thực thi UPDATE và COUNT.
- **Bước 4: Thao tác Cơ sở dữ liệu và Toàn vẹn dữ liệu (Database Execution & ACID)**:
  - **Bảng tác động**: `notifications` (UPDATE, SELECT COUNT).
  - **Câu lệnh SQL thực thi**:
    ```sql
    UPDATE notifications SET is_read = true WHERE id = 'notif-3' AND user_id = 'u-uuid-1';
    SELECT COUNT(*) FROM notifications WHERE user_id = 'u-uuid-1' AND is_read = false;
    ```
- **Bước 5: Dữ liệu phản hồi và cập nhật trạng thái ứng dụng (Response & UI State Transition)**:
  - *Phản hồi từ máy chủ*: `HTTP 200 OK` kèm `{ "unreadCount": 0 }`.
  - *Xử lý tại Client*: Cập nhật số đếm trên quả chuông Header về `0`, ẩn badge đỏ.

---

## 📊 BẢNG TỔNG KẾT MA TRẬN 30 FILE LÕI & VAI TRÒ HỆ THỐNG

| STT | Tên File | Phân lớp | Vai trò & Mục đích Nghiệp vụ Lõi |
| :--- | :--- | :--- | :--- |
| 1 | `AuthController.java` | Backend Controller | Tiếp nhận các Endpoint xác thực công khai: Đăng ký, Đăng nhập, Silent Refresh Token, Quên mật khẩu OTP. |
| 2 | `AuthService.java` | Backend Service | Xử lý logic băm mật khẩu BCrypt, chuẩn hóa email, khởi tạo ví Cold-start mặc định, quản lý phiên đăng nhập. |
| 3 | `JwtUtil.java` | Security Infrastructure | Sinh và ký số JWT Access Token (15 phút) bằng thuật toán HS256, trích xuất Claims định danh. |
| 4 | `RefreshTokenService.java` | Backend Service | Quản lý vòng đời Refresh Token (7 ngày), thực hiện cơ chế Token Rotation chống tấn công phát lại Replay Attack. |
| 5 | `OtpService.java` | Backend In-Memory Service | Sinh mã OTP ngẫu nhiên qua `SecureRandom`, quản lý bộ nhớ đệm RAM siêu tốc `ConcurrentHashMap`, giới hạn TTL 5 phút và 5 lần thử. |
| 6 | `EmailService.java` | External Mail Service | Render template HTML chuyên nghiệp và truyền thư qua giao thức SMTP `JavaMailSender` đến Gmail người dùng. |
| 7 | `UserController.java` | Backend Controller | Tiếp nhận các Endpoint quản lý hồ sơ người dùng, cập nhật tài khoản ngân hàng, đăng ký Push Token. |
| 8 | `UserService.java` | Backend Service | Chuẩn hóa thông tin định danh, chuyển đổi tên chủ tài khoản sang IN HOA KHÔNG DẤU để in mã VietQR. |
| 9 | `BankLookupService.java` | External Gateway Service | Tích hợp cổng Napas247 tra cứu tên chủ tài khoản và cung cấp cơ chế Mock Fallback 5ms cho môi trường phát triển. |
| 10 | `WalletController.java` | Backend Controller | Tiếp nhận các thao tác CRUD ví tài chính, chuyển tiền nội bộ, tính tổng tài sản ròng. |
| 11 | `WalletService.java` | Backend Service | Quản lý phân loại ví Tài sản / Nợ thẻ tín dụng, thực thi Khóa bi quan `Pessimistic Lock`, bảo vệ toàn vẹn lịch sử ví. |
| 12 | `TransactionController.java` | Backend Controller | Tiếp nhận các Endpoint thu chi cá nhân, lọc đa tiêu chí, chia nhỏ hóa đơn. |
| 13 | `TransactionService.java` | Backend Service | Quản lý giao dịch thu chi, thuật toán Hoàn tác số dư (Balance Revert), tự động tạo Payee/Tags, bắn sự kiện bất đồng bộ. |
| 14 | `BudgetController.java` | Backend Controller | Tiếp nhận các Endpoint thiết lập hạn mức ngân sách và lịch hóa đơn định kỳ. |
| 15 | `BudgetService.java` | Backend Service | Thuật toán Tính ngân sách Không hồi tố (`Non-Retroactive`), phân loại 3 dải cảnh báo OK/WARNING/OVER, tính Số dư khả dụng thực tế 100%. |
| 16 | `SavingsGoalController.java` | Backend Controller | Tiếp nhận các Endpoint tạo mục tiêu tiết kiệm, nạp/rút tiền heo đất, kích hoạt phân bổ tự động. |
| 17 | `SavingsGoalService.java` | Backend Service | Thuật toán Tham lam Phân bổ Tiết kiệm Tự động (`Greedy Priority Auto-Allocate`) theo mức ưu tiên và hạn chót. |
| 18 | `GroupController.java` | Backend Controller | Tiếp nhận Endpoint tạo nhóm, quét QR vào nhóm, thêm thành viên, xóa/rời nhóm an toàn. |
| 19 | `GroupService.java` | Backend Service | Quản lý thành viên nhóm, phân quyền Chủ nhóm/Thành viên, kiểm định quy tắc An toàn Công nợ (`Zero-Debt Protection`). |
| 20 | `ExpenseController.java` | Backend Controller | Tiếp nhận hóa đơn nhóm, hỗ trợ chia đều và chia tùy chỉnh từng người. |
| 21 | `ExpenseService.java` | Backend Service | Thuật toán Bù Lẻ Remainder Engine chống thất thoát tiền, phân quyền xóa và quy trình yêu cầu chỉnh sửa (Revision Request). |
| 22 | `DebtController.java` | Backend Controller | Tiếp nhận yêu cầu tính toán nợ nhóm, nhắc nợ, báo thanh toán và duyệt gạch nợ. |
| 23 | `DebtService.java` | Backend Service | **Thuật toán Tham lam Rút gọn Dòng tiền (`Min-Cash-Flow Greedy Algorithm`)** $O(N^2) \rightarrow O(N)$, khóa thanh toán khi đang tranh chấp và thủ thuật Kế toán Giao dịch Ảo (`Virtual Settlement Expense`). |
| 24 | `VietQrService.java` | Payment Helper | Sinh chuỗi mã hóa QR Code chuẩn EMVCo Napas247 phục vụ trả nợ 1-chạm và chuyển tiền tự động. |
| 25 | `VNPayService.java` | Payment Gateway Service | Tạo liên kết thanh toán VNPay Sandbox, ký số bảo mật HMAC SHA512 theo mã bí mật `vnp_HashSecret`. |
| 26 | `PayOSService.java` | Open Banking Service | Tiếp nhận Webhook Open Banking PayOS, xác thực chữ ký HMAC SHA256 và tự động gạch nợ tức thì. |
| 27 | `AiAssistantService.java` | AI Agent Service | Kỹ thuật Bơm ngữ cảnh (`Context Injection`), trích xuất Ý định (`Intent Extraction`) và Function Calling tự động hóa lập kế hoạch tài chính. |
| 28 | `GeminiService.java` | Cloud AI Infrastructure | Tích hợp Google Cloud Gemini Flash API, quản lý hội thoại và xử lý câu trả lời thông minh. |
| 29 | `FinancialHealthService.java` | Expert System Service | Thuật toán Chấm điểm Sức khỏe Tài chính toàn diện 100 điểm chia đều 4 trụ cột (Tiết kiệm, Ngân sách, Nợ, Quỹ khẩn cấp). |
| 30 | `AnomalyDetectionService.java` | Statistical AI Service | Thuật toán Thống kê Z-Score phát hiện chi tiêu bất thường bất đồng bộ trên Background Thread. |

---

## 🗄️ BẢNG TỔNG HỢP MA TRẬN 16 BẢNG DATABASE & Ý NGHĨA THỰC THỂ (DATABASE SCHEMA & IMPACT MATRIX)

| STT | Tên Bảng (Table Name) | Khóa Chính / Khóa Ngoại | Mục Đích Lưu Trữ & Thực Thể Nghiệp Vụ | Các Luồng Tác Động (C/R/U/D/Lock) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `users` | **PK**: `id`<br>**Unique**: `email` | Lưu trữ hồ sơ định danh người dùng, mật khẩu băm BCrypt, STK Napas247 VietQR chính, STK hũ tiết kiệm, Push Token Expo. | **Luồng 1.1, 1.2, 1.4, 1.5** (Đăng ký/Đăng nhập/Đổi pass)<br>**Luồng 2.1, 2.2, 2.4** (Xem/Sửa profile/Push token)<br>**Luồng 10.1, 10.3** (AI Context & Health) |
| 2 | `refresh_tokens` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Quản lý phiên đăng nhập dài hạn (7 ngày), hỗ trợ cơ chế Token Rotation và thu hồi Token (`revoked = true`) khi đăng xuất. | **Luồng 1.1, 1.2, 1.3, 1.6** (Cấp phát, Làm mới Token, Đăng xuất) |
| 3 | `wallets` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Lưu trữ các ví tài chính cá nhân (Tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng `is_liability`), số dư biến động thời gian thực. | **Luồng 1.1** (Tạo ví mặc định cold-start)<br>**Luồng 3.1 - 3.4** (CRUD ví, Chuyển tiền, Tính tài sản ròng)<br>**Luồng 4.1 - 4.3** (Lock số dư, Trừ tiền, Hoàn tiền)<br>**Luồng 6.2, 6.3** (Nạp/Rút hũ tiết kiệm) |
| 4 | `categories` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Danh mục phân loại thu/chi hệ thống và người dùng tự định nghĩa (Ăn uống, Mua sắm, Lương...), icon và màu sắc nhận diện. | **Luồng 4.1, 4.4** (Gắn danh mục giao dịch cá nhân)<br>**Luồng 5.1, 5.2** (Thiết lập ngân sách theo danh mục) |
| 5 | `payees` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Lưu trữ thông tin đối tác/quán ăn/người thụ hưởng (ví dụ: "Phở Bò Gia Truyền"), tự động tạo khi người dùng nhập giao dịch. | **Luồng 4.1** (Tự động tạo Payee khi thêm giao dịch) |
| 6 | `transactions` | **PK**: `id`<br>**FK**: `wallet_id` $\rightarrow$ `wallets(id)`<br>**FK**: `category_id` $\rightarrow$ `categories(id)` | Nhật ký giao dịch thu chi cá nhân, số tiền, ngày giao dịch, địa điểm, ghi chú, liên kết hóa đơn nhóm nếu có. | **Luồng 3.3** (Giao dịch chuyển tiền nội bộ)<br>**Luồng 4.1 - 4.4** (Thêm, Sửa, Xóa, Tách giao dịch)<br>**Luồng 5.2, 5.3** (Tính ngân sách & Safe-to-Spend)<br>**Luồng 6.2, 6.3** (Nạp/Rút tiền tiết kiệm)<br>**Luồng 11.1** (Phát hiện dị thường Z-Score) |
| 7 | `transaction_splits` | **PK**: `id`<br>**FK**: `transaction_id` $\rightarrow$ `transactions(id)` | Lưu chi tiết các phần chia nhỏ danh mục của 1 giao dịch mẹ (ví dụ: Hóa đơn 500k chia 300k ăn uống, 200k gia dụng). | **Luồng 4.4** (Chia nhỏ giao dịch đa danh mục) |
| 8 | `budgets` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)`<br>**FK**: `category_id` $\rightarrow$ `categories(id)` | Hạn mức ngân sách tháng, loại ngân sách (`FLEXIBLE`, `MANDATORY`, `BILL`), trạng thái lặp lại và ngày đến hạn hóa đơn. | **Luồng 5.1 - 5.3** (Thiết lập, Kiểm tra tiến độ ngân sách, Tính số dư an toàn)<br>**Luồng 10.2** (AI Batch Create Budget) |
| 9 | `savings_goals` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Mục tiêu hũ tiết kiệm heo đất, số tiền mục tiêu, số tiền tích lũy hiện tại, hạn chót hoàn thành, độ ưu tiên (`HIGH`/`MED`/`LOW`). | **Luồng 6.1 - 6.4** (Tạo hũ, Nạp tiền, Rút tiền, Thuật toán Phân bổ tự động Greedy Water-filling) |
| 10 | `"groups"` | **PK**: `id`<br>**FK**: `owner_id` $\rightarrow$ `users(id)` | Thông tin nhóm chi tiêu chung, chủ nhóm, ảnh đại diện vector, mô tả chuyến đi hoặc hội bạn thân. | **Luồng 7.1** (Tạo nhóm mới)<br>**Luồng 7.2** (Quét mã QR gia nhập nhóm) |
| 11 | `group_members` | **PK**: `id`<br>**FK**: `group_id` $\rightarrow$ `groups(id)`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Quan hệ thành viên tham gia nhóm, vai trò (`owner`/`member`), thời điểm gia nhập. | **Luồng 7.1, 7.2** (Thêm thành viên, Quét QR)<br>**Luồng 7.5** (Xóa thành viên & Rời nhóm có kiểm tra công nợ) |
| 12 | `expenses` | **PK**: `id`<br>**FK**: `group_id` $\rightarrow$ `groups(id)`<br>**FK**: `paid_by` $\rightarrow$ `users(id)` | Hóa đơn chi tiêu nhóm, người đứng ra thanh toán, số tiền, trạng thái yêu cầu chỉnh sửa (`is_pending_revision`, `revision_note`, `proposed_amount`). | **Luồng 7.3, 7.4** (Tạo hóa đơn chia đều / chia tùy chỉnh)<br>**Luồng 7.6** (Phân quyền Xóa, Yêu cầu Chỉnh sửa)<br>**Luồng 8.4** (Tạo Virtual Settlement Expense) |
| 13 | `expense_splits` | **PK**: `id`<br>**FK**: `expense_id` $\rightarrow$ `expenses(id)`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Chi tiết số tiền từng thành viên trong nhóm phải gánh trên mỗi hóa đơn, trạng thái đã thanh toán (`is_settled`). | **Luồng 7.3, 7.4** (Tạo các phần chia tiền)<br>**Luồng 8.1** (Thuật toán Greedy quét split tính nợ)<br>**Luồng 8.4** (Đánh dấu `is_settled = true` khi tất toán) |
| 14 | `payments` | **PK**: `id`<br>**FK**: `group_id` $\rightarrow$ `groups(id)`<br>**FK**: `from_user_id` $\rightarrow$ `users(id)`<br>**FK**: `to_user_id` $\rightarrow$ `users(id)` | Nhật ký yêu cầu thanh toán chuyển khoản giữa các thành viên nhóm, trạng thái (`PENDING` / `COMPLETED`). | **Luồng 8.3** (Báo đã chuyển tiền)<br>**Luồng 8.4** (Chủ nợ xác nhận nhận tiền) |
| 15 | `payment_orders` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Đơn hàng thanh toán trực tuyến qua các cổng VNPay / PayOS, mã đối soát `order_code`, trạng thái (`PENDING` / `SUCCESS`). | **Luồng 9.1** (Tạo URL thanh toán VNPay)<br>**Luồng 9.2** (PayOS Webhook đối soát gạch nợ) |
| 16 | `notifications` | **PK**: `id`<br>**FK**: `user_id` $\rightarrow$ `users(id)` | Hộp thư thông báo trong ứng dụng: Nhắc nợ, Cảnh báo dị thường Z-Score, Yêu cầu sửa hóa đơn, Mời vào nhóm, cờ `is_read`. | **Luồng 7.1, 7.5, 7.6, 8.3, 8.4, 9.2, 11.1** (Phát sinh thông báo)<br>**Luồng 11.2** (Đánh dấu đã đọc và đếm badge) |

---
*Tài liệu được biên soạn và chuẩn hóa toàn diện phục vụ Hội đồng Đánh giá Đồ án Tốt nghiệp ShareMoney.*
