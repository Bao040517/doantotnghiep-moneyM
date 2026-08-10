# Kế Hoạch Triển Khai (Deployment Plan) - ShareMoney 🚀

Dự án ShareMoney của bạn là một hệ thống Full-stack, bao gồm 2 thành phần chính:
1. **Backend (Spring Boot)** + **Cơ sở dữ liệu (PostgreSQL)**
2. **Frontend Mobile (React Native / Expo)**

Dưới đây là kế hoạch triển khai tối ưu nhất, cân bằng giữa **Chi phí (Free/Rẻ nhất)**, **Độ ổn định**, và **Dễ cấu hình**.

---

## 1. Cơ sở dữ liệu (Database) - PostgreSQL
Nơi lưu trữ dữ liệu chính yếu của toàn bộ hệ thống.

- **Đề xuất:** **Supabase** hoặc **Neon.tech**
- **Lý do:** Cả hai đều cung cấp gói Free Tier PostgreSQL cực kỳ hào phóng, không tự động sleep, uptime cao, quản lý qua giao diện Web rất trực quan.
- **Cách làm:** Đăng ký tài khoản, tạo Project mới, lấy chuỗi kết nối (Connection String) thay thế cho `spring.datasource.url` ở Backend.

## 2. Backend (Spring Boot 17)
Xử lý logic, API, WebSocket và thanh toán VNPay.

- **Đề xuất:** **Railway.app** hoặc **Render.com** (Dùng Docker)
- **Lý do:** Bạn đã có sẵn `Dockerfile`. Cả Railway và Render đều tự động nhận diện Dockerfile và build thành Container chạy luôn. Render có gói Free (sleep sau 15p không có request), Railway có gói 5$/tháng rất mạnh mẽ (không sleep).
- **Cấu hình môi trường (Environment Variables):**
  - `DB_URL`, `DB_USER`, `DB_PASSWORD`: Lấy từ Supabase/Neon.
  - `vnpay.tmnCode`, `vnpay.hashSecret`: Cấu hình lấy từ tài khoản VNPay Sandbox của bạn.

## 3. Frontend Mobile (React Native - Expo)
Ứng dụng cài trên điện thoại người dùng.

- **Đề xuất:** **Expo Application Services (EAS)**
- **Lý do:** EAS là dịch vụ build app đám mây xịn nhất cho React Native hiện nay. Bạn không cần máy Mac vẫn build được app iOS.
- **Cách làm:**
  - Cài đặt `eas-cli`.
  - Đổi Base URL trong mã nguồn React Native thành domain của Backend.
  - Chạy lệnh `eas build -p android --profile preview` để lấy file **.apk** cài đặt thử nghiệm trên máy Android.
  - Chạy lệnh `eas build -p ios` để đẩy app lên TestFlight (yêu cầu tài khoản Apple Developer).
  - **Cấu hình Deep Link:** Config Scheme trong `app.json` (ví dụ `"scheme": "sharemoney"`) để nhận callback từ VNPay sau khi deploy.

---

## 🚦 Thứ tự thực hiện triển khai (Roadmap)
Để tránh lỗi, bạn nên deploy theo trình tự sau:

1. **Bước 1:** Khởi tạo DB trên Supabase/Neon và lấy chuỗi kết nối.
2. **Bước 2:** Deploy Backend lên Render/Railway (cấu hình biến môi trường gọi tới DB).
3. **Bước 3:** Lấy URL của Backend (ví dụ `https://sharemoney-backend.up.railway.app`), đổi cấu hình kết nối API của React Native sang URL Backend mới. Tiến hành build file APK bằng EAS.
