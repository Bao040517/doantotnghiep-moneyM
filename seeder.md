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

## 6. Đặc tả Bộ dữ liệu mẫu V8 (Seed V8 Data Specs)

Bộ dữ liệu **Seed V8 (`seed_v8.sql` & `generate_seed_v8.js`)** là phiên bản hoàn thiện kiến trúc thanh toán trực tuyến VNPay và đối soát kiểm toán.

---

## 9. Đặc tả Bộ dữ liệu mẫu V11 (Seed V11 Data Specs)

Bộ dữ liệu **Seed V11 (`seed_v11.sql` & `generate_seed_v11.js`)** là phiên bản hoàn thiện quy mô tài chính chuẩn hóa:
*   **Hạn mức Ngân sách tối đa 2.000.000 VNĐ:**
    *   Toàn bộ 416 bản ghi ngân sách trải dài 24 tháng đều tuân thủ `limit_amount <= 2,000,000 VNĐ`.
    *   *Ăn uống:* 2.000.000 đ | *Tiền nhà:* 1.200.000 - 1.800.000 đ | *Chi tiêu hàng ngày:* 1.500.000 đ | *Phí giao lưu:* 1.500.000 đ | *Quần áo:* 1.000.000 đ | *Đi lại:* 800.000 đ | *Tiền điện:* 750.000 đ | *Phí liên lạc:* 200.000 đ.
*   **Số dư tài khoản & Ví tối đa không quá 25.000.000 VNĐ:**
    *   Lương và chi tiêu hàng tháng được điều chỉnh tỷ lệ thực tế (Lương 7.5tr - 18tr/tháng).
    *   Số dư ví chính: 4.8tr - 15.5tr VNĐ | Ví tiết kiệm: 1tr - 5tr VNĐ | Thẻ tín dụng âm nhẹ -> **Tổng tài sản ròng mỗi user luôn <= 25.000.000 VNĐ** (0 vi phạm).
*   **Đồng bộ 100% Entity Java Spring Boot:**
    *   Khớp 100% tất cả 18 bảng, đầy đủ 9 cột của `payees`, liên kết `payee_id` vào `budgets`, khóa ngoại `UUID`, `tags`, `savings_goals`, `external_loans`, `payment_orders`.
*   **Duy trì ca test Dashboard & Cảnh báo sinh động (Tháng 08/2026):**
    *   1 ngân sách vượt hạn mức nhẹ (Ăn uống 2.15tr / 2tr -> 107.5%).
    *   1 ngân sách tiệm cận hạn mức (Phí giao lưu 1.28tr / 1.5tr -> 85.3%).
    *   Các đơn hàng trực tuyến PayOS & VNPay (Pending, Success, Cancelled).

---

## 10. Tóm tắt các Script đang sử dụng
*   `check_entities.js`: Tool nội bộ dùng để quét file `.java` và validate cấu trúc cột `NOT NULL`.
*   `generate_seed_v11.js`: Kịch bản thế hệ mới nhất V11, áp dụng giới hạn ngân sách <= 2tr, số dư tài khoản <= 25tr, sinh đầy đủ thực thể và xuất ra `seed_v11.sql`.
*   `seed_v11.sql`: File SQL thành phẩm V11 hoàn thiện sẵn sàng thực thi trên pgAdmin / DataGrip / DBeaver.
*   `seed_v10.sql` / `generate_seed_v10.js`: Bản lưu trữ thế hệ V10.
*   `seed_v9.sql` / `generate_seed_v9.js`: Bản lưu trữ thế hệ V9.
*   `seed_v8.sql` / `generate_seed_v8.js`: Bản lưu trữ thế hệ V8.



