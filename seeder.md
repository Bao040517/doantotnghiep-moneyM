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

---

## 10. Đặc tả Bộ dữ liệu mẫu V12 (Seed V12 Data Specs)

Bộ dữ liệu **Seed V12 (`seed_v12.sql` & `generate_seed_v12.js`)** là phiên bản tối ưu hóa toàn diện cho tính năng **Cố vấn tài chính AI & Tái cân bằng ngân sách (Rebalance Plan)**:
*   **Hệ sinh thái Tái cân bằng & Cân bằng xám chuẩn mực (Tháng 08/2026):**
    *   **Khoản vượt hạn mức cố định (Section 1):** *Tiền nhà* (1.850.000 / 1.800.000 đ -> Vượt 50.000 đ).
    *   **Khoản vượt hạn mức linh hoạt (Section 1):** *Ăn uống* (2.150.000 / 2.000.000 đ -> Vượt 150.000 đ).
    *   **Khoản đề xuất cắt giảm Tier 1 Luxury (Section 2 - Màu xanh):** *Quần áo* (Đã chi 350.000 / 1.000.000 đ -> Còn dư 650.000 đ -> Đề xuất cắt giảm 200.000 đ xuống 800.000 đ để bù đắp 100% phần tiêu lố).
    *   **Khoản đã cân bằng tối ưu (Section 2 - Thẻ màu xám `✓ Đã cân bằng`):** *Chi tiêu hàng ngày* (1.45tr/1.5tr), *Phí giao lưu* (1.28tr/1.5tr), *Đi lại* (420k/800k).
*   **Duy trì chuẩn tài chính thực tế:**
    *   Mọi hạn mức ngân sách `<= 2.000.000 VNĐ`.
    *   Tổng số dư ví mỗi User `<= 25.000.000 VNĐ`.
    *   Đầy đủ 18 bảng Entity, 9 cột Payee, các đơn hàng thanh toán PayOS/VNPay.

---

## 11. Đặc tả Bộ dữ liệu mẫu V13 (Seed V13 Data Specs)

Bộ dữ liệu **Seed V13 (`seed_v13.sql` & `generate_seed_v13.js`)** là phiên bản hoàn thiện chuẩn hóa **Mốc thời gian thực tế & Trải nghiệm thị giác**:
*   **Mốc thời gian thực tế (Strict Real-time Cutoff):**
    *   Toàn bộ dữ liệu giao dịch, chi tiêu nhóm, đơn thanh toán và thông báo đều được giới hạn nghiêm ngặt **đến ngày hôm nay 20/08/2026** (`<= 2026-08-20 23:59:59`).
    *   **Tuyệt đối không có dữ liệu tương lai:** Không sinh bất kỳ giao dịch nào từ ngày 21/08/2026 trở đi hay các tháng 9, 10, 11, 12/2026.
*   **Đồng bộ Avatar Hoạt hình Nghệ thuật (DiceBear Cartoon & Robot):**
    *   Toàn bộ 5 User personas được gắn avatar hoạt hình DiceBear (`bottts` & `adventurer`) thay thế hoàn toàn ảnh chân dung người thật.
    *   Các nhóm chi tiêu chung có đầy đủ trường `avatar_url` chuẩn Entity `Group.java`.
*   **Hệ sinh thái Tái cân bằng ngân sách & Cố vấn AI tối ưu:**
    *   Tháng 08/2026 thể hiện rõ ràng các khoản tiêu lố (*Tiền nhà, Ăn uống*), khoản đề xuất bù trừ (*Quần áo*) và các khoản đã cân bằng (*Chi tiêu hàng ngày, Phí giao lưu, Đi lại, Tiền điện, Phí liên lạc*).
    *   Hạn mức ngân sách `<= 2.000.000 VNĐ`, tổng tài sản ròng `<= 25.000.000 VNĐ`.
    *   Đồng bộ 100% 18 bảng Entity Spring Boot và đa cổng thanh toán PayOS / VNPay.

---

## 12. Đặc tả Bộ dữ liệu mẫu V14 (Seed V14 Data Specs)

Bộ dữ liệu **Seed V14 (`seed_v14.sql` & `generate_seed_v14.js`)** là phiên bản tối ưu hóa chuyên sâu phục vụ cho **Kiểm thử Luồng Thanh Toán Chuyển Khoản Trực Tiếp VietQR P2P & Cổng Tự Động PayOS**:
*   **3 User Đặc Biệt với Tài Khoản Ngân Hàng Chỉ Định:**
    *   **User A (`nguyenvana@gmail.com`):** Ngân hàng **MBBank** (Mã BIN `970422`), Số tài khoản **`6617052004888`**, Tên chủ tài khoản: **`DUONG DUC BAO`**.
    *   **User B (`nguyenvanb@gmail.com`):** Ngân hàng **Techcombank** (Mã BIN `970407`), Số tài khoản **`6617052004`**, Tên chủ tài khoản: **`NGUYEN VAN B`**.
    *   **User C (`nguyenvanc@gmail.com`):** Ngân hàng **MSB** (Mã BIN `970426`), Số tài khoản **`4517052004`**, Tên chủ tài khoản: **`NGUYEN VAN C`**.
    *   *User D (`phamvand@gmail.com`)*: BIDV (`970418` - `10938888999`).
    *   *User E (`hoangthie@gmail.com`)*: TPBank (`970423` - `10948888999`).
*   **Hệ Thống Ngân Sách Hóa Đơn Cố Định (BILL) Phong Phú Có Sẵn Thụ Hưởng:**
    *   Cả 3 User A, B, C đều được thiết lập nhiều khoản ngân sách phân loại **`BILL`** (Hóa đơn cố định) như *Tiền nhà, Tiền điện, Phí liên lạc/Internet, Phí dịch vụ chung cư*.
    *   Mỗi khoản BILL đều được liên kết sẵn thông tin thụ hưởng (`payee_bank_bin`, `payee_bank_account`, `payee_account_name`, `payee_id`) của nhau (A chuyển tiền nhà cho B Techcombank, B chuyển cho C MSB, C chuyển cho A MBBank).
    *   **Tháng hiện tại (08/2026):** Giữ lại các khoản BILL chưa thanh toán hoặc thanh toán 1 phần để khi mở app xuất hiện ngay nút **`✓ Trả ngay`**, phục vụ kiểm thử luồng 1-chạm VietQR P2P và PayOS tự động.
*   **Duy trì toàn vẹn ràng buộc PFM:**
## 13. Đặc tả Bộ dữ liệu mẫu V15 (Seed V15 Data Specs)

Bộ dữ liệu **Seed V15 (`seed_v15.sql` & `generate_seed_v15.js`)** là phiên bản mở rộng toàn diện hệ thống **Ngân sách Hóa đơn Cố định (BILL)** cho 3 User chỉ định:
*   **3 User Đặc Biệt với Tài Khoản Ngân Hàng Chỉ Định:**
    *   **User A (`nguyenvana@gmail.com`):** Ngân hàng **MBBank** (Mã BIN `970422`), Số tài khoản **`6617052004888`**, Tên chủ tài khoản: **`DUONG DUC BAO`**.
    *   **User B (`nguyenvanb@gmail.com`):** Ngân hàng **Techcombank** (Mã BIN `970407`), Số tài khoản **`6617052004`**, Tên chủ tài khoản: **`NGUYEN VAN B`**.
    *   **User C (`nguyenvanc@gmail.com`):** Ngân hàng **MSB** (Mã BIN `970426`), Số tài khoản **`4517052004`**, Tên chủ tài khoản: **`NGUYEN VAN C`**.
    *   *User D (`phamvand@gmail.com`)*: BIDV (`970418` - `10938888999`).
    *   *User E (`hoangthie@gmail.com`)*: TPBank (`970423` - `10948888999`).
*   **5 Khoản Ngân Sách BILL (Hóa Đơn Cố Định) Mở Rộng Cho Mỗi User Đặc Biệt:**
    *   **1. Tiền nhà / Phòng trọ** (`BILL`, 1.5tr - 1.8tr): Chuyển tiền nhà chéo nhau giữa A (MBBank) -> B (Techcombank) -> C (MSB) -> A.
    *   **2. Tiền điện sinh hoạt** (`BILL`, 650k - 750k): Gắn EVN HCMC (VCB `1012345678`).
    *   **3. Phí Internet / 4G liên lạc** (`BILL`, 200k - 250k): Gắn Viettel Telecom (Techcombank `19033338888`).
    *   **4. Học phí / Đào tạo / Khóa học** (`BILL`, 800k - 1.2tr): Gắn Đại Học FPT / FPT Telecom / VUS.
    *   **5. Bảo hiểm / Y tế định kỳ** (`BILL`, 400k - 500k): Gắn Bảo Việt / Bệnh viện Hoàn Mỹ / Phòng khám CarePlus.
    *   **Tháng hiện tại (08/2026):** Giữ lại các khoản BILL chưa thanh toán hoặc thanh toán 1 phần để khi mở app xuất hiện ngay nút **`✓ Trả ngay`**, test trọn vẹn luồng thanh toán VietQR P2P & PayOS.
*   **Nhóm Chung Riêng Biệt & Nợ Nhau Chéo Giữa A - B - C:**
    *   Nhóm **"Hội Bạn Thân (A - B - C)"**: Cả 3 User A, B, C cùng tham gia.
    *   **Khoản nợ 1 (User A chi)**: Ăn lẩu nướng Haidilao (1.200.000 ₫ $\rightarrow$ mỗi người 400.000 ₫) $\rightarrow$ **B nợ A 400k**, **C nợ A 400k** (Chưa thanh toán).
    *   **Khoản nợ 2 (User B chi)**: Thuê xe tự lái dã ngoại (900.000 ₫ $\rightarrow$ mỗi người 300.000 ₫) $\rightarrow$ **A nợ B 300k**, **C nợ B 300k** (Chưa thanh toán).
    *   **Khoản nợ 3 (User C chi)**: Homestay cuối tuần (1.500.000 ₫ $\rightarrow$ mỗi người 500.000 ₫) $\rightarrow$ **A nợ C 500k**, **B nợ C 500k** (Chưa thanh toán).
    *   Mỗi user đều có nút **`⚡ Trả nợ`** với mã VietQR P2P chuyển tiền thẳng vào đúng STK ngân hàng chỉ định (MBBank, Techcombank, MSB).
*   **Duy trì toàn vẹn ràng buộc PFM:**
    *   Dữ liệu 20 tháng liên tục (01/2025 -> 20/08/2026), mốc cutoff thời gian thực tế `<= 20/08/2026`.
    *   Hạn mức ngân sách `<= 2.000.000 VNĐ`, tổng tài sản ròng `<= 25.000.000 VNĐ`.
    *   Đầy đủ 18 bảng Entity Spring Boot, 1.369 giao dịch và 488 ngân sách.

---

## 14. Tóm tắt các Script đang sử dụng
*   `generate_seed_v15.js`: Kịch bản thế hệ mới nhất V15, cấu hình 3 tài khoản ngân hàng đặc biệt (MBBank, Techcombank, MSB) và 5 khoản ngân sách BILL cho mỗi user.
*   `seed_v15.sql`: File SQL thành phẩm V15 sẵn sàng thực thi trực tiếp trên PostgreSQL (Supabase / Render / pgAdmin / DataGrip / DBeaver).
*   `seed_v14.sql` / `generate_seed_v14.js`: Bản lưu trữ thế hệ V14.
*   `seed_v13.sql` / `generate_seed_v13.js`: Bản lưu trữ thế hệ V13.
*   `check_entities.js`: Tool nội bộ quét file `.java` và validate cấu trúc cột `NOT NULL`.
*   `seed_v12.sql` / `generate_seed_v12.js`: Bản lưu trữ thế hệ V12.
*   `seed_v11.sql` / `generate_seed_v11.js`: Bản lưu trữ thế hệ V11.





