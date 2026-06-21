# ShareMoney - Trợ lý Tài chính & Quản lý Chi tiêu Nhóm

Dự án đã chuyển dịch từ một ứng dụng chia tiền nhóm đơn thuần sang một hệ thống quản lý tài chính cá nhân (PFM - Personal Financial Management) toàn diện.

## 📌 Các tính năng cốt lõi đã hoàn thành:
1. **Ví cá nhân (Wallet):** Theo dõi số dư, ghi chép thu/chi cá nhân.
2. **Chi phí cố định (Budgets):** Ngân sách hàng tháng cho các khoản chi bắt buộc.
3. **Tiết kiệm tự động (Savings Goals):** Tự động trích tiền nhàn rỗi vào các quỹ tiết kiệm dựa trên Mức độ Ưu tiên.
4. **Chia tiền nhóm (Group Split):** Tạo hóa đơn chung, thuật toán Greedy chia nợ tối ưu.
5. **Thanh toán nợ (Debt Settlement):** Nhắc nợ, tạo mã QR VietQR, và quy trình Xác nhận.

### Session [2026-06-19] - Cash Basis Alignment, Tab-Linked Charts & Clickable Debt Drawer

**✅ Đã hoàn thành (Compact Procedure):**

**1. Chuẩn hóa Lịch sử Giao dịch & Kế toán tiền mặt (Cash Basis Logic):**
   - **Backend:** Cập nhật `PfmEventListener.java` để khi một thành viên chi trả hóa đơn nhóm (ví dụ: chi 3.900.000đ), hệ thống ghi nhận đúng **một giao dịch duy nhất** loại `EXPENSE` cho người trả với số tiền đầy đủ, mô tả đúng tiêu đề hóa đơn gốc (ví dụ: `"Tiền nhà trọ"`), gỡ bỏ cờ ảo `"Phần của tôi"` và loại bỏ các giao dịch chuyển khoản trung gian `"Cho nhóm mượn"`.
   - **Frontend:** Nâng cấp [history-tab.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/history-tab.tsx) và [transaction-history-drawer.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/transaction-history-drawer.tsx) loại bỏ bộ lọc cũ, hiển thị đầy đủ dòng tiền thực tế cùng nhãn badge `💸 Chi hộ nhóm` bên cạnh giao dịch của người trả để đối soát minh bạch.
   - **Chuyển đổi dữ liệu cũ:** Thực thi nâng cấp thủ công (`UpdateDb.java`) cập nhật 11 giao dịch chi tiêu nhóm cũ về số tiền đầy đủ và mô tả sạch, xóa bỏ hoàn toàn 11 giao dịch chuyển khoản nợ ảo trong CSDL.

**2. Liên kết Biểu đồ Đường với Tab lựa chọn (Tab-Linked Trend Chart):**
   - **Cấu trúc:** Nhúng cả phần Cơ cấu tài chính (donut chart) và Xu hướng 6 tháng (line chart) vào chung một khối thẻ trắng (White card container) liên mạch trên tab Báo cáo ([report-tab.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/report-tab.tsx)).
   - **Động hóa biểu đồ đường:** Nâng cấp `LineChart` nhận biến `activeTab`. 
     - Khi chọn tab **"Chi tiêu"**: Biểu đồ chỉ vẽ và thống kê đường **Chi tiêu** (đỏ) và **Trả nợ** (tím).
     - Khi chọn tab **"Thu nhập"**: Biểu đồ chỉ vẽ và thống kê đường **Thu nhập** (xanh lá) và **Tiết kiệm** (vàng nét đứt).
     - Thu hồi nợ `"Nhận tiền nhóm"` được `TransactionService.java` tự động cộng gộp vào doanh thu thực tế để tính toán chính xác số dư tích lũy.

**3. Xem Chi tiết Công nợ từ Dashboard (Click-to-Detail Debt Drawer):**
   - **Dữ liệu:** Lưu trữ chi tiết các khoản nợ (`details`) từ API `/groups/debts/summary` trên [dashboard-tab.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/dashboard-tab.tsx).
   - **Tương tác:** Tích hợp `GlobalDebtsDrawer` làm trigger bọc trực tiếp các dòng thông tin nợ trên thẻ ví. Khi bấm vào **"Nợ người khác"** sẽ tự động mở drawer ở tab **"Cần trả"** (`myDebts`); khi bấm vào **"Người khác nợ tôi"** sẽ mở ở tab **"Đang bay về"** (`owedToMe`). Thêm hiệu ứng hover, cursor-pointer và active feedback cao cấp.

---

### Session [2026-06-19] - Group Category "Hóa đơn" & Split Mode Toggles

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tích hợp danh mục "Hóa đơn" (Group Bill/Invoice Category):**
   - **Frontend:** Thêm danh mục `"Hóa đơn"` vào danh sách lựa chọn của Thêm chi tiêu ([add-expense-drawer.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/add-expense-drawer.tsx)) và Sửa chi tiêu ([edit-expense-drawer.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/edit-expense-drawer.tsx)), gán icon `Receipt` cùng màu sắc xanh dương nhẹ (`bg-[#D6EAF8]` / `text-[#2980B9]`). Cấu hình màu biểu đồ `"Hóa đơn": "#2980b9"` ([expense-chart.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/components/expense-chart.tsx)) và hiển thị emoji `🧾` trên thẻ chi tiết ([page.tsx](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/Frontend/src/app/groups/%5Bid%5D/page.tsx)).
   - **Backend:** Kiểm tra và xác nhận backend đã tích hợp sẵn `"Hóa đơn"` làm danh mục mặc định của người dùng mới, và tự động liên kết trơn tru thông qua PFM Listener (`PfmEventListener.java`) và báo cáo thống kê (`TransactionService.java`) mà không cần can thiệp logic Java.
   - **Xác thực:** Viết và chạy thành công test tự động tích hợp [test_hoa_don.js](file:///C:/Users/DELL/.gemini/antigravity-ide/brain/f84f5d43-e706-4a03-bebd-2b1461324a06/scratch/test_hoa_don.js).

**2. Nâng cấp bộ chọn chia chi tiêu (Split Mode Toggles - Equal vs Custom):**
   - **Giao diện:** Thiết kế lại phần "Chia cho ai?" bằng cụm nút chọn giữa hai chế độ:
     - *Chia đều cả nhóm:* Tự động chọn tất cả thành viên trong nhóm và hiển thị thông báo gom nhóm.
     - *Chọn người chia:* Hiển thị danh sách checkmark.
   - **Tối ưu hóa Trải nghiệm:**
     - Khi chuyển từ "Chia đều cả nhóm" sang "Chọn người chia", danh sách checkmark sẽ **mặc định trống (không tích sẵn ai cả)** để người dùng dễ dàng tích chọn từ đầu.
     - Cập nhật hàm `toggleUser` cho phép bỏ tích toàn bộ (về 0 người) và hiển thị cảnh báo validation hợp lệ khi nhấn lưu hóa đơn.

---

### Session [2026-06-19] - Database Constraints Repair & Deposit Drawer UX

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục lỗi Database Constraint & Khởi tạo Danh mục (500 Error):**
   - **Phân tích:** API `GET /api/categories` trả về lỗi 500 khi người dùng mới hoặc người dùng chưa có danh mục mặc định đăng nhập. Nguyên nhân do Database PostgreSQL chứa Check Constraint cũ `categories_type_check` giới hạn kiểu `type` chỉ được là `INCOME` hoặc `EXPENSE`, chặn đứng nỗ lực lưu các danh mục loại `TRANSFER`. Ngoài ra, cột `is_auto_generated` trong thực thể `Transaction` chưa được đồng bộ vào bảng `transactions` dưới DB.
   - **Xử lý:** Thực thi lệnh SQL trực tiếp qua JDBC Test:
     - `ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;`
     - `ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;`
     - `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false;`
     - Sau khi dọn dẹp DB, test E2E đã chạy hoàn toàn trơn tru.

**2. Tối ưu hóa Drawer thêm giao dịch (AddTransactionDrawer UX):**
   - **Yêu cầu:** Khi người dùng nạp tiền vào ví (`INCOME`), các trường không liên quan như "Đối tác / Người nhận" và "Thẻ" gây thừa thãi.
   - **Xử lý:** Ẩn 2 trường nhập liệu này bằng biểu thức điều kiện `type === "EXPENSE"`. Giờ đây chúng chỉ hiển thị khi thực hiện chi tiêu (`EXPENSE`), giúp giao diện nạp tiền sạch sẽ và tối giản hơn.

---

### Session [2026-06-17] - Deep Audit, Logic Fixes & Data Conflict Resolution

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục lỗi Mất Tiền (Data Loss) & Rác Dữ Liệu (Orphan Data) ở PFM Event:**
   - **Phân tích Vấn đề:** Trong `PfmEventListener`, hệ thống chia khoản chi nhóm thành "Phần của tôi" (EXPENSE) và "Cho nhóm mượn" (TRANSFER). Tuy nhiên, hàm `handleExpenseDeleted` thiếu mất luồng hoàn tiền (rollback) cho danh mục "Cho nhóm mượn", khiến tiền của user bị trừ vĩnh viễn không thể khôi phục khi xoá hoá đơn. Ngoài ra, việc xoá hoá đơn có liên kết với một giao dịch độc lập (Manually linked) đã kích hoạt thao tác xoá nhầm luôn cả giao dịch gốc của user, dẫn đến mất mát dữ liệu hoặc deadlock khoá cứng Database.
   - **Thiết kế lại Kiến trúc:** Bổ sung thuộc tính `isAutoGenerated` (mặc định: `false`) vào Entity `Transaction` và tiến hành update cấu trúc bảng qua Hibernate ddl-auto.
   - **Thực thi:** Cập nhật `PfmEventListener` để đánh dấu `isAutoGenerated = true` cho toàn bộ các giao dịch sinh ra tự động. Trong hàm xoá, hệ thống giờ đây chỉ rollback và xoá các bản ghi do máy tạo. Đối với bản ghi tay của user, hệ thống chỉ an toàn gỡ liên kết (`tx.setLinkedExpenseId(null)`). Lỗ hổng hoàn tiền cũng được vá kín bằng cách cộng lại chính xác `tx.getAmount()` cho danh mục "Cho nhóm mượn".

**2. Vá lỗ hổng Ghi Đè (Overwrite) & Bất đồng bộ Thống Kê Thu-Chi:**
   - **Vấn đề Ghi đè:** Hàm `updateExpense` trong `ExpenseService` thiếu cơ chế fallback khi mảng `splitUserIds` bị gửi lên rỗng, dẫn đến việc reset toàn bộ nỗ lực tuỳ chỉnh chia tiền của người dùng về trạng thái Chia Đều (Equal Split).
   - **Giải quyết:** Gỡ bỏ ràng buộc `@NotEmpty` khỏi `UpdateExpenseRequest`. Bổ sung thuật toán nội suy (Fallback mapping): nếu request rỗng, tự động lấy toàn bộ danh sách thành viên hiện tại trong nhóm trừ người trả tiền để tái thiết lập split một cách an toàn.
   - **Vấn đề Thống kê:** Hàm vẽ biểu đồ Thu nhập `getIncomeCategoryBreakdown` bị code thiếu logic quét qua danh sách phân rã (Splits), khiến biểu đồ hiển thị sai lệch nếu user chia nhỏ luồng tiền.
   - **Giải quyết:** Viết lại toàn bộ vòng lặp trong `getIncomeCategoryBreakdown` để duyệt đệ quy vào từng `TransactionSplit` y hệt như bên phần Chi tiêu. Bổ sung Rule cứng chặn đứng (Throw `INVALID_SPLIT_CATEGORY_TYPE`) bất kỳ nỗ lực nào cố tình gán danh mục Thu Nhập vào một phần chia nhỏ của Giao dịch Chi Tiêu và ngược lại.

**3. Tối Ưu Hoá Giải Thuật Greedy (Chốt Nợ Tự Động & Dọn Rác):**
   - **Vấn đề Nghẽn Cổ Chai:** Các khoản nợ khi thanh toán thay vì triệt tiêu lẫn nhau, lại liên tục sinh ra các bản ghi `SETTLEMENT` với cờ `isSettled = false`. Hậu quả là thuật toán tối giản nợ Greedy (O(V^2)) phải gánh chịu số lượng bản ghi ngày một phình to (Memory Bloat), gây thắt nút cổ chai hiệu năng.
   - **Triển khai Auto-Consolidate:** Nâng cấp hàm `approveSettle` trong `DebtService`. Bất cứ khi nào một khoản thanh toán được duyệt, hệ thống sẽ:
     1. Khóa băng: Tự động đánh dấu `isSettled = true` cho TẤT CẢ các bản ghi nợ chưa trả.
     2. Lọc cặn: Gọi thuật toán Greedy để tìm ra danh sách nợ tối giản nhất.
     3. Tái sinh: Tạo ra một loạt các hoá đơn ảo lưu danh mục `"CONSOLIDATION"` (Chốt nợ tự động hệ thống) để đóng vai trò làm điểm neo (checkpoint) cho các tính toán sau này.
   - **Kết quả:** Database được dọn dẹp sạch sẽ, tốc độ thuật toán Greedy tăng lên mức lý tưởng vì chỉ cần quét qua vỏn vẹn vài bản ghi hợp nhất.

*(Lưu ý Kiến trúc: Lỗi Race Condition khi 2 request cùng tạo Payee/Tag đã được ghi nhận trong báo cáo phân tích nhưng tạm thời được bỏ qua do hạn chế của `@Transactional` trong việc bọc `DataIntegrityViolationException` mà không phá vỡ transaction context của Spring).*

---

### Session [2026-06-16] - Comprehensive Backend Audit & Security Fixes

**✅ Đã hoàn thành (Compact Procedure):**

**1. Sửa Lỗi Nghiêm Trọng Logic Dữ Liệu (Data Integrity):**
   - Xóa bỏ đoạn mã `DROP CONSTRAINT` nguy hiểm trong `BudgetController` chạy mỗi khi khởi động server.
   - Sửa logic tính toán số dư ví đối với giao dịch loại `TRANSFER`: Các giao dịch chuyển khoản sẽ không trừ tiền ví như `EXPENSE` nữa, giúp bảo toàn số dư tổng.
   - Xử lý tận gốc lỗi `WalletService` và `SavingsGoalService` lấy nhầm "Ví Nợ Nhóm" (Liability Wallet) để trừ tiền tiết kiệm hay tính tổng tài sản, bằng cách truy vấn chính xác `findByUser_IdAndIsLiability(userId, false)`.
   - Bổ sung `COALESCE` trong các query `TransactionRepository` để tránh lỗi trả về null.

**2. Vá Lỗ Hổng Bảo Mật & Phân Quyền (Security & Authorization):**
   - `GroupService`: Chặn người lạ thêm thành viên vào nhóm. Bắt buộc người gọi API phải là thành viên hiện tại của nhóm.
   - `ExpenseService`: Bổ sung kiểm tra xác thực quyền sở hữu nhóm trước khi cho phép xem/sửa/xóa hóa đơn. Chặn khả năng mạo danh người trả tiền (`paidBy`) khi tạo khoản chi nhóm.
   - `GlobalExceptionHandler`: Xóa lệnh in Stack Trace trực tiếp ra response của client (tránh lộ thông tin nội bộ), thay bằng cơ chế log an toàn ở phía server.
   - Bổ sung `@Transactional` cho `UserController` để đảm bảo tính toàn vẹn khi cập nhật thông tin nhạy cảm.

**3. Chuẩn Hóa Kiến Trúc Entity (JPA Refactoring):**
   - Loại bỏ toàn bộ annotation `@Data` trên 8 JPA Entities (`Transaction`, `Wallet`, `Budget`, v.v.) và thay bằng `@Getter/@Setter` để ngăn chặn lỗi `StackOverflowError` và `LazyInitializationException`.
   - Cập nhật cơ chế sinh ID từ `@GenericGenerator` (deprecated) sang `GenerationType.UUID` chuẩn mực.
   - Thêm các `UniqueConstraint` (Ràng buộc duy nhất) cho `Category`, `Tag`, và `Payee` để chặn hoàn toàn lỗi tạo dữ liệu trùng lặp khi gặp Race Condition.

**4. Dọn dẹp ErrorCodes & Utils:**
   - Bổ sung và phân bổ lại toàn bộ 13 mã lỗi ErrorCodes sai ngữ cảnh.
   - Cập nhật hàm khởi tạo Locale (`Locale.forLanguageTag`) thay thế hàm cũ đã deprecated.

---

### Session [2026-06-15] - Deep Audit & Sync Logic Fix (Ghost Transactions)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục lỗi NULL Database Constraints:**
   - **Vấn đề:** Các cột `is_liability` trong Wallet và `exclude_from_budget` trong Transaction báo lỗi `NULL` khi chèn dữ liệu.
   - **Thay đổi:** Cập nhật lại Database schema, đặt giá trị mặc định `DEFAULT false` cho hai trường này để tương thích với primitive `boolean` của Java.

**2. Vá lỗ hổng Kế toán - Chặn Sửa/Xoá Giao Dịch Đã Thanh Toán:**
   - **Vấn đề:** Người dùng có thể sửa hoặc xoá khoản chi nhóm ngay cả khi đã có người trả nợ, dẫn đến sai lệch lịch sử giao dịch và đối soát.
   - **Thay đổi:** Bổ sung Validation vào `ExpenseService`. Kiểm tra danh sách `ExpenseSplit`, nếu có bất kỳ người nợ nào đã trả (`isSettled == true`), lập tức chặn mọi thao tác Sửa/Xoá và ném lỗi `EXPENSE_ALREADY_SETTLED`. Tuân thủ tuyệt đối nguyên tắc kế toán "Giao dịch đã thanh toán thì bị khoá cứng".

**3. Khắc phục lỗi "Giao dịch ma" (Ghost Transactions) bằng Event-Driven Rollback:**
   - **Vấn đề:** Khi xoá/sửa một khoản chi nhóm (chưa ai thanh toán), hệ thống PFM không được thông báo, dẫn đến tồn đọng các "giao dịch nợ ảo" không thể xoá.
   - **Thay đổi:** Xây dựng cơ chế kiến trúc hướng sự kiện (EDA). Bổ sung `ExpenseDeletedEvent` và `ExpenseUpdatedEvent`. Khi một khoản chi được phép xoá, `PfmEventListener` sẽ tự động kích hoạt, quét tìm toàn bộ các giao dịch PFM liên đới qua `linkedExpenseId`. Hệ thống sau đó tính toán thuật toán đảo ngược số dư (Rollback Balance) một cách cẩn thận giữa Ví Thật và Ví Nợ (Liability Wallet) trước khi xoá bỏ hoàn toàn các "giao dịch ma" này.

**4. Chuẩn hoá Cơ cấu Ngân Sách (Exclude From Budget):**
   - **Thay đổi:** Viết lại hàng loạt các Query trong `TransactionRepository` để tự động loại bỏ các giao dịch có cờ `excludeFromBudget = true` ra khỏi công thức tính Ngân sách & SafeToSpend. Đảm bảo nợ nần không bị tính đè vào Chi phí cố định hàng tháng.
   - Chuyển danh mục "Trả nợ nhóm" và "Nhận tiền nhóm" sang kiểu `TRANSFER` trong `CategoryService` thay vì `EXPENSE` để làm sạch báo cáo tài chính.

---

### Session [2026-06-15] - Group Debt Integration & "Exclude from Budget" Feature

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tích hợp hiển thị Nợ nhóm vào Tổng kết Ngân sách:**
   - **Vấn đề:** Các khoản nợ chưa thanh toán từ nhóm không hiển thị tập trung cùng ngân sách chi tiêu, khó kiểm soát dòng tiền. Khi số nợ về 0đ cũng bị ẩn đi mất.
   - **Thay đổi:** Nâng cấp thuật toán ở trang Báo cáo (Thống kê). Đưa số tiền "Nợ nhóm" vào bảng Tổng kết ngân sách. Điều chỉnh điều kiện render để luôn hiển thị mục này (ngay cả khi số nợ là 0đ và báo xanh "Đã thanh toán hết") giúp người dùng dễ theo dõi tiến trình trả nợ.

**2. Vẽ biểu đồ Xu hướng Trả nợ (6 Tháng):**
   - Bổ sung đường kẻ màu tím (Đường Trả nợ) vào biểu đồ Line Chart 6 tháng.
   - Viết thêm truy vấn `sumDebtPaymentByPeriod` ở Backend (`TransactionRepository.java`) để tự động quét toàn bộ các khoản chi tiêu có danh mục "Trả nợ nhóm". 
   - Đảm bảo người dùng có bức tranh toàn cảnh về 4 dòng tiền: Thu nhập, Chi tiêu, Tiết kiệm, Trả nợ.



---

### Session [2026-06-14] - Data Consistency, Timezone Fixes & Budget UX Refinement

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục Hệ thống Thời gian & Múi Giờ (Timezone & Sorting Alignment):**
   - **Vấn đề:** Người dùng tạo hóa đơn lúc 21h50 (giờ Việt Nam - GMT+7) nhưng hệ thống lưu và hiển thị là 14h50 (giờ UTC). Do đó, việc sắp xếp danh sách hóa đơn từ mới đến cũ bị sai lệch.
   - **Quyết định & Thay đổi:** Di chuyển cấu hình `TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));` vào hẳn hàm `main` của `SharemoneyApplication.java` trước khi `SpringApplication.run()` khởi chạy. Việc này ép toàn bộ JVM và các Data Types của Spring Boot (như `LocalDateTime.now()`) hoạt động theo chuẩn giờ Việt Nam. Lỗi hiển thị và sắp xếp Lịch sử Giao dịch được khắc phục hoàn toàn.

**2. Phân tách và Gộp thông minh Ngân Sách (Smart Budget Grouping):**
   - **Quyết định quan trọng:** Người dùng yêu cầu các khoản thu/chi nhỏ trong cùng một danh mục (VD: Quần áo mẹ, Quần áo con đều thuộc Mua sắm) **phải đứng độc lập** ở màn hình Quản lý, nhưng **phải gộp chung** ở màn hình Báo cáo.
   - **Thay đổi Backend:** Quay xe (Revert) toàn bộ logic trong `BudgetService.java` (`getBudgetSummary`). Bỏ cơ chế gom nhóm bằng Stream API, trả lại mảng danh sách các khoản ngân sách độc lập rạch ròi.
   - **Thay đổi Frontend:** Viết thuật toán `Map` trực tiếp tại `report-tab.tsx` để tự động gom nhóm (`limitAmount` và `spentAmount` cộng dồn) dựa trên `categoryId`. Thoả mãn hoàn hảo requirement: "Tách ở Quản lý, Gộp ở Báo cáo".

**3. Khởi tạo API Thống kê Thu nhập (Backend Expansion):**
   - **Đã tạo mới:** Endpoint `GET /api/transactions/summary/income-category` trong `TransactionController.java` và logic tương ứng tại `TransactionService.java`.
   - **Quyết định:** Đẩy gánh nặng tính toán cơ cấu Thu nhập từ Frontend xuống Backend để đảm bảo tính nhất quán dữ liệu với các biểu đồ PFM khác. Chỉnh sửa `report-tab.tsx` để fetch data trực tiếp từ API này thay vì tự filter.

**4. Cảnh báo Vượt Ngân Sách (Overspending UX/UI):**
   - **Vấn đề:** Trước đây, khi chi tiêu quá tay, thẻ ngân sách chỉ hiện "Hết ngân sách".
   - **Thay đổi:** Nâng cấp điều kiện logic render tại `budget-tab.tsx`. Thêm kịch bản `b.spentAmount > b.limitAmount` cho cả khoản Linh hoạt và Hóa đơn cố định. Hệ thống tự động chuyển thẻ sang trạng thái Alert Đỏ (`bg-rose-500`) và tính toán chính xác để hiển thị nhãn **"Vượt XXXđ"**.

**5. Nâng cấp Luồng Chỉnh Sửa Ngân Sách (Click-to-Edit Modal):**
   - **Vấn đề:** Không cho phép thay đổi các tham số sau khi tạo ngân sách, buộc người dùng phải xóa đi tạo lại.
   - **Thay đổi Frontend (`set-budget-drawer.tsx`):** Mở rộng interface nhận prop `editBudget`. Sử dụng `useEffect` để nạp sẵn (pre-fill) toàn bộ dữ liệu cũ (Tên, Số tiền, Danh mục, Lặp lại, Hạn thanh toán). Khi bấm Lưu, payload sẽ gắn thêm `id: editBudget.budgetId` gửi lên API `/budgets` (UPSERT logic).
   - **Tối ưu UX (`budget-tab.tsx`):** Gắn sự kiện `onClick` mở Modal cho toàn bộ thẻ Ngân sách. **Đặc biệt:** Bổ sung `e.stopPropagation()` vào các nút con (Trả ngay, Ưu tiên, Xóa) để người dùng bấm nút hành động sẽ không bị popup Modal quấy rầy. Giải quyết mượt mà trải nghiệm tương tác thẻ xếp chồng (Nested Click).

---

### Session [2026-06-14] - Core Logic Override & Real-time Expense Simulation

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tái cấu trúc Logic "Dòng tiền an toàn" (Core Logic Override):**
   - **Hủy bỏ hoàn toàn logic cũ** (dựa vào tổng thu nhập) và thay thế bằng luồng tư duy mới phản ánh đúng thực tế thời gian thực: 
     `Tiền rảnh rỗi = Tổng tiền trong các ví - Ngân sách bắt buộc - Nợ người khác`
     Sau đó lấy 40% của số dư đó trích thẳng vào Tiết kiệm, 60% còn lại mới chính thức là **Tiền rảnh rỗi (Heo đất)**.
   - **Thay đổi kiến trúc tính toán:** Gỡ bỏ các phép tính rườm rà ở Backend (`BudgetService`), đưa toàn bộ công thức tính toán "Tiền rảnh rỗi" về Frontend (`DashboardTab.tsx` và `SavingsTab.tsx`). Đảm bảo mọi con số (Ngân sách, Tiết kiệm, Nợ) đều được đối chiếu và trừ trực tiếp từ "Tổng số dư Ví" thay vì một con số thu nhập ảo.
   - Đã xử lý triệt để việc phân tích và giải thích các con số cho User để thống nhất công thức tính.

**2. Nâng cấp UI/UX Dashboard (Quick Actions & Safe-to-Spend Highlight):**
   - Thiết kế lại cụm "Tiền rảnh rỗi": Làm nổi bật số tiền tổng (Heo đất), và đặt một con số ở dưới cùng chia trung bình ra "Hạn mức tiêu hôm nay" (Daily limit).
   - Bổ sung cụm 3 nút tính năng (Quick Actions): **Nạp vào ví**, **Rút tiền**, **Chuyển khoản**.
   - Loại bỏ các thông báo `alert()` mặc định xấu xí của trình duyệt, thay thế bằng hệ thống **Toast Notifications (Sonner)** hiện đại, trượt mượt mà.
   - Xử lý lỗi sập màn hình (White screen) do vô tình xóa mất state `txSummary` trong quá trình refactor code.

**3. Thiết kế luồng "Giả lập chi tiêu" (Expense Simulation via Transfer):**
   - Biến nút "Chuyển khoản" thành một tính năng giả lập thanh toán thực tế.
   - Xây dựng component `TransferModal` với **luồng 2 bước (2-step flow)**:
     - *Bước 1:* Nhập số tiền và chọn ví nguồn.
     - *Bước 2:* Sau khi chuyển khoản ảo thành công, popup yêu cầu người dùng định nghĩa "Mục đích chi tiêu" (Chọn Category).
   - Tích hợp gọi API `POST /api/transactions` ngay lập tức. Sau khi hoàn tất, hệ thống kích hoạt `fetchData()` để tải lại toàn bộ Dashboard -> Tổng ví giảm, Ngân sách tăng, và Tiền rảnh rỗi giảm ngay trước mắt (Real-time tracking).
   - Sửa lỗi `wallets.map is not a function`: Khắc phục việc Backend trả về object đơn lẻ bằng cách viết cơ chế parse dữ liệu an toàn (`Array.isArray`).

**4. Kế hoạch Tích hợp Cổng thanh toán (Payment Gateway Integration):**
   - Thảo luận và chốt phương án xây dựng môi trường thử nghiệm (Sandbox) cho ứng dụng.
   - Giải quyết bài toán Open Banking tại VN: Hướng dẫn tích hợp **VNPay Sandbox** để demo luồng Nạp tiền / Thanh toán. Hỗ trợ cách vượt qua validation URL form đăng ký VNPAY.
   - Đề xuất kiến trúc **Mock MoMo Gateway** (Cổng MoMo giả lập 100% nội bộ) như một phương án dự phòng hoàn hảo để phục vụ bảo vệ đồ án/demo mà không phụ thuộc API bên ngoài.

---
### Session [2026-06-14] - UI Refinement & Unified Dashboard Navigation

**✅ Đã hoàn thành (Compact Procedure):**
1. **Thiết kế lại Giao diện Ngân sách (Budget UI Refinement):**
   - Điều chỉnh lại bố cục hiển thị của `budget-tab.tsx` để tên Ngân sách không bị cắt chữ (truncate), cho phép văn bản tự xuống dòng.
   - Xóa bỏ các nút mũi tên ưu tiên lên/xuống (Up/Down) ít sử dụng để giải phóng không gian chiều ngang, mở rộng khu vực hiển thị Số tiền và Huy hiệu.
2. **Hợp nhất Trang Quản lý Ngân sách vào Dashboard (Unified Navigation):**
   - Xóa bỏ hoàn toàn trang độc lập `financial-center/page.tsx` và nhúng Ngân sách thành một Tab trực tiếp bên trong `app/page.tsx`.
   - Kế thừa thanh Footer điều hướng dùng chung, mang lại trải nghiệm nhất quán (Super-app UX) không đứt gãy.
   - Sửa toàn bộ logic điều hướng `router.push` thành `onNavigate` nội bộ, giải quyết triệt để lỗi 404 Cache của Next.js.
3. **Cập nhật Bảng Phân tích Dòng tiền (Wallet & Breakdown):**
   - Bổ sung 2 trường thông tin "Tôi nợ người khác" (Total Owing) và "Người khác nợ tôi" (Total Owed) vào bảng phân tích trên màn hình Tổng quan.
   - Bóc tách công thức "Đang giữ cho Ngân sách", giúp dòng tiền phân bổ được hiển thị minh bạch và trực quan tuyệt đối.

---

### Session [2026-06-14] - Savings Automation & Virtual Allocation (Current)

**✅ Đã hoàn thành (Compact Procedure):**
1. **Tính toán Tỷ lệ Trích lập An toàn (Safe-to-spend Allocation):**
   - Lập công thức lấy 40% số dư thực tế cho tiết kiệm: `(Tổng ví - Ngân sách chưa chi - Nợ phải trả) * 0.4`.
   - Hiển thị dòng "🌱 Tự động trích Tiết kiệm (40%)" trực tiếp trên Dashboard để trừ đi khỏi số "Có thể tiêu", minh bạch hóa dòng tiền.
2. **Hệ thống Tiết kiệm Mô phỏng Ảo (Virtual Sinking Fund):**
   - Xóa bỏ nút "Nạp ngay" (Manual Fund) và cơ chế chuyển tiền vật lý. Hệ thống giờ đây hoạt động hoàn toàn bằng cách "giữ chỗ" dòng tiền ảo.
   - Bỏ qua hoàn toàn thuộc tính `currentAmount` khổng lồ trong CSDL gốc để hệ thống tính toán tiến độ dựa 100% vào số tiền ảo vừa được trích trong tháng.
   - Sửa lỗi Parse Dữ liệu API (NaN bug) dẫn đến việc hiển thị số dư tiết kiệm là `0đ`.
3. **Thuật toán Phân bổ Tỷ trọng Tương đối (Proportional Weighting Algorithm):**
   - Loại bỏ tỷ lệ phần trăm cứng (50%, 30%, 10%...) gây dư thừa tiền khi không đạt 100%.
   - Áp dụng thuật toán chia tỷ trọng: Tính tổng điểm ưu tiên (`totalWeight`) của các mục tiêu, sau đó phân bổ cạn kiệt số dư tiết kiệm theo tỷ lệ `(weight / totalWeight) * totalSafe`.
   - Cơ chế Overflow thông minh: Nếu mục tiêu vượt mức target, phần dư sẽ tự động chảy xuống các mục tiêu có thứ tự ưu tiên thấp hơn. Đảm bảo chia sạch 100% số tiền nhàn rỗi.

---

### Session [2026-06-13] - Feature Shift: Xóa Bỏ Đầu Tư & Ra Mắt Sổ Vay Nợ Ngoài

**✅ Đã hoàn thành (Compact Procedure):**
1. **Loại bỏ Hoàn toàn Tính năng Tài sản Đầu tư (Assets):**
   - Người dùng phản hồi Cổ phiếu/Bất động sản quá phức tạp và không phù hợp với mục tiêu PFM cá nhân gọn nhẹ.
   - Xóa bỏ toàn bộ Entity `Asset`, Service, Controller, DTO và các UI component rườm rà.
2. **Ra mắt Tính năng "Sổ Vay Nợ Ngoài" (External Loans):**
   - Thay thế bằng tính năng ghi chép các khoản Nợ Ngân Hàng, Nợ Thẻ Tín Dụng, Vay Trả Góp (FE Credit) hoặc cho người ngoài mượn.
   - Thêm các trường dữ liệu thực tế: Số tiền gốc, Lãi suất (%/năm), Ngày bắt đầu, Ngày đáo hạn.
3. **Cập nhật Hệ thống Kế toán Dòng tiền (Net Worth Engine):**
   - Thiết lập công thức Tài sản ròng mới, sát với thực tế 100%: `Ví tiền + Thu nhóm + Cho vay ngoài - Đi vay ngoài - Trả nhóm`.
   - Thiết kế lại Giao diện Trang Tài sản ròng (Ring Chart 5 thành phần) để hiển thị báo cáo dễ hiểu nhất.

---

### Session [2026-06-12] - Database Alignment & User Auth

**✅ Đã hoàn thành (Compact Procedure):**
1. **Đồng bộ hóa 100% Thực thể và Cơ sở dữ liệu:**
   - Xóa bỏ tình trạng bất đồng bộ tên cột giữa mã nguồn Java (`@JoinColumn`, `@Column`) và schema SQL tự sinh.
   - Sửa hàng loạt các lỗi ánh xạ Hibernate: `creator_id` -> `created_by`, `paid_by_id` -> `paid_by`, sửa lại định nghĩa ENUM trong bảng Assets, xử lý logic thiếu hụt `role` của `group_members`.
2. **Khắc phục Cơ chế Xác thực Spring Security:**
   - Script SQL mẫu ban đầu cung cấp chuỗi `hashed_pass_1` khiến BCryptPasswordEncoder ném ngoại lệ khi login.
   - Đã tái cấu trúc toàn bộ nền tảng Seed Data, cấp phát mã Hash chuẩn `$2a$10$...` hợp lệ cho mật khẩu `123456` của toàn bộ các User mẫu. Tính năng đăng nhập (Auth) và Phân quyền đã chạy trơn tru với dữ liệu mẫu.
3. **Cấu trúc lại Mã định danh (UUID):**
   - Rời bỏ các dummy UUID (`0000000-0000...`) để sử dụng chuẩn UUID v4, đảm bảo tính chặt chẽ của CSDL và tránh cảnh báo validation.

---

### Các Session Cũ (03/06/2026 - 12/06/2026) - Đã được gộp (Compacted)
- **Kiểm thử Toàn diện:** Lên kịch bản 100% API (`api_test_plan.md`), test script (`api_tester.js`), test thuật toán Greedy.
- **UI/UX Refinement:** Áp dụng cấu trúc Sticky Header, sửa lỗi gãy viền bo góc, tích hợp biểu đồ Widget tĩnh và động.
- **PFM Expansion:** Phát triển Split Transactions, Recurring Bills, Financial Health Score. Đã fix lỗi Logic sập tính năng Upsert Ngân sách.
- **Tối giản Hệ thống:** Loại bỏ hoàn toàn Giao dịch Định kỳ để tránh cognitive overlap với Ngân sách.
- **Kế toán Dòng tiền (Net Worth Engine):** Hoàn thiện công thức Tài sản ròng bằng Aggregation SQL trực tiếp.
- **Cố vấn Trả nợ:** Thuật toán Snowball & Heavy-weight. Cảnh báo Ngân sách (80% và 100%).
- **Cơ sở Dữ liệu Mẫu:** Nạp `seed_data.sql` khổng lồ chuẩn bị sẵn sàng cho Demo Luận văn.

---

**📊 Trạng thái modules:**

| Module | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| Core API & Business Logic | ✅ Done | Vượt qua 100% End-to-End Test |
| Demo Seed Data | ✅ Done | Sẵn sàng chạy bằng `seed_data.sql` |
| Frontend Build & UI | ✅ Done | Clean UI, 3D CSS Modules, Không lỗi type |
| Backend Stability | ✅ Done | Khắc phục hoàn toàn lỗi sập nguồn |
| UI/UX Consistency | ✅ Done | Giao diện đồng nhất ngôn ngữ Super-app Bobo |

**🚀 Bước tiếp theo (Deployment & Bảo vệ):**
1. Review lại file báo cáo luận văn, nhấn mạnh vào sự chuyển đổi sang hệ thống PFM và Super-app design.
2. Đẩy Database Postgres lên cloud (Supabase/Render/Neon) và nạp `seed_data.sql`.
3. Deploy Backend lên Render (cấu hình biến môi trường kết nối DB cloud).
4. Deploy Frontend lên Vercel. Cấu hình biến môi trường `NEXT_PUBLIC_API_URL` trỏ về domain Render.

**💡 Điểm sáng kỹ thuật (Killer features cho buổi bảo vệ):**
- **Dự báo Dòng tiền 6 Tháng (Cash Flow Forecasting)**
- **Thuật toán Phân bổ dòng thác động (Dynamic Waterfall Spillover)**
- **Thuật toán Tối giản nợ (Greedy Debt Settlement)**
- **Cố vấn Trả nợ Nhóm (Debt Payoff Planner)**
- **Trải nghiệm Super-app (Super-app UX)**

---

## 🤖 [AI PROTOCOL] Hướng dẫn thực thi lệnh "compact procedure"
*Đây là quy trình bắt buộc dành riêng cho trợ lý AI Antigravity.*

Khi người dùng gõ lệnh yêu cầu chạy **"compact procedure"** (ví dụ: `@[antigravity.md] compact procedure`), AI **phải tuân thủ tuyệt đối** các bước sau:

1. **Tổng hợp chi tiết:** Đọc lại log của phiên làm việc (session) hiện tại và tóm tắt đầy đủ những gì đã tiến hành, những quyết định kỹ thuật đã chốt, và những gì sắp phát triển. Không được bỏ sót chi tiết.
2. **Format chuẩn mực:** Trình bày theo định dạng `### Session [YYYY-MM-DD] - [Tên chủ đề chính]` và bao gồm mục `**✅ Đã hoàn thành (Compact Procedure):**` giống cấu trúc của các phiên làm việc trước.
3. **QUY TẮC BẤT DI BẤT DỊCH (CRITICAL RULE):**
   - **CHỈ ĐƯỢC PHÉP VIẾT THÊM (APPEND):** Khi đưa báo cáo vào file `antigravity.md`, tuyệt đối chỉ được chèn nội dung mới (phía trên các session cũ).
   - **KHÔNG ĐƯỢC XÓA HAY VIẾT LẠI:** Tuyệt đối không được dùng lệnh Overwrite xóa đi nội dung cũ rồi viết lại từ đầu. Phải bảo tồn nguyên vẹn 100% nội dung và lịch sử cũ của file `antigravity.md`.
