# 📦 THƯ MỤC TỔNG HỢP TOÀN BỘ KIỂM THỬ (ALL_TESTS)

Thư mục này gom toàn bộ các file kiểm thử, công cụ và tài liệu kiểm thử của dự án **ShareMoney** vào 1 nơi duy nhất để bạn tiện tra cứu, kiểm tra và chuẩn bị báo cáo:

```text
ALL_TESTS/
├── 1_Backend_Unit_Tests/          <-- 21 File mã nguồn Java JUnit 5 & Mockito (168 tests)
│   ├── controller/
│   │   ├── AuthControllerTest.java
│   │   ├── UserControllerTest.java
│   │   └── VNPayControllerTest.java
│   ├── service/
│   │   ├── DebtServiceTest.java           (Thuật toán Greedy rút gọn nợ)
│   │   ├── ExpenseServiceTest.java        (Thuật toán chia tiền & bù lẻ)
│   │   ├── WalletServiceTest.java         (Ví tiền & Tính tổng tài sản ròng)
│   │   ├── AnomalyDetectionServiceTest.java (Phát hiện chi tiêu bất thường)
│   │   ├── BudgetServiceTest.java         (Hạn mức ngân sách)
│   │   ├── SavingsGoalServiceTest.java    (Mục tiêu tiết kiệm heo đất)
│   │   └── FinancialHealthServiceTest.java (Tính điểm sức khỏe tài chính)
│   └── exception/
│       └── GlobalExceptionHandlerTest.java (Bắt ngoại lệ toàn cục)
│
├── 2_Frontend_Unit_Tests/         <-- 5 File mã nguồn kiểm thử Mobile React Native (40 tests)
│   ├── authValidation.test.ts             (Kiểm tra Gmail & Mật khẩu 6 ký tự)
│   ├── bankNotificationParser.test.ts     (Bóc tách tin nhắn SMS ngân hàng)
│   ├── errorHandler.test.ts               (Xử lý lỗi mạng & hiển thị Toast)
│   ├── qrParser.test.ts                   (Giải mã VietQR & Link nhóm)
│   └── vietnamese.test.ts                 (Chuẩn hóa gõ tiếng Việt Telex)
│
├── 3_API_Integration_Postman/    <-- File kịch bản kiểm thử API tích hợp tự động
│   └── ShareMoney_Integration_Tests.postman_collection.json
│
├── 4_Performance_Load_JMeter/    <-- Kịch bản đo tải, độ trễ P95 & Throughput
│   ├── sharemoney_load_test.jmx           (Test Plan Apache JMeter)
│   └── quick_load_test.js                 (Script Node.js Benchmark nhanh)
│
└── 5_Bao_Cao_Doc/                 <-- Tài liệu báo cáo ma trận kiểm thử chi tiết
    └── BAO_CAO_KIEM_THU_CHI_TIET_168_TEST_CASES.md
```

---

## 🚀 CÁC LỆNH CHẠY NHANH:

1. **Chạy Unit Test Backend (168 tests)**:
   ```powershell
   .\mvnw.cmd test
   ```

2. **Chạy Unit Test Frontend (40 tests)**:
   ```powershell
   cd FrontendReact
   npm test
   ```

3. **Chạy Đo Hiệu Năng Tải (Benchmark P95 & Throughput)**:
   ```powershell
   node scripts/quick_load_test.js
   ```
