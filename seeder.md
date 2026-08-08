# Quy Trình Sinh Dữ Liệu Mẫu (Database Seeder)

Tài liệu này mô tả quy trình chuẩn mực, tự động và khép kín để sinh dữ liệu mẫu (seed data) cho dự án ShareMoney. Quy trình này đảm bảo dữ liệu sinh ra **luôn đồng bộ 100% với cấu trúc Entity của Spring Boot (Java)** và cung cấp một khối lượng dữ liệu khổng lồ, phong phú để phục vụ cho việc kiểm thử UI/UX, demo ứng dụng và phân tích hiệu năng.

---

## 1. Mục Đích (Purpose)

*   **Đồng bộ tuyệt đối:** Loại bỏ hoàn toàn lỗi "column does not exist" hay vi phạm ràng buộc `NOT NULL` do Schema DB và Entity bị lệch pha.
*   **Dữ liệu đa dạng & quy mô lớn:** Sinh ra tối thiểu **5 đến 6 tháng** dữ liệu tiêu dùng liên tục cho mọi user, phủ kín mọi edge-case (chia tiền nhóm, vay nợ, tiết kiệm, vượt ngân sách).
*   **Tự động hóa:** Giảm thiểu thao tác thủ công, chỉ cần chạy 1 command là có file SQL chuẩn xác.

---

## 2. Quy Trình 4 Bước Chuẩn (Standard Operating Procedure)

> [!IMPORTANT]
> Đây là quy trình bắt buộc mỗi khi có sự thay đổi về cấu trúc Entity (thêm/sửa/xoá cột) trong `src/main/java/com/example/sharemoney/entity`.

### Bước 1: Khảo sát & Phân tích Entity (Entity Parsing)
Trước khi viết bất kỳ câu lệnh `INSERT` nào, hệ thống phải tự động đọc và phân tích mã nguồn Java để trích xuất Schema thực tế.
*   **Công cụ:** Sử dụng một script parser (ví dụ: `check_entities.js`) đọc trực tiếp các file `.java`.
*   **Mục tiêu trích xuất:**
    *   Tên bảng từ `@Table(name = "...")`.
    *   Tên cột từ `@Column(name = "...")` hoặc `@JoinColumn(name = "...")`. Nếu không khai báo tường minh, tự động convert từ CamelCase sang snake_case của biến `private`.
    *   Ràng buộc bắt buộc từ `nullable = false`.
*   **Kết quả:** Một bản đồ Schema (Schema Map) chuẩn xác 100% làm tham chiếu.

### Bước 2: Viết kịch bản sinh dữ liệu (Data Generation Script)
Sử dụng Node.js để viết kịch bản tạo dữ liệu giả lập (Mocking Data). 
*   **Quy tắc:** Các mảng biến nội bộ định nghĩa câu lệnh `INSERT INTO` **phải khớp hoàn toàn** với các cột bắt buộc (`NOT NULL`) đã phân tích ở Bước 1. Các cột dư thừa hoặc không tồn tại tuyệt đối không được đưa vào.
*   **Khối lượng dữ liệu (Volume):**
    *   Sử dụng vòng lặp duyệt qua **ít nhất 5-6 tháng** (vd: Tháng 1 đến Tháng 6 năm 2026).
    *   **Transactions:** Mỗi User sẽ được tự động sinh ngẫu nhiên 30 - 50 giao dịch mỗi tháng, bao gồm cả Giao dịch đơn, Giao dịch chia tiền (Splits), và Giao dịch nhóm.
    *   **Categories:** Nạp đầy đủ 19 danh mục tiêu chuẩn (Thu nhập, Chi tiêu, Chuyển khoản).
    *   **Budgets & Goals:** Khởi tạo các ngân sách linh hoạt theo từng tháng và các quỹ tiết kiệm có mục tiêu.

### Bước 3: Hợp nhất và Đóng gói (Compilation)
*   **Bước 3.1 - Schema Definition:** Script sẽ đọc file chứa định nghĩa `CREATE TABLE` (hoặc để Hibernate tự tạo DDL, tuy nhiên file SQL seeder thường bao gồm luôn DDL để chạy độc lập).
*   **Bước 3.2 - Dọn dẹp (Cleanup):** Script chèn các lệnh `DELETE FROM ...` theo thứ tự từ bảng con (có Foreign Key) đến bảng cha để đảm bảo làm sạch DB mà không vi phạm ràng buộc (vd: Xóa `transaction_splits` trước `transactions`, xoá `transactions` trước `wallets`).
*   **Bước 3.3 - Hợp nhất (Merge):** Gắn hàng ngàn câu lệnh `INSERT` vừa sinh ra vào sau khối Cleanup. 
*   **Kết quả cuối cùng:** Xuất ra duy nhất 1 file `.sql` hoàn chỉnh (ví dụ: `seed_v2.sql`), nặng khoảng 500KB - 1MB.

### Bước 4: Thực thi (Execution)
Nhà phát triển chỉ việc copy toàn bộ nội dung file `.sql` cuối cùng, dán vào Query Tool của pgAdmin hoặc DataGrip và thực thi. 
Toàn bộ database cũ sẽ được quét sạch và tái tạo với hệ sinh thái dữ liệu mới khổng lồ trong tích tắc.

---

## 3. Đặc tả Bộ dữ liệu mẫu V2 (Seed V2 Data Specs)

Khi quy trình trên được chạy, bộ dữ liệu tạo ra sẽ có cấu trúc như sau:

*   **Users:** 5 User giả lập đại diện cho 5 tính cách tài chính (Thông thái, Tiêu lố, Trùm nhóm, Con nợ, Newbie).
*   **Wallets:** Mỗi user có 1 Tiền mặt và 1 Thẻ tín dụng (có nợ).
*   **Transactions:** Trung bình **~2000 giao dịch** trải dài liên tục trong 6 tháng.
*   **Groups:** Các group du lịch/ăn uống chung, có chứng từ chi tiêu (Expenses) và hệ thống trả nợ chéo (Payments).
*   **Budgets:** Ngân sách ăn uống, mua sắm được thiết lập hàng tháng để dễ dàng kiểm tra tính năng biểu đồ.
*   **Loans:** Mô phỏng vay ngân hàng và cho bạn bè mượn tiền (tính năng External Loans).

---

## 4. Đặc tả Bộ dữ liệu mẫu V3 (Seed V3 Data Specs)

Bộ dữ liệu **Seed V3 (`seed_v3.sql`)** tuân thủ nghiêm ngặt quy tắc mốc thời gian:
*   **Khung thời gian:** Chuẩn hóa toàn bộ sự kiện diễn ra từ **Tháng 01/2026 đến Hiện tại (28/07/2026)** (gồm 7 tháng dữ liệu T1 đến T7/2026).
*   **Mốc khởi tạo:** User, Ví, Nhóm, Danh mục, Tag, Payee được tạo từ ngày `2026-01-01 08:00:00`.
*   **Transactions & Expenses:** Giao dịch cá nhân và nhóm trải dài từ 01/01/2026 đến 28/07/2026 (Tháng 7 giới hạn từ ngày 1 đến ngày 28/07/2026).
*   **Đồng bộ Entity:** Loại bỏ hoàn toàn các timestamp cũ từ năm 2025.

---

---

## 5. Đặc tả Bộ dữ liệu mẫu V7 (Seed V7 Data Specs)

Bộ dữ liệu **Seed V7 (`seed_v7.sql` & `generate_seed_v7.js`)** nâng cấp toàn diện và hoàn thiện 100% dữ liệu cho mọi Entity:
*   **Loại bỏ chữ "Ngân sách " lặp lại:** Tên ngân sách được đặt tự nhiên, sạch sẽ (VD: `Tiền nhà T8/2026`, `Tiền điện T8/2026`, `Ăn uống T8/2026`, `Phí liên lạc T8/2026`).
*   **Đầy đủ các trường Entity:**
    *   `budgets`: Đầy đủ `due_day_of_month`, `payee_bank_bin`, `payee_bank_account`, `payee_account_name`.
    *   `external_loans`: Đầy đủ `counterparty_phone`, `interest_rate`, `start_date`, `due_date`.
    *   `savings_goals`: Đầy đủ mục tiêu và tiến độ tiết kiệm chuẩn xác.
*   **Hệ thống thông báo Realtime đa dạng (`notifications`):**
    *   `BUDGET_WARNING`: Cảnh báo sắp chạm 85% hạn mức ngân sách.
    *   `BUDGET_OVER`: Cảnh báo vượt 122% hạn mức Tiền nhà.
    *   `Z_SCORE_ANOMALY`: Cảnh báo phát hiện chi tiêu tăng đột biến bất thường.
    *   `DEBT_REMINDER`: Nhắc nợ nhóm từ AI / bạn bè.
    *   `DEBT_PAYMENT_NOTIFIED`: Báo đã thanh toán tiền mặt chờ duyệt.
    *   `DEBT_SETTLED`: Xác nhận thu hồi nợ thành công qua VietQR.
    *   `EXPENSE_CREATED`: Thông báo hóa đơn nhóm mới.
    *   `SAVINGS_MILESTONE`: Chúc mừng cột mốc tiết kiệm.
    *   `SALARY_RECEIVED`: Thông báo cộng lương hàng tháng.

---

## 6. Tóm tắt các Script đang sử dụng
*   `check_entities.js`: Tool nội bộ dùng để quét file `.java` và validate cấu trúc cột `NOT NULL`.
*   `generate_seed_v7.js`: Kịch bản thế hệ mới nhất V7, loop dữ liệu, sinh mảng thực thể hoàn chỉnh và xuất ra `seed_v7.sql`.
*   `seed_v7.sql`: File SQL thành phẩm V7 hoàn thiện 1.5MB sẵn sàng thực thi trên pgAdmin / DataGrip.

