# Cẩm Nang Triển Khai Trực Tuyến (Production Deployment Guide) - ShareMoney 🚀

Tài liệu này hướng dẫn chi tiết từng bước để đưa hệ thống **ShareMoney (Backend Spring Boot + Database PostgreSQL + Mobile React Native App)** lên môi trường trực tuyến (Online Internet) để chấm đồ án, demo bảo vệ hoặc phát hành cho người dùng thực tế.

---

## 🧭 Tổng Quan Kiến Trúc Khi Online

```mermaid
graph LR
    subgraph Client
        Mobile[📱 App Android / iOS<br/>React Native Expo]
    end

    subgraph Internet
        HTTPS[🔒 Cloudflare / Render HTTPS]
    end

    subgraph Cloud Server
        Backend[☕ Spring Boot Backend<br/>Port 8080 / Docker]
    end

    subgraph Managed Database
        DB[(🐘 PostgreSQL Cloud<br/>Supabase / Neon)]
    end

    subgraph 3rd Payment Gateway
        PayOS[⚡ PayOS Open Banking]
        VNPay[💳 VNPay Sandbox]
    end

    Mobile -->|API / WebSocket| HTTPS
    HTTPS --> Backend
    Backend --> DB
    Backend <-->|Webhook / IPN| PayOS
    Backend <-->|Webhook / IPN| VNPay
```

---

## 🌟 LỰA CHỌN 1: Triển Khai Cloud Miễn Phí 100% (Khuyên Dùng Nhất)
> **Ưu điểm:** Miễn phí hoàn toàn, có sẵn HTTPS chuẩn quốc tế (bắt buộc cho Webhook PayOS/VNPay), không cần cấu hình Linux phức tạp.

### Bước 1: Khởi tạo Database PostgreSQL trên Supabase (hoặc Neon.tech)
1. Truy cập [https://supabase.com](https://supabase.com) (hoặc [neon.tech](https://neon.tech)) $\rightarrow$ Đăng nhập bằng GitHub.
2. Tạo Project mới (Ví dụ: `sharemoney-db`, mật khẩu DB tự chọn).
3. Sau khi tạo xong, vào mục **Project Settings** $\rightarrow$ **Database** $\rightarrow$ Tìm mục **Connection String (URI)**.
   - Định dạng: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
   - Chuyển sang JDBC format: `jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`
4. **Nạp dữ liệu mẫu 24 tháng:**
   - Vào mục **SQL Editor** trên thanh menu Supabase.
   - Mở file [seed_v11.sql](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/seed_v11.sql), sao chép toàn bộ nội dung và dán vào SQL Editor $\rightarrow$ Bấm **Run**.
   - Toàn bộ 18 bảng DB và hàng nghìn bản ghi mẫu của 5 personas sẽ được khởi tạo hoàn hảo!

---

### Bước 2: Deploy Backend Spring Boot lên Render.com
1. Đẩy mã nguồn dự án lên GitHub cá nhân (Private hoặc Public repo).
2. Truy cập [https://render.com](https://render.com) $\rightarrow$ Đăng nhập bằng GitHub.
3. Bấm **New +** $\rightarrow$ Chọn **Web Service**.
4. Chọn repository `sharemoney` của bạn.
5. **Cấu hình Web Service:**
   - **Name:** `sharemoney-backend`
   - **Region:** `Singapore` (độ trễ thấp nhất về Việt Nam)
   - **Environment:** `Docker` (Render sẽ tự động dùng file [Dockerfile](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Dockerfile) có sẵn trong dự án)
   - **Instance Type:** `Free`
6. **Kéo xuống mục Environment Variables (Biến môi trường) và điền:**
   - `DB_URL`: `jdbc:postgresql://[HOST]:[PORT]/postgres?sslmode=require` (từ Bước 1)
   - `DB_USER`: `postgres.[PROJECT-REF]` (hoặc `postgres`)
   - `DB_PASSWORD`: `[Mật_khẩu_DB_Supabase]`
   - `JWT_SECRET`: `9a4f2c8d3b7a1e6f45c8a0b3f267d8b1d4e6f3c8a9d2b5f8e3a9c8b5f6v8a3d9`
   - `GEMINI_API_KEY`: `[API_Key_Google_AI_Studio_của_bạn]` (nếu có)
   - `PAYOS_CLIENT_ID`: `f0eb6860-35ac-443b-abe4-420c5bf8914e`
   - `PAYOS_API_KEY`: `692788be-837f-4ad0-9026-5e5acd25e85b`
   - `PAYOS_CHECKSUM_KEY`: `e003b853f0539e62a405c40711a39f0c8f47c70f1da499cbb97e7342409649ca`
   - `VIETQR_CLIENT_ID`: Client ID của VietQR Open API để tra cứu STK
   - `VIETQR_API_KEY`: API Key của VietQR Open API để tra cứu STK
   - `VIETQR_LOOKUP_MOCK_ENABLED`: `false` (chỉ bật `true` khi chạy dữ liệu demo)
7. Bấm **Create Web Service**. Đợi 2-3 phút, Render sẽ build Docker image và cấp cho bạn 1 đường link HTTPS public (Ví dụ: `https://sharemoney-backend.onrender.com`).

---

### Bước 3: Đóng Gói Ứng Dụng Mobile APK (EAS Build)

1. Mở file [FrontendReact/eas.json](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/FrontendReact/eas.json) vừa được tạo:
   - Điền URL backend Render vào trường `EXPO_PUBLIC_API_URL`:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "https://sharemoney-backend.onrender.com/api"
   }
   ```
2. Mở terminal tại thư mục `FrontendReact`:
   ```bash
   # Cài đặt EAS CLI nếu chưa có
   npm install -g eas-cli

   # Đăng nhập tài khoản Expo (đăng ký miễn phí tại expo.dev)
   eas login

   # Khởi tạo dự án EAS
   eas project:init

   # Build file APK Android độc lập (không cần cắm máy tính, EAS Build trên cloud)
   eas build -p android --profile preview
   ```
3. Sau khi build xong (~5-10 phút), Expo sẽ trả về mã QR và đường link tải trực tiếp file **`.apk`**. Bạn chỉ cần gửi link này cho bạn bè hoặc thầy cô quét tải về cài lên điện thoại là có thể dùng trực tuyến mọi lúc mọi nơi!

---

## ⚡ LỰA CHỌN 2: Demo Nhanh Trực Tuyến Từ Máy Tính Bằng Ngrok / Cloudflare Tunnel
> **Phù hợp nhất khi:** Bạn muốn giữ Backend chạy ở máy tính local nhưng muốn tạo link HTTPS công khai ra ngoài Internet ngay lập tức trong 1 phút để test từ xa hoặc demo báo cáo.

1. Tải và cài đặt **Ngrok** ([ngrok.com](https://ngrok.com)) hoặc **Cloudflare Tunnel** (`cloudflared`).
2. Mở terminal và chạy lệnh:
   ```bash
   ngrok http 8080
   ```
3. Ngrok sẽ cấp cho bạn một domain HTTPS chuyển tiếp:
   `Forwarding: https://abc-xyz.ngrok-free.app -> http://localhost:8080`
4. Vào [FrontendReact/eas.json](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/FrontendReact/eas.json) hoặc tạo file `FrontendReact/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://abc-xyz.ngrok-free.app/api
   ```
5. Chạy `npx expo start` hoặc build APK. Mọi request trên điện thoại sẽ được chuyển thẳng về Backend Spring Boot đang chạy trên máy tính của bạn!

---

## 🖥️ LỰA CHỌN 3: Triển Khai Lên Máy Chủ VPS Riêng (Ubuntu / Docker Compose)

Nếu bạn thuê VPS (Ubuntu 20.04 / 22.04) tại Vietnix, BKNS, DigitalOcean, Linode hay AWS EC2:

1. **Cài đặt Docker & Docker Compose trên VPS:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   ```
2. **Clone source code lên VPS:**
   ```bash
   git clone https://github.com/your-username/sharemoney.git
   cd sharemoney
   ```
3. **Khởi chạy toàn bộ hệ thống bằng 1 lệnh:**
   ```bash
   docker compose up -d --build
   ```
4. **Cài đặt Nginx & Kích hoạt SSL Miễn phí (Certbot):**
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```
   Proxy ngược cổng `8080` về domain `api.yourdomain.com` trong file cấu hình Nginx.

---

## 📋 Bảng Kiểm Tra Sẵn Sàng (Pre-Deployment Checklist)

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| **Java 17 & Maven Package** | ✅ Sẵn sàng | `mvn clean package` chạy `BUILD SUCCESS` |
| **Dockerfile tối ưu** | ✅ Sẵn sàng | Multi-stage build Eclipse Temurin 17 Alpine siêu nhẹ (~150MB) |
| **Database Seed Script** | ✅ Sẵn sàng | [seed_v11.sql](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/seed_v11.sql) chứa 24 tháng dữ liệu đầy đủ 18 bảng |
| **Bảo mật Dual Token** | ✅ Sẵn sàng | Access Token 15 phút + Refresh Token Rotation 7 ngày |
| **Cổng thanh toán PayOS & VNPay** | ✅ Sẵn sàng | Webhook IPN xử lý tức thì, Deep link 1-chạm Napas247 |
| **Cấu hình EAS Build Mobile** | ✅ Sẵn sàng | [eas.json](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/FrontendReact/eas.json) hỗ trợ build file APK độc lập |

