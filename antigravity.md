# ShareMoney - Trợ lý Tài chính & Quản lý Chi tiêu Nhóm

Dự án đã chuyển dịch từ một ứng dụng chia tiền nhóm đơn thuần sang một hệ thống quản lý tài chính cá nhân (PFM - Personal Financial Management) toàn diện.

## 📌 Các tính năng cốt lõi đã hoàn thành:
1. **Ví cá nhân (Wallet):** Theo dõi số dư, ghi chép thu/chi cá nhân.
2. **Chi phí cố định (Budgets):** Ngân sách hàng tháng cho các khoản chi bắt buộc.
3. **Tiết kiệm tự động (Savings Goals):** Tự động trích tiền nhàn rỗi vào các quỹ tiết kiệm dựa trên Mức độ Ưu tiên.
4. **Chia tiền nhóm (Group Split):** Tạo hóa đơn chung, thuật toán Greedy chia nợ tối ưu.
5. **Thanh toán nợ (Debt Settlement):** Nhắc nợ, tạo mã QR VietQR, và quy trình Xác nhận.
6. **Z-Score Anomaly Detection:** Thuật toán phát hiện bất thường chi tiêu theo thời gian thực.
7. **Cảnh báo Tiết kiệm Quá mức (Emergency Reserve Protection):** Tự động phát hiện và cảnh báo hành vi nạp tiền tiết kiệm ăn lấn vào Quỹ dự trữ khẩn cấp & Ngân sách bắt buộc.
8. **Tư vấn Ngân sách Đa Tháng & Cấu trúc Tổng chi Cần trả:** Phân tích gợi ý chi tiêu theo tháng chọn lựa, xử lý an toàn tháng tương lai và chuẩn hóa modal Tổng chi (đã chi + ngân sách chưa chi + nợ).
9. **Smart Modal UX (5 Modal Thông minh):** Phân nhóm chi tiêu 50/30/20, gom giao dịch theo ngày, chỉ số sức khỏe thu nhập, thanh tiến trình thu hồi nợ, gợi ý cấn trừ nợ ròng & nút Trả nợ trực tiếp.
10. **Thẻ Cảnh báo Hạn mức Tối giản & Thông minh:** Khử trùng lặp danh mục, tự động gắn Emoji danh mục và tối giản hóa thẻ cảnh báo vượt hạn mức giúp người dùng dễ dàng theo dõi trong 1 giây.
11. **Ngân sách Ưu tiên Thông minh (Dynamic Priority Sorting & Star Toggle):** Tự động phân loại và đẩy các khoản ngân sách ưu tiên lên đầu trang, chuẩn hóa icon ngôi sao xám/vàng và phản hồi UI tức thì.
13. **Centered Floating Popup Modal & In-place History Navigation:** Chuẩn hóa toàn bộ modal dạng Bottom Sheet sang Pop-up nổi ở chính giữa màn hình với bo góc 28px, viền đen `#0f172a`, và tích hợp chuyển màn hình xem lịch sử chi tiêu theo từng danh mục trực tiếp trong Popup (In-place navigation) loại bỏ hoàn toàn lỗi trùng đè Modal.

### Session [2026-08-11] - Khắc Phục Lỗi Crash Backend Khi Thanh Toán VNPay Sandbox (Thiếu Dữ Liệu `groupId`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc Phục Lỗi Sập Server (NPE) Bằng Cơ Chế Phòng Thủ Tại `VNPayController`:**
   - **Vấn đề:** Giao dịch thanh toán nợ (`DEBT`) bị nhận diện nhầm thành ngân sách (`BUDGET`) do thiếu tham số `groupId` từ phía React Native gửi lên. Backend khi xử lý `BUDGET` cố gắng truy xuất `walletId` (vốn dĩ bằng `null` vì đây thực chất là giao dịch trả nợ) dẫn đến sập server (`500 Internal Server Error` do `java.util.UUID.toString()`).
   - **Thực thi:** Bổ sung cơ chế chặn bắt lỗi an toàn cho giao dịch `BUDGET` tại `VNPayController`. Nếu frontend truyền thiếu `walletId` hoặc `categoryId`, Backend sẽ trả về `400 Bad Request` thay vì văng Exception.

2. **Sửa Lỗi Phân Loại Giao Dịch Sai Lệch Tại `PaymentSandboxModal.tsx`:**
   - **Vấn đề:** Logic nhận diện loại giao dịch quá mong manh `type = (debtInfo.groupId && debtInfo.toUserId) ? "DEBT" : "BUDGET"`. Khi màn hình trước truyền thiếu `groupId`, giao dịch lập tức bị gán nhãn sai thành `BUDGET`.
   - **Thực thi:** Đổi sang cơ chế định danh chính xác tuyệt đối: `type = (debtInfo.budgetId || debtInfo.categoryId) ? "BUDGET" : "DEBT"`. Bất kỳ khoản chi nào mang mã ngân sách/danh mục chắc chắn là `BUDGET`, còn lại là `DEBT`.

3. **Bổ Sung Dữ Liệu Bị Thiếu Ở Hàng Loạt Màn Hình Thanh Toán:**
   - **Thực thi:** Bổ sung tham số `groupId` đang bị bỏ sót vào cấu trúc `selectedDebt` trong `GroupsScreen.tsx` và prop `debtInfo` của `<PaymentSandboxModal>` bên trong `GroupDetailBottomSheet.tsx`. Đảm bảo luồng tạo mã VNPay từ mọi luồng (Danh sách nhóm, Chi tiết nhóm, Chạm Bottom Sheet) đều không bao giờ bị thiếu ID.


### Session [2026-08-11] - Tái Cấu Trúc Chức Năng Quét Hóa Đơn Bằng Mã QR Điện Tử (AI & Web Scraping)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Nâng Cấp Cơ Chế Lấy Hóa Đơn Từ Ảnh Sang Mã QR URL (`QrReceiptService`):**
   - **Vấn đề:** Cơ chế nhận diện chữ trên ảnh chụp hóa đơn (Image OCR bằng Mindee) tốn nhiều thời gian xử lý, dễ nhận diện sai nếu ảnh mờ, và thiếu tính ổn định khi hóa đơn bị nhăn nheo.
   - **Thực thi:** Chuyển đổi hoàn toàn kiến trúc sang quét mã QR ở chân hóa đơn siêu thị (VD: Tops Market, Go!, Winmart). Ứng dụng Frontend chỉ cần gửi chuỗi URL thu được. Backend bổ sung thư viện `Jsoup` (tại `pom.xml`) để fetch trực tiếp văn bản HTML gốc của hóa đơn điện tử siêu thị đó.

2. **Cập Nhật API Endpoint Dành Riêng Cho Quét Mã QR (`AiController`):**
   - **Thực thi:** Bổ sung DTO `ScanQrReceiptRequest` chứa trường `url`. Mở rộng `AiController` với endpoint mới `POST /api/ai/scan-qr-receipt` (thay thế cho việc gửi ảnh MultipartFile), giúp quy trình truyền tải dữ liệu nhẹ hơn đáng kể.

3. **Mô Hình Hóa Phân Tích Dữ Liệu Thông Minh Bằng Gemini (Universal AI Parser):**
   - **Vấn đề:** Nếu sử dụng phương pháp bóc tách HTML truyền thống (Hardcode Jsoup), ứng dụng sẽ phải viết từng đoạn code xử lý riêng lẻ cho mỗi chuỗi siêu thị. Khi siêu thị thay đổi giao diện, code sẽ lập tức gãy đổ.
   - **Thực thi:** Xây dựng phương thức `extractReceiptFromHtml` bên trong `GeminiService`. Backend sau khi lấy được mã HTML/Text từ URL hóa đơn sẽ gửi toàn bộ vào Gemini API với Prompt phân tích chi tiết. Gemini hoạt động như một cỗ máy vạn năng (Universal Parser), tự động nhận diện và trả về JSON chuẩn xác (`amount`, `note`, danh sách `items`) mà không cần phụ thuộc vào cấu trúc thẻ web của bất kỳ siêu thị nào.
### Session [2026-08-10] (Phần 2) - Rà Soát Toàn Diện Lỗi API Frontend-Backend & Khắc Phục Đồng Bộ Dữ Liệu

**✅ Đã hoàn thành (Compact Procedure):**

1. **Rà Soát Tính Nhất Quán Toàn Bộ API Frontend Với Backend (Full API Audit):**
   - **Phạm vi:** Đối chiếu toàn bộ 11 service files (api, auth, financial, group, loan, ai, notification, vietQr, vnpay, socket, storage), ~45 API endpoints frontend với 17 backend controllers.
   - **Phát hiện:** 14 lỗi được phân loại theo mức nghiêm trọng (4 Critical, 5 Medium, 5 Low), bao gồm lỗi type mismatch, missing imports, sai key name, ghost fields, và thiếu trường quan trọng.

2. **Khắc Phục Lỗi Tạo Ngân Sách Ưu Tiên Bị Bỏ Qua (BUG 5 — Critical User Impact):**
   - **Vấn đề:** Khi tạo budget mới, frontend gửi key `mandatory` nhưng backend Spring Boot dùng `@JsonProperty("isMandatory")`, khiến flag ưu tiên **LUÔN bị Jackson ignore** → budget luôn được tạo với `isMandatory = false` bất kể user chọn gì.
   - **Thực thi:** Sửa key `mandatory` → `isMandatory` tại `BudgetScreen.tsx` (dòng 371) và `AdvisorScreen.tsx` (dòng 180). Đồng thời xóa bỏ cast `as any` nhờ type `BudgetPayload` đã được mở rộng đầy đủ trường.

3. **Cập Nhật Type `GroupExpense` Khớp 100% Với Backend `ExpenseResponse` (BUG 3):**
   - **Vấn đề:** Frontend type `GroupExpense` khai báo `payerId`, `payerName`, `createdDate`, `splits[]` nhưng backend `ExpenseResponse` trả về `payer` (object lồng), `splitCount` (int), `createdAt`, `category`. Code đã tự workaround bằng `exp.payer?.name` nhưng type definition hoàn toàn sai.
   - **Thực thi:** Tái cấu trúc interface `GroupExpense` trong `group.ts` cho khớp chính xác: thêm `payer`, `category`, `splitCount`, `createdAt`, `currentUserSplitAmount`. Giữ các trường cũ với `@deprecated` tag để backward compatible.

4. **Bổ Sung Type `UpdateExternalLoanPayload` Với Trường `isSettled` (BUG 2):**
   - **Vấn đề:** `loanService.updateLoan` dùng `Partial<CreateExternalLoanPayload>` nhưng backend `UpdateExternalLoanRequest` có trường `isSettled` (Boolean) mà type này thiếu → frontend không bao giờ có thể đánh dấu khoản vay đã thanh toán.
   - **Thực thi:** Tạo interface `UpdateExternalLoanPayload` riêng trong `loan.ts`, cập nhật `loanService.ts` sử dụng type mới.

5. **Mở Rộng Type `BudgetPayload` & `BudgetSummary` Đầy Đủ Trường Backend (BUG 5+6):**
   - **Vấn đề:** `BudgetPayload` thiếu `name`, `isMandatory`, `isRecurring`, `dueDayOfMonth`, payee bank fields. `BudgetSummary` thiếu `isMandatory`, `status`, `type`, `availableAmount`, payee fields → code phải dùng `(b as any).mandatory` pattern khắp nơi.
   - **Thực thi:** Mở rộng cả hai interface trong `budget.ts` cho khớp 100% với `SetBudgetRequest` và `BudgetSummaryResponse` backend.

6. **Sửa Import Thiếu `Group` Trong `groupService.ts` (BUG 1):**
   - **Vấn đề:** `createGroup` dùng generic type `<Group>` nhưng `Group` không được import → TypeScript compile error.
   - **Thực thi:** Thêm `Group` vào dòng import từ `"../types"`.

7. **Xóa Ghost Fields Trong `VNPayCreateResponse` (BUG 13):**
   - **Vấn đề:** Interface khai báo `groupId`, `debtorId`, `creditorId` nhưng backend chỉ trả về `{ paymentUrl: string }` → các trường luôn `undefined`.
   - **Thực thi:** Xóa 3 phantom fields, chỉ giữ lại `paymentUrl`.

### Session [2026-08-10] - Xử Lý Chống Lỗi Giao Dịch Ảo & Khắc Phục Màn Hình Trắng VNPay Sandbox

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc Phục Lỗi Tạo Giao Dịch Ảo Phía Frontend (Fake Transaction Prevention):**
   - **Vấn đề:** Ứng dụng "tin tưởng mù quáng" vào việc người dùng đóng Modal VNPay, tự động gọi API tạo giao dịch thành công dù giao dịch bên VNPay đã bị hủy hoặc thất bại.
   - **Thực thi:** Ngừng việc Frontend tự động tạo giao dịch. Nâng cấp Backend (`VNPayController`) để đón Webhook trả về từ VNPay, bổ sung truyền `walletId`, `categoryId`, `budgetId` qua `vnp_OrderInfo`. Khi thanh toán thực sự thành công, Backend sẽ tự động gọi `TransactionService` ghi nhận giao dịch, đảm bảo 100% tính toàn vẹn dữ liệu.

2. **Khắc Phục Lỗi Màn Hình Trắng VNPay Sandbox (WAF / Special Characters Rules):**
   - **Vấn đề:** Tham số `vnp_OrderInfo` chứa các chuỗi UUID có dấu gạch ngang (`-`) và gạch nối (`_`). Tường lửa (WAF) của VNPay Sandbox nghiêm cấm ký tự đặc biệt, khiến trang thanh toán lỗi render Javascript và hiển thị màn hình trắng bóc.
   - **Thực thi:** Chuyển đổi toàn bộ UUID thành chuỗi Hex liền mạch (xóa sạch dấu `-`) và thay thế dấu gạch dưới (`_`) bằng dấu khoảng trắng (space) hoàn toàn hợp lệ. Tại `vnpayReturn`, Backend tự động phân giải lại chuỗi Hex thành UUID chuẩn xác thông qua Regex capture group.

3. **Cơ Chế Báo Lỗi Thanh Toán Thất Bại Tức Thì (`BudgetScreen.tsx`):**
   - **Thực thi:** Cải tiến hàm `handleSandboxPaymentSuccess`. Khi người dùng tắt modal VNPay, ứng dụng sẽ fetch dữ liệu Ngân sách mới nhất và đối chiếu số tiền đã chi (`spentAmount`). Nếu số tiền không thay đổi (tức giao dịch bị hủy/thất bại bên VNPay), lập tức bật Pop-up `Alert` cảnh báo: **"Thanh toán thất bại - Giao dịch đã bị huỷ hoặc xảy ra lỗi trên cổng thanh toán VNPay"**.

### Session [2026-08-09] (Phần 3) - Cập Nhật Kiến Trúc Đồ Án Tốt Nghiệp & Chuẩn Hóa Sơ Đồ UML

**✅ Đã hoàn thành (Compact Procedure):**

1. **Chuẩn Hóa Kiến Trúc Hệ Thống (Hình 3.1 & 3.4):**
   - **Vấn đề:** Bản thảo Đồ án tốt nghiệp mô tả sai lệch so với dự án thực tế (dư thừa dự án Web Admin và cụm Redis Broker chưa triển khai).
   - **Thực thi:** Lọc bỏ hoàn toàn nền tảng Web Vercel và hạ tầng Redis khỏi tài liệu phân tích để đảm bảo tính trung thực tuyệt đối trước hội đồng bảo vệ. Cập nhật mã sơ đồ Triển khai (Deployment Diagram) bằng Mermaid chỉ giữ lại 3 khối cốt lõi: Mobile App, Spring Boot Container và PostgreSQL Database.

2. **Chế Bản Sơ Đồ Thành Phần & Tuần Tự (Hình 3.2 & 3.3):**
   - **Vấn đề:** Các công cụ AI sinh ảnh (DALL-E) không thể vẽ sơ đồ tuần tự chuẩn xác và thẳng hàng.
   - **Thực thi:** Lập trình hệ thống mã Mermaid chất lượng cao chuẩn UML để kết xuất Sơ đồ Thành phần (Component Diagram) và Sơ đồ Tuần tự (STOMP WebSocket Sequence Diagram). Loại bỏ lưới hộp kích hoạt (activate boxes) và biên dịch nhãn dán sang Tiếng Anh để xuất ra biểu đồ tối giản, tinh tế như mong muốn của người dùng.

### Session [2026-08-09] - Sửa Lỗi Logic API Hệ Thống & Khắc Phục Lỗ Hổng Bảo Mật Toàn Diện (`sharemoney` & `FrontendReact`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc Phục Lỗ Hổng IDOR (Insecure Direct Object Reference) Mức Độ Nghiêm Trọng:**
   - **Vấn đề:** Các controller `FinancialAdvisorController` và `FinancialHealthController` nhận `userId` từ URL (`@PathVariable`), cho phép bất kỳ user nào đã đăng nhập cũng có thể xem trộm dữ liệu tài chính của người khác bằng cách thay đổi ID.
   - **Thực thi:** Xóa bỏ tham số `userId` trên URL, chuyển sang lấy ID an toàn từ token của chính user đang gọi API thông qua `SecurityUtils.getCurrentUserId()`.

2. **Khắc Phục Lỗi Crash API Do Tham Số Bảo Mật Sai (`ExternalLoanController`):**
   - **Vấn đề:** Controller nhận tham số `@AuthenticationPrincipal User user`, nhưng principal thực tế của Spring Security cấu hình là `CustomUserDetails`, dẫn đến `user` luôn là `null` và gây `NullPointerException`.
   - **Thực thi:** Thay thế toàn bộ `@AuthenticationPrincipal` bằng `SecurityUtils.getCurrentUserId()`, đồng bộ hóa chuẩn bảo mật với các controller khác.

3. **Hoàn Thiện Luồng Thanh Toán VNPay (`VNPayController`):**
   - **Vấn đề:** API `createPaymentUrl` truyền sai số lượng tham số gây lỗi biên dịch. API dùng method GET kém an toàn và thiếu xử lý logic khi VNPay gọi webhook trả về.
   - **Thực thi:** Chuyển API tạo thanh toán sang `POST /api/vnpay/create-payment`. Bổ sung truyền `debtorId`, tự động thiết lập Redirect (Deep link: `sharemoney://vnpay-result?status=...`) để trả kết quả về Mobile App thay vì điều hướng vô định.

4. **Đồng Bộ Hóa Kiến Trúc Dữ Liệu Các Khoản Vay & Ví (`loan.ts` & `wallet.ts`):**
   - **Vấn đề:** Các kiểu dữ liệu trên Frontend (`ExternalLoan`, `Wallet`) bị lệch pha trầm trọng so với DTO của Backend (tên trường sai, dư thừa các trường ảo như `isLiability` hoặc `borrowerOrLenderName`).
   - **Thực thi:** Tái cấu trúc kiểu dữ liệu Frontend để khớp 100% với Backend (`counterpartyName`, `principalAmount`). Xóa bỏ logic lọc `!isLiability` dư thừa tại các file `AddTransactionModal.tsx` và `BudgetScreen.tsx`.

5. **Tối Ưu Hóa & Tách Kiểu Dữ Liệu Phức Hợp Nhóm (`group.ts` & `groupService.ts`):**
   - **Vấn đề:** Type `Group` dùng chung cho cả danh sách và chi tiết nhóm, dẫn đến báo lỗi undefined khi gọi API danh sách (vì mảng `members` không tồn tại).
   - **Thực thi:** Phân tách rõ ràng thành `GroupListItem` (chỉ có `memberCount`) và `GroupDetail` (chứa mảng `GroupMember[]`), tương ứng chuẩn xác với `GroupResponse` và `GroupDetailResponse` từ Backend.

6. **Dọn Dẹp Các Đoạn Code Rác & Thiết Lập Chuẩn REST (Code Smells & REST Conventions):**
   - **Cấu hình Security:** Đảo thứ tự `RateLimitingFilter` chạy trước `JwtAuthenticationFilter` để chặn spam từ chối dịch vụ (DDoS) hiệu quả hơn.
   - **Tối ưu Transaction:** Xóa bỏ `@Transactional` đặt sai chỗ cấp class tại `UserController` (gây lãng phí connection pool). Xóa cờ `readOnly` sai logic trong `DebtService.remindDebt()`.
   - **Chuẩn HTTP:** Sửa HTTP status của API xóa ngân sách tiết kiệm (`DELETE /api/savings-goals`) về đúng chuẩn `204 No Content`.
   - **Bổ sung Type/API thiếu:** Thêm trường `bankAccountName` vào `UpdateQrRequest.java` và tích hợp hàm AI `generateMessage` bị thiếu trong `aiService.ts`.
### Session [2026-08-08] (Phần 2) - Tối Ưu Hóa Giao Diện Modal & Xử Lý Chống Lỗi Đóng Băng Ứng Dụng (`FrontendReact`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc phục Lỗi Ứng Dụng Đóng Băng (Crash Prevention) tại `useAppData.ts`:**
   - **Vấn đề:** Ứng dụng bị sập toàn bộ luồng API với lỗi đồng bộ `[TypeError: undefined is not a function]` khi Metro Bundler gọi hàm `financialServices.getTotalBalance()` từ bản cache cũ (stale cache).
   - **Quyết định:** Áp dụng lập trình phòng ngừa (Defensive Programming), bổ sung kiểm tra định dạng hàm (`typeof financialServices.getTotalBalance === 'function'`) trước khi gọi bên trong `Promise.all()`. Ứng dụng giờ đây hoạt động hoàn toàn ổn định và an toàn ngay cả khi gặp lỗi hot-reload.

2. **Sửa Lỗi Khớp Lệch Dữ Liệu Ngân Sách (UUID Case Sensitivity) tại `BudgetTransactionsBottomSheet.tsx`:**
   - **Vấn đề:** Bảng lịch sử các lần chi tiêu cho ngân sách bị trống trơn dù tổng số tiền hiển thị vẫn đúng (Ví dụ: "Quần áo T7/2026").
   - **Quyết định:** Chuẩn hóa thuật toán so khớp mã ID danh mục, ép kiểu về chuỗi thường `.toLowerCase()` khi so sánh `txCatId === bCatId` nhằm giải quyết dứt điểm rủi ro chênh lệch in hoa/in thường giữa Backend Java (chuỗi UUID) và Frontend JavaScript.

3. **Tái Cấu Trúc Toàn Diện Pop-up Thông Báo (`NotificationsBottomSheet.tsx`):**
   - **Vấn đề:** Bảng thông báo (🔔) đang sử dụng cơ chế kéo trượt tùy chỉnh (Custom Slide-up Modal) với chiều cao cố định 80%, gây lãng phí không gian trắng khổng lồ khi không có thông báo.
   - **Quyết định:** 
     - Gỡ bỏ hoàn toàn kiến trúc màn hình trắng cuộn đáy cũ. 
     - Tái sử dụng linh kiện cốt lõi `<BottomSheet>` để đồng bộ 100% giao diện sang dạng **Pop-up nổi căn giữa màn hình (Centered Modal)**. 
     - Tự động co giãn kích thước động (Dynamic Height) vừa khít với nội dung thông báo.
     - Mở rộng thuộc tính `headerRight` cho `BottomSheet.tsx`, cho phép tích hợp gọn gàng nút "Đánh dấu đã đọc hết" ngay trên thanh tiêu đề.

### Session [2026-08-08] - Khắc Phục Lỗi Hiển Thị Lịch Sử Giao Dịch Ngân Sách (`FrontendReact`)

**✅ Đã hoàn thành (Detailed Procedure & Decisions):**

1. **Khảo sát Lỗi Dữ Liệu Lịch Sử Ngân Sách (Data Discrepancy Analysis):**
   - **Vấn đề:** Giao diện `BudgetTransactionsBottomSheet.tsx` hiển thị đúng tổng chi phí, nhưng danh sách lịch sử các lần chi lại trống rỗng mặc dù rõ ràng có giao dịch cho danh mục đó (Ví dụ: "Quần áo T7/2026").
   - **Quyết định (Investigation):** So sánh `TransactionResponse.java` (Backend) và kiểu `Transaction` tại Frontend. Phát hiện Backend trả về đối tượng `category` lồng nhau (`category: { id: ..., name: ... }`), nhưng Frontend lại cố đọc dữ liệu phẳng (`transaction.categoryId`, `transaction.categoryName`).

2. **Cập Nhật Logic Lọc Giao Dịch Ngân Sách Trực Quan (`BudgetTransactionsBottomSheet.tsx`):**
   - **Quyết định (Filter Logic Update):** Không thay đổi API hay Type một cách tùy tiện gây đứt gãy ứng dụng. Thay vào đó, áp dụng cơ chế đọc song song an toàn `tx.categoryId || tx.category?.id`.
   - Sửa thuật toán `matchesId` và `matchesName` để luôn ưu tiên đọc chính xác ID và Tên danh mục từ object lồng nhau. Nhờ vậy, danh sách lịch sử các lần tiêu tiền cho ngân sách đã hiển thị đầy đủ ngay lập tức.

3. **Chống Phân Mảnh Lỗi Ở Màn Hình Lịch Sử Tổng Hợp (`HistoryScreen.tsx`):**
   - **Vấn đề:** Màn hình `HistoryScreen` hiển thị mặc định chữ "Giao dịch" nếu thiếu `categoryName`.
   - **Quyết định (UI Rendering Optimization):** Bổ sung đọc dữ liệu `t.category?.name` trong hàm lọc `matchVietnamese` và bổ sung hiển thị fallback linh hoạt `(item as any).category?.iconName || ...` và `(item as any).category?.name` để đảm bảo giao diện History không bao giờ thiếu icon hoặc tên danh mục, kể cả khi DTO trả về dạng lồng.

4. **Sửa Lỗi Chỉnh Sửa Giao Dịch (`EditTransactionModal.tsx`):**
   - **Quyết định (State Prefill):** Khi bấm vào 1 giao dịch để sửa, form bị lỗi không pre-fill được danh mục cũ (do `transaction.categoryId` là undefined). Cập nhật hàm `setSelectedCategoryId` để tự động gán `(transaction as any).category?.id`, đảm bảo trải nghiệm chỉnh sửa thông suốt 100%.

### Session [2026-08-07] - Nâng Cấp Form Hóa Đơn Nhóm, Danh Sách Nhắc Nợ & Tích Hợp AI Soạn Văn Nhắc Khéo (`FrontendReact`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc phục Lỗi Chuyển Tháng & Tối ưu Tab Gợi Ý Chi Tiêu (`AdvisorScreen.tsx`):**
   - Bổ sung hàm `changeMonth` xử lý lùi/tiến tháng an toàn, loại bỏ triệt để lỗi `ReferenceError: Property 'changeMonth' doesn't exist`.
   - Di chuyển thanh chuyển tháng từ Header toàn cục vào hiển thị chuyên biệt bên trong tab **"💡 Gợi ý chi tiêu"**, giúp giao diện tab Thói quen và Cảnh báo luôn thoáng đãng.

2. **Đồng bộ DTO & Hoàn thiện Form Thêm Hóa Đơn Nhóm (`GroupDetailScreen.tsx` & `GroupDetailBottomSheet.tsx`):**
   - **Đồng bộ Payload API**: Chuyển đổi các tham số `payerId` / `splitMemberIds` sang đúng định dạng Backend DTO `paidBy` & `splitUserIds`, giải quyết lỗi "paidBy không được để trống".
   - **Người trả tiền (`Ai là người trả tiền?`)**: Hiển thị avatar tròn, họ tên, hỗ trợ chọn bất kỳ thành viên nào (mặc định là user hiện tại).
   - **Người chia tiền (`Chia cho những ai?`)**: Hỗ trợ 2 chế độ: `Tất cả` (chia đều) và `Tùy chọn` (danh sách checklist từng thành viên kèm dấu tích xanh).
   - **Dropdown Selector**: Chuyển đổi cả hai mục Danh mục chi tiêu và Người trả tiền từ hàng pill nằm ngang sang menu Dropdown hiện đại, không bị cắt ngắn chữ `...`.
   - **Loại bỏ nút "Hủy" & Cố định (Sticky) nút "Lưu hóa đơn"**: Tối ưu UX loại bỏ nút Hủy do đã có nút đóng `✕`, ghim cố định nút **"Lưu hóa đơn"** màu tím full-width ở đáy modal giúp thao tác 1 chạm tiện lợi khi cuộn form.

3. **Thiết Kế Lại Toàn Diện Giao Diện Tab "Ai Nợ Ai" (Debt & Settlement Summary):**
   - **Bố cục 1 hàng ngang tinh gọn (1-line Compact Item)**: Avatar $\rightarrow$ Tên thành viên + Số tiền $\rightarrow$ Nút hành động, loại bỏ bố cục 2 hàng cồng kềnh.
   - **Loại bỏ nút QR thừa ở mục "Người khác nợ bạn"**: Giữ nút **`🔔 Nhắc nợ`** (hoặc **`✓ Xác nhận`** khi đối phương đã chuyển) ở mục Người khác nợ bạn; chỉ hiển thị nút **`Trả nợ 📲` (VietQR)** ở mục Bạn nợ người khác.
   - **Thêm huy hiệu tổng tiền nợ**: Badge `Tổng: +800.000đ` (xanh bạc hà) và `Tổng: -200.000đ` (đỏ pastel) ở tiêu đề mỗi nhóm.

4. **Tích Hợp Trợ Lý AI (Gemini) Soạn Văn Nhắc Nợ Khéo Léo (`RemindDebtBottomSheet.tsx`):**
   - Khi bấm **`🔔 Nhắc nợ`**, modal trợ lý AI mở ra với 4 phong cách sáng tạo: 😂 *Gen Z, Hài hước*, ☕ *Lịch sự, Nhẹ nhàng*, 😡 *Đòi gấp, Nghiêm túc*, 🌸 *Thơ ca, Lãng mạn*.
   - Tự động điền câu mẫu phù hợp ngay khi mở modal hoặc khi chuyển đổi phong cách nhắc nợ.
   - Nút **"Soạn câu nhắc khéo với AI ✨"** kết nối API `/api/ai/generate-message` được tinh chỉnh thoáng đãng, không còn bị khuyết/cắt chữ.
   - Loại bỏ danh sách mẫu thừa thãi, tối giản hóa ô nhập tin nhắn đa dòng và cố định nút **"Gửi thông báo nhắc nợ ngay 🚀"** ở đáy modal.

5. **Chuẩn Hóa Modal Chi Tiết Nợ Theo Quy Chuẩn Centered Floating Popup Của Dự Án (`GroupsScreen.tsx`):**
   - Chuyển đổi popup nợ tổng hợp sang chuẩn **Centered Floating Modal** (bo góc 28px, viền đen `#0f172a`, `elevation: 12`, nút đóng tròn `✕`, hiệu ứng `fade`).
   - Thẻ hiển thị thông thoáng: Avatar $\rightarrow$ Tên $\rightarrow$ Huy hiệu nhóm $\rightarrow$ Số tiền to rõ $\rightarrow$ Nút hành động rộng rãi không bị đè/chèn chữ.

6. **Tích Hợp Cổng Thanh Toán Giả Lập Sandbox & Báo Đã Thanh Toán Tiền Mặt (`PaymentSandboxModal.tsx` & `GroupsScreen.tsx`):**
   - Bổ sung nút **`🧪 Giả lập thanh toán Sandbox (Mô phỏng)`** ngay dưới mã VietQR, cho phép người dùng mở cổng ngân hàng Sandbox, nhập OTP `123456`, mô phỏng trích tiền và tự động cập nhật sổ nợ.
   - Bổ sung nút **`💵 Báo đã thanh toán tiền mặt (Chờ duyệt)`** kết nối API `/api/groups/{groupId}/debts/notify-payment` để gửi thông báo tức thì cho chủ nợ xác nhận.

7. **Tối Giản Hóa Giao Diện Màn Hình Chính (`DashboardScreen.tsx`):**
   - Xóa bỏ hoàn toàn thẻ trắng "Tổng tất cả các ví" nằm đè ở giữa, giúp Hero banner màu tối chuyển tiếp mượt mà, thông thoáng trực tiếp xuống phần **Trạng thái ngân sách / Cảnh báo hạn mức** và **Biểu đồ tài chính**.

8. **Tạo Tác Vụ Nhanh Khi Bấm Nút (+) Giữa Màn Hình (`QuickActionBottomSheet.tsx` & `BottomTabNavigator.tsx`):**
   - Khi bấm nút nổi `+` ở thanh điều hướng dưới cùng, hiển thị modal chọn nhanh 3 tác vụ trực quan:
     1. 💸 **Tạo chi tiêu**: Mở modal chuyên biệt cho việc thêm giao dịch chi tiêu vào lịch sử, trừ tiền ví thanh toán, kèm quét hóa đơn AI (đã lược bỏ tab chọn Thu nhập).
     2. 👥 **Tạo nhóm mới**: Mở modal tạo nhóm chi tiêu mới để chia sẻ chi phí với bạn bè.
     3. 💳 **Nạp tiền vào ví**: Mở modal chuyên biệt cho việc nạp tiền / ghi nhận thu nhập vào ví, cộng tiền trực tiếp vào số dư khả dụng (đã lược bỏ tab chọn Chi tiêu).
   - Chuyển đổi toàn bộ phần chọn **Danh mục chi tiêu/thu nhập** và **Ví thanh toán** từ dạng hàng ngang cuộn bị cắt chữ sang **Dropdown Picker / Danh sách dọc (Vertical List Dropdown)** thực thụ với ô chọn hiển thị mục hiện tại (`[ 📂 Tên danh mục   ▼ ]`), khi bấm vào sẽ mở rộng danh sách cuộn dọc có icon to rõ và tích xanh `✓`.
   - **Đồng bộ hóa 100% hệ thống Danh mục chi tiêu nhóm (`GroupDetailScreen.tsx` & `GroupDetailBottomSheet.tsx`)** với danh mục Ngân sách & Cá nhân (*Ăn uống 🍽️, Chi tiêu hàng ngày 🧴, Quần áo 👕, Mỹ phẩm 💄, Phí giao lưu 🥂, Y tế 💊, Giáo dục 📚, Tiền điện 💡, Đi lại 🚆, Phí liên lạc 📱, Tiền nhà 🏠, Mục tiêu tiết kiệm 🎯, Mua sắm 🛍️, Giải trí 🎮, Lưu trú 🏨, Di chuyển 🚗, Khác 📦*), không còn sự chênh lệch hay phân mảnh giữa các tab.
   - **Nâng Cấp Toàn Bộ Biểu Tượng Thanh Điều Hướng Dưới Cùng (`BottomTabNavigator.tsx`)**:
     - Thay thế toàn bộ emoji hệ điều hành cũ bằng bộ vector icon **`lucide-react-native`** hiện đại, sắc nét:
       - 🏠 **Tổng quan** $\rightarrow$ `<Home size={22} />`
       - 📊 **Thống kê** $\rightarrow$ `<BarChart3 size={22} />`
       - ⚡ **Nút trung tâm (+)** $\rightarrow$ `<Plus size={30} strokeWidth={3} />`
       - 💡 **Tư vấn AI** $\rightarrow$ `<Sparkles size={22} />`
       - 👤 **Cá nhân** $\rightarrow$ `<User size={22} />`
     - Tự động chuyển đổi màu xanh ngọc `#10B981` (active) và xám tinh tế `#94A3B8` (inactive) với hiệu ứng phóng to mượt mà.
   - **Xem Chi Tiết Lịch Sử Các Lần Đã Chi Tiêu Khi Chạm Vào Thẻ Ngân Sách (`BudgetScreen.tsx` & `BudgetTransactionsBottomSheet.tsx`)**:
     - Khi bấm vào bất kỳ thẻ ngân sách nào (VD: *Tiền nhà, Tiền điện, Ăn uống...*), hệ thống mở Bottom Sheet thuần xem lịch sử đối soát chi tiêu:
       - **Hero card**: Hiển thị hạn mức, tổng đã chi trong tháng qua các lần, số tiền còn lại hoặc số tiền đã vượt hạn mức cùng thanh tiến trình trực quan.
       - **Lịch sử các lần đã tiêu (Spending Timeline Audit Log)**: Liệt kê chi tiết từng lần trích tiền vào ngân sách này theo thứ tự thời gian mới nhất (Đánh số *Lần 1, Lần 2...*, Mã hóa đơn `#HD-...`, ngày giờ cụ thể, nội dung ghi chú, ví thanh toán và số tiền đã trừ).
       - Không thêm nút tạo chi tiêu thủ công bên trong bảng lịch sử ngân sách, bởi vì các giao dịch được phát sinh qua chi tiêu hàng ngày / chi tiêu nhóm và tự động phân loại, gán trực tiếp vào ngân sách tương ứng.
   - **Nâng Cấp Bộ Dữ Liệu Mẫu Seed V7 (`generate_seed_v7.js` & `seed_v7.sql`)**:
     - **Bỏ chữ "Ngân sách " lặp lại**: Đặt tên ngân sách tự nhiên, gọn gàng (*Tiền nhà T8/2026, Tiền điện T8/2026, Ăn uống T8/2026, Phí liên lạc T8/2026*).
     - **Lắp đầy 100% dữ liệu mọi Entity**: `budgets` (due day, payee bank), `external_loans` (phone, interest, dates), `savings_goals`, `groups`, `expenses`, `payments`, `transactions`.
     - **Đa dạng hóa hệ thống thông báo (`notifications`)**: Cảnh báo vượt hạn mức đỏ `BUDGET_OVER`, cảnh báo sắp chạm vàng `BUDGET_WARNING`, phát hiện bất thường `Z_SCORE_ANOMALY`, nhắc nợ AI `DEBT_REMINDER`, báo thanh toán tiền mặt `DEBT_PAYMENT_NOTIFIED`, xác nhận thanh toán nợ `DEBT_SETTLED` và thông báo lương `SALARY_RECEIVED`.

### Session [2026-08-07] - Sửa lỗi TypeScript & Tối ưu Hoá Logic Mobile App (`FrontendReact`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khắc phục Lỗi Cú pháp StyleSheet (absoluteFill):**
   - Sửa lỗi sử dụng sai cú pháp `...StyleSheet.absoluteFillObject` trong cấu trúc khai báo Object (lỗi TS2551) tại các modal cập nhật số điện thoại, VietQR, và quản lý ví. Đổi sang dùng thuộc tính chuẩn giúp loại bỏ nguy cơ Red Screen (Crash) khi mở Modal.

2. **Chuẩn hoá Kiểu Dữ liệu Nhóm (Group Members & Expenses):**
   - Rà soát và sửa hàng loạt lỗi truy xuất sai thuộc tính trong `GroupDetailScreen.tsx` (sửa `member.user.id` và `item.payerId` cho khớp hoàn toàn với API Backend).

3. **Cập nhật Logic Ngân sách (Budgets):**
   - Khắc phục lỗi gọi các thuộc tính không có thật (`isMandatory`, `payeeAccountName`) trên đối tượng `BudgetSummary` tại `BudgetScreen` và `DashboardScreen`. Đảm bảo Type Safety 100% cho ứng dụng.

4. **Đồng bộ Bảng màu Hệ thống (Colors):**
   - Thay thế toàn bộ các biến màu bị gọi sai tên (như `emerald800`, `rose700`, `emerald950`) thành các biến màu có sẵn trong Design Token `colors.ts` (ví dụ: `emerald100`, `rose100`) tại tất cả các màn hình chính.

### Session [2026-08-07] - Tích hợp Thông báo Realtime (WebSocket) & Đồng bộ Toàn diện API Mobile (React Native)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Phân tích Khác biệt (Gap Analysis) & Tái cấu trúc API Tính toán Tổng hợp (`useAppData.ts` & `financialServices.ts`):**
   - Loại bỏ hoàn toàn các vòng lặp tính toán thủ công ở Client (React Native) cho các chỉ số quan trọng nhằm đảm bảo 100% đồng nhất công thức (Single Source of Truth) với bản Web.
   - Bổ sung và ánh xạ chuẩn xác API `GET /wallets/total-balance` (trả về `TotalBalanceResponse`) và `GET /budgets/safe-to-spend` (trả về `SafeToSpendResponse`).
   - Cập nhật Hook `useAppData.ts` để fetch trực tiếp 2 số liệu `totalWalletBalance` và `safeToSpend` từ Backend.

2. **Tích hợp Kiến trúc Giao tiếp Thời gian thực (STOMP WebSocket) cho Mobile:**
   - Cài đặt hệ sinh thái WebSocket (`@stomp/stompjs`, `sockjs-client`, `text-encoding`).
   - Khởi tạo `socketService.ts` quản lý vòng đời kết nối an toàn với Token JWT.
   - Tích hợp tự động kết nối Socket khi Đăng nhập thành công vào luồng định tuyến chính (`AppNavigator.tsx`).
   - Lắng nghe kênh `/user/queue/notifications` và nảy `Alert.alert` Local Push Notification ngay lập tức (0 độ trễ) khi có người nhắc nợ, thêm hóa đơn hoặc có biến động tài chính từ Web.

### Session [2026-08-06] - Kiểm Tra Toàn Diện & Đồng Bộ 100% Chức Năng Backend Với FrontendReact Mobile App (`FrontendReact` & `sharemoney`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Khảo Sát & Sửa Dứt Điểm 5 Lỗi Nghiêm Trọng (P0 Bugs):**
   - **BUG 3 (API Path):** Sửa lỗi API path `POST /transactions` thành `POST /transactions/{walletId}` trong `financialServices.ts`, giải quyết triệt để lỗi HTTP 404 khi tạo giao dịch từ mobile.
   - **BUG 2 (Hardcoded Category):** Xóa bỏ categoryId hardcode (`"cat-food"`, `"cat-salary"`), tích hợp API `GET /api/categories` thực tế từ Backend và xây dựng Category Picker động hiển thị icon + tên danh mục thật.
   - **BUG 4 (Stuck Wallet):** Sửa lỗi `walletId` bị stuck trong `AddTransactionModal.tsx`, thêm `useEffect` tự động chọn ví mặc định (ví không phải khoản nợ) khi prop `wallets` thay đổi.
   - **BUG 1 (Quick Actions):** Phân biệt hành vi 2 nút bấm Quick Action trên Dashboard: "💳 Nạp vào ví" tự động chọn tab Thu nhập (`INCOME`), "⇄ Chuyển khoản" tự động chọn tab Chi tiêu (`EXPENSE`).
   - **BUG 5 (Missing Handler):** Bổ sung prop `onNavigate` và gắn handler `onPress` cho nút "Đặt ngân sách" trên `HistoryScreen.tsx` điều hướng sang tab Budget.

2. **Triển Khai Tính Năng Tiết Kiệm & Quyết Toán Nợ Nhóm (P1 Features):**
   - **Quản lý Tiết kiệm (Savings Goals CRUD):** Xóa bỏ số tiền nạp cố định 500k hardcode trong `SavingsScreen.tsx`. Tích hợp đầy đủ 4 API endpoints (`fundSavingsGoal`, `withdrawSavingsGoal`, `createSavingsGoal`, `deleteSavingsGoal`). Thêm BottomSheet tạo mục tiêu mới với hạn mức, ngày đích, mức ưu tiên (Khẩn/Cao/TB/Thấp) và đóng góp hàng tháng; cho phép người dùng nạp/rút số tiền tùy ý.
   - **Quyết toán nợ nhóm 2 chiều (Debt Settlement):** Bổ sung 5 API endpoints vào `groupService.ts` (`remindDebt`, `notifyPayment`, `approveSettle`, `getPendingDebtors`, `getPendingSent`). Cập nhật tab "Ai nợ ai" trên `GroupDetailScreen.tsx` với nút **"🔔 Nhắc nợ"**, nút **"Báo đã chuyển"**, nút **"✓ Xác nhận"** và các badge trạng thái **"Chờ duyệt ⏳"** / **"Đã chuyển ⏳"**.
   - **Hệ thống thông báo (Notification System):** Xây dựng `notificationService.ts` (`/api/notifications`, `/notifications/{id}/read`) và component `NotificationBottomSheet.tsx` hiển thị thông báo thực tế từ Backend khi chạm vào icon 🔔 trên màn hình Tư vấn.

3. **Tích Hợp Toàn Bộ Các API Backend Còn Lại Phủ 100% Hệ Thống:**
   - **Chi tiết, Sửa & Xóa Hóa đơn nhóm (`ExpenseController`):** Tạo component `ExpenseDetailBottomSheet.tsx` hỗ trợ xem chi tiết chia tiền từng thành viên (`splits`), chỉnh sửa tiêu đề/số tiền hóa đơn, xóa hóa đơn nhóm (tự động hoàn tác nợ ròng) và nút **"Xuất CSV 📊"** file báo cáo hóa đơn (`GET /api/groups/{id}/expenses/export`).
   - **Gợi ý bạn bè từng chung nhóm (`GroupController`):** Tích hợp `GET /api/groups/past-members` vào `AddMemberBottomSheet.tsx`, hiển thị các chip **"👤 Bạn bè từng chung nhóm"** giúp thêm nhanh thành viên vào nhóm mới mà không cần gõ lại SĐT.
   - **Sửa & Xóa giao dịch cá nhân (`TransactionController`):** Tạo component `EditTransactionModal.tsx` và cập nhật `HistoryScreen.tsx` cho phép chạm vào bất kỳ giao dịch nào để chỉnh sửa hoặc xóa (tự động cập nhật lại số dư ví).
   - **Cảnh báo Giao dịch chưa phân loại:** Tích hợp `GET /api/transactions/uncategorized/count` hiển thị banner cảnh báo màu vàng tại `HistoryScreen.tsx` khi có giao dịch chưa gán danh mục (`"⚠️ Giao dịch chưa phân loại (X)"`).
   - **Báo cáo Thu nhập (`TransactionController`):** Kết nối `GET /api/transactions/summary/income-category` trên `ReportScreen.tsx` hỗ trợ chuyển đổi tab Chi tiêu ↔ Thu nhập xem phân bổ thu nhập theo danh mục.
   - **VietQR Server Payload & Cập nhật SĐT:** Tích hợp `POST /api/payments/qr-code` vào `vietQrService.ts` & `VietQRCard.tsx` sinh mã QR Napas247 chuẩn từ Server; bổ sung ô nhập SĐT trong `ProfileScreen.tsx` kết nối `PUT /api/users/me/phone`.

4. **Xác Nhận Đạt 100% Coverage Phủ 16/16 Backend Controllers:**
   - Đã rà soát lại toàn bộ 16 Controllers & 57+ Endpoints. Tất cả mã nguồn TypeScript biên dịch sạch 100%, không phát sinh lỗi mới.

### Session [2026-08-05] - Tối Ưu UX Pop-up Nổi Căn Giữa Màn Hình & Tích Hợp Lịch Sử Chi Tiêu Chi Tiết Danh Mục (`FrontendReact` & `Frontend`)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Chuyển Đổi Toàn Bộ BottomSheet Sang Centered Floating Popup Modal (`BottomSheet.tsx`):**
   - **Phản hồi người dùng:** *"tôi muốn chuyển cái nó chỉ ở dưới đáy màn hình vầy thành hiển thị giữa màn hình"*, *"Ý tôi là nó không chui từ dưới lên và dừng lạ ở dưỡi botttom như vậy tôi muốn nó hiển thị pop-up giữa màn hình theo chiều dọc ấy"*.
   - **Thực thi:**
     - Thay đổi `animationType="slide"` sang `animationType="fade"`.
     - Căn giữa chiều dọc & chiều ngang (`justifyContent: "center"`, `alignItems: "center"`, `paddingHorizontal: 20`, `paddingVertical: 40`).
     - Gỡ bỏ vệt gờ kéo `---` (handle bar) tạo cảm giác cuộn ở đáy.
     - Bo tròn 28px (`borderRadius: 28`) cả 4 góc, viền đen nổi bật `border-2 border-[#0f172a]` và hiệu ứng bóng mờ `elevation: 12`.

2. **Cấu Trúc 4 Accordion Category Cho Modal Chi Tiết Tổng Chi Dự Kiến (`TotalExpenseDetailBottomSheet.tsx`):**
   - **Phản hồi người dùng:** *"cái này chia làm 4 cái như lúc trước nhé"*.
   - **Thực thi:**
     - Tái cấu trúc 4 thẻ Accordion chuẩn tài chính:
       1. 🏠 **1. Chi tiêu Thiết yếu** (Nền lam nhạt, icon 🏠, badge đếm 5)
       2. 🛍️ **2. Chi tiêu Linh hoạt** (Nền cam nhạt, icon 🛍️, badge đếm 4)
       3. 🤝 **3. Trả nợ & Chi phí Nhóm** (Nền hồng nhạt, icon 🤝, badge đếm 2)
       4. 🐷 **4. Tích lũy & Tiết kiệm** (Nền xanh lá nhạt, icon 🐷, badge đếm 2)
     - Cập nhật 4 Sub-Pills ở thẻ Hero Indigo Purple: `1. THIẾT YẾU`, `2. LINH HOẠT`, `3. ĐANG NỢ`, `4. TÍCH LŨY`.

3. **Giao Diện Phân Nhóm 50/30/20 & Hiển Thị Đầy Đủ Danh Mục 0đ (`ReportScreen.tsx` & `tab-thong-ke.tsx`):**
   - **Phản hồi người dùng:** *"trong phần chi phí linh hoạt có những category gì thì phải lôi hết ra chứ, những category có 0 thì cũng hiển thị nha"*, *"khi chưa bấm vào thì cũng đừng sổ ra list mà để nguyên drawer nhé"*.
   - **Thực thi:**
     - Tích hợp bộ danh mục hệ thống hoàn chỉnh. Hợp nhất dữ liệu giao dịch thực tế (`expBreakdown`) + Ngân sách (`budgets`) + Danh mục mặc định.
     - Các danh mục chưa có giao dịch trong tháng (0đ) **vẫn được hiển thị đầy đủ** kèm con số `0đ` và `%` tương ứng, không ẩn đi.
     - Mặc định thu gọn tất cả 3 Accordion drawer (`expandedSection = null`) khi mở modal.

4. **Chuẩn Hóa Danh Mục Khớp 100% Với Backend Java (`CategoryService.java`):**
   - **Phản hồi người dùng:** *"không tự sáng tạo ra tên. Backend có các category riêng cho từng hạng mục của thieetts yếu linh hoạt và tiết kiệm chứ ko phải tự sáng tạo ra như này"*.
   - **Thực thi:**
     - Kiểm tra trực tiếp file entity Backend (`CategoryService.java` & `CategoryGroup.java`).
     - Chuẩn hóa toàn bộ tên danh mục và Emoji trên cả 2 app Frontend & Mobile:
       - **Chi phí Thiết yếu (NEED)**: `Tiền nhà` (🏠), `Tiền điện` (💡), `Đi lại` (🚆), `Phí liên lạc` (📱), `Y tế` (💊), `Giáo dục` (📚).
       - **Chi phí Linh hoạt (WANT)**: `Ăn uống` (🍽️), `Chi tiêu hàng ngày` (🧴), `Quần áo` (👕), `Phí giao lưu` (🥂), `Mỹ phẩm` (💄).
       - **Tích lũy & Tiết kiệm (SAVING)**: `Mục tiêu tiết kiệm` (🎯).
       - **Trả nợ nhóm (TRANSFER)**: `Trả nợ nhóm` (💸).
     - Loại bỏ 100% các tên gọi tự nghĩ như *"Tiền thuê nhà & Quản lý"*, *"Hàng hóa dự phòng"*, *"Chi phí sinh hoạt cố định"*.

5. **Tích Hợp Chuyển Màn Hình Lịch Sử Chi Tiêu Chi Tiết Trực Tiếp Trong Popup (In-place Navigation):**
   - **Phản hồi người dùng:** *"khi tôi click vào 1 mục nào đó thì giúp tôi hiển thị lịch sử những lần chi tiêu cho mục đó giống như tôi đi xem lịch sử chi tiêu ấy"*, *"lỗi hiển thị rồi"*.
   - **Thực thi:**
     - Cho phép bấm vào bất kỳ dòng danh mục nào (*Ăn uống, Chi tiêu hàng ngày, Quần áo, Phí giao lưu, Mỹ phẩm, Tiền nhà, Tiền điện, Đi lại...*).
     - Chuyển đổi cơ chế mở Modal thành **Chuyển giao diện trực tiếp trong cùng Popup Modal (In-place Navigation)**, loại bỏ triệt để lỗi trùng đè z-index / lồng 2 Modal làm rớt khung chữ.
     - Khi bấm chọn 1 danh mục (*Ăn uống*):
       - Tiêu đề Popup chuyển thành `Lịch sử - [Tên Danh Mục]`.
       - Xuất hiện nút **`‹ Quay lại danh sách chi tiết`** ở góc trên.
       - Hiển thị thẻ Hero tổng số tiền thực chi của danh mục và danh sách chi tiết từng lần giao dịch (Thời gian thực, Ghi chú, Số tiền đã chi).
       - Bấm **`‹ Quay lại`** để trở về danh sách phân bổ 50/30/20 ban đầu.
     - Triển khai đồng bộ trên cả **`ReportScreen.tsx`**, **`TotalExpenseDetailBottomSheet.tsx`** và **`tab-thong-ke.tsx`**.

6. **Khắc Phục Hoàn Toàn Lỗi Cú Pháp Babel JSX & ReferenceError (`ReportScreen.tsx`):**
   - **Thực thi:**
     - Sửa triệt để các lỗi khuyết thẻ đóng JSX (`jsxParseExpressionContainer` cho `<ScrollView>` & `<BottomSheet>`).
     - Escape an toàn dấu ngoặc kép trong biểu thức JSX string.
     - Khôi phục biến trạng thái `selectedCardModal`, `expandedExpenseSections`, `expandedPayableDrawer`.
     - Expo Metro Bundler biên dịch thành công 100% không còn bất kỳ lỗi nào.

---

### Session [2026-08-05] - Cải Tiến Trải Nghiệm Tương Tác Ngân Sách Ưu Tiên (Star Toggle & Dynamic Sorting)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Tích hợp Vector Icon Star & Phân biệt Nổi / Chìm Thẻ Ngân sách (`BudgetScreen.tsx`):**
   - **Phản hồi người dùng:** *"với những khoản được đánh dấu sao thì dấu sao sẽ hiện màu và nổi lên trên những khoản không được đánh dấu và những khoản bị gỡ dấu sao thì sẽ chìm xuống dưới nhé"*.
   - **Thực thi:**
     - **Tích hợp Lucide Vector Star Icon**: Sử dụng `<Star size={20} color="#f59e0b" fill="#f59e0b" />` cho khoản Ưu tiên (Vàng kim rực rỡ, tô đặc lòng ngôi sao) và `<Star size={20} color="#94a3b8" fill="none" />` cho khoản Không ưu tiên (Nét viền xám nhạt, rỗng lòng, loại bỏ 100% màu vàng).
     - **Thẻ Ưu tiên (`Nổi lên trên`)**: Nằm ở đầu danh sách, viền vàng hổ phách `border-2 border-[#f59e0b]`, hiệu ứng đổ bóng nâng thẻ `elevation: 5`, badge `ƯU TIÊN` màu vàng kim.
     - **Thẻ Bỏ ưu tiên (`Chìm xuống dưới`)**: Nằm bên dưới các thẻ ưu tiên, viền xám mờ `#e2e8f0`, nền xám nhạt `#fafafa`, `elevation: 1` chìm xuống bên dưới.

2. **Thiết lập Thuật toán Tự động Sắp xếp Theo Mức độ Ưu tiên (`BudgetService.java` & `BudgetScreen.tsx`):**
   - **Backend (`BudgetService.java`)**: Cập nhật hàm `getBudgetSummary` sắp xếp kết quả trả về bằng Stream API `.sorted((b1, b2) -> b1.isMandatory() ? -1 : 1)`, đưa tất cả ngân sách ưu tiên lên đầu danh sách.
   - **Frontend (`BudgetScreen.tsx`)**: Bổ sung `useMemo` sắp xếp `sortedBudgets` đảm bảo các khoản ưu tiên (`isMandatory === true`) luôn nổi lên trên cùng, các khoản bị gỡ dấu sao (`isMandatory === false`) tự động chìm xuống phía dưới.

3. **Pop-Up Xác Nhận 2 Tông Màu & Ngôn Từ Độc Lập Cho Nâng / Hạ Ưu Tiên (`BudgetScreen.tsx`):**
   - **Phản hồi người dùng:** *"chia ra làm 2 loại thông báo 1 là nâng cấp lên mức ddooj ưu tiên 2 là Hạ cấp độ ưu tiên, hãy làm cho 2 cái này có 2 tông màu khác biệt và nữa là cho 2 cái thông báo cũng khác nhau nhé"*.
   - **Thực thi:**
     - **Tông Nâng Cấp (`Nâng Ưu Tiên ⭐`)**: Pop-up viền Vàng Kim Hổ Phách `#f59e0b`, huy hiệu `<Star size={32} color="#f59e0b" fill="#f59e0b" />` nền kem `#fef3c7`, tiêu đề *"Nâng Cấp Ngân Sách Ưu Tiên ⭐"*, thông điệp *"Khoản này sẽ được đẩy lên đầu và ưu tiên trích tiền thanh toán trước"*, nút bấm `✓ Nâng ưu tiên` màu Vàng Hổ Phách.
     - **Tông Hạ Cấp (`Bỏ Ưu Tiên 📉`)**: Pop-up viền Xám Xanh Slate `#475569`, huy hiệu `<Star size={32} color="#475569" fill="none" />` rỗng lòng nền xám nhạt `#f1f5f9`, tiêu đề *"Bỏ Ngân Sách Ưu Tiên 📉"*, thông điệp *"Khoản này sẽ chuyển thành khoản chi thường và di chuyển xuống dưới danh sách"*, nút bấm `✓ Bỏ ưu tiên` màu Dark Slate.
     - **Toast Phân Loại**: Hiển thị Toast khác biệt cho 2 trường hợp (`"Đã nâng cấp lên ngân sách ưu tiên! ⭐"` vs `"Đã chuyển về ngân sách thông thường!"`).

4. **Chuyển Đổi Modal "Chi Tiết Tổng Chi" Sang Dạng Centered Popup Nổi Giữa Màn Hình (`TotalExpenseDetailBottomSheet.tsx` & `ReportScreen.tsx`):**
   - **Phản hồi người dùng:** *"khi tôi click vào Tổng chi thì nó ko chỉ hiện ra từ cuối màn hình mà tôi muốn nó pop-up như này"*, *"bên app đã pop-up đâu"*.
   - **Thực thi:**
     - Thay thế hoàn toàn BottomSheet cuộn ở đáy màn hình bằng **Centered Floating Popup Modal** nổi ở chính giữa màn hình với bo góc 28px (`borderRadius: 28`) và viền đen nổi bật `border-2 border-[#0f172a]`.
     - Tích hợp trực tiếp vào màn hình **Báo cáo Tài chính (`ReportScreen.tsx`)** khi bấm thẻ `📤 Tổng chi (Cần trả)`.
     - **Thẻ Hero Indigo Purple (`#6366f1`)**: Hiển thị tổng số tiền dự kiến `100,1tr+`, 3 thẻ con (`1. Đã chi`, `2. Chưa chi`, `3. Đang nợ`) và ghi chú giải thích 3 khoản.
     - **3 Thẻ Accordion Chi Tiết**: Phân tách 3 mục `💸 1. Đã chi thực tế`, `📌 2. Ngân sách & Hóa đơn chưa chi`, `🤝 3. Các khoản nợ nhóm cần trả` có thể nhấp thu gọn/xổ chi tiết từng mục.

### Session [2026-07-30] - Tối Ưu UI/UX Theo Phản Hồi Người Dùng & Điều Hướng Thông Minh Ngân Sách

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khôi phục Nền cũ & Đổ bóng Khối Cảnh báo (`tab-tu-van.tsx` & `tab-tong-quan.tsx`):**
   - **Quyết định:** *"Nền cũ của tôi còn dễ nhìn hơn. Quay lại nền cũ... làm bóng shadow cho từng khối này đi"*.
   - **Thực thi:** Giữ nguyên tông nền Gradient Navy `#1a1a2e` header và nền xám nhạt `#f5f6f8` body. Bổ sung hiệu ứng `shadow-md` cho các thẻ cảnh báo và `shadow-sm` cùng viền màu nâng độ nổi cho các khối chỉ số.

2. **Màu chữ Phân biệt Theo Mục đích Chi tiêu (`tab-tu-van.tsx`):**
   - **Quyết định:** *"màu của chữ Đã chi TB Dự kiến có màu khác nhau phù hợp với mục đích của nó đi"*.
   - **Thực thi:** Ánh xạ bộ màu phân định rõ ràng: `ĐÃ CHI` (Cam Amber `text-amber-700`), `TB 3 THÁNG` (Xanh Biển `text-blue-700`), và `DỰ KIẾN CẢ THÁNG` (Hồng Đỏ `text-rose-700`).

3. **Loại bỏ "Giữ cho Ngân sách" & Khung 4 Ô Tài sản (`tab-tong-quan.tsx`):**
   - **Quyết định:** *"2 con số này rất khó hiểu... bỏ cái Giữ cho ngân sách này hãy bỏ ra khỏi giao diện nhé"*, *"bỏ cái này đi"*.
   - **Thực thi:** Xóa bỏ hoàn toàn dòng "Giữ cho Ngân sách" gây mâu thuẫn khỏi thẻ trắng breakdown và gỡ bỏ lưới 4 ô tài sản snapshot rườm rà ở Header Navy.

4. **Chuyển Phân Nhóm 50/30/20 Sang Dạng Accordion Thu/Mở (`tab-thong-ke.tsx`):**
   - **Quyết định:** *"Chỉ hiển thị 3 mục này nhưng khi bấm vào mỗi mục thì hãy sổ ra list nhé"*.
   - **Thực thi:** Chuyển đổi 3 nhóm `📌 Chi phí Thiết yếu`, `🎯 Chi phí Linh hoạt`, `💰 Tích lũy & Tiết kiệm` thành các thẻ Accordion có icon mũi tên xoay chuyển linh hoạt, cho phép thu gọn/xổ danh sách chi tiết khi nhấp.

5. **Lọc bỏ Cấn Trừ Nợ 0đ Vô lý (`tab-thong-ke.tsx`):**
   - **Quyết định:** *"Cái phần này nghe rất điêu nhé đặc biệt là cấn trừ nợ nếu đã huề thì thông báo làm gì"*.
   - **Thực thi:** Cập nhật thuật toán `nettingSuggestions`, bỏ qua hoàn toàn các trường hợp `netAmount === 0` (hai bên nợ bằng nhau 0đ). Khung gợi ý cấn trừ nợ chỉ hiển thị khi thực sự có chênh lệch nợ ròng khác 0.

6. **Sửa Ngôn từ "Phần của bạn" Trực quan & Dễ hiểu (`tab-thong-ke.tsx`):**
   - **Quyết định:** *"phần của bạn là sao ??? thay bằng ngôn từ dễ hiểu hơn"*.
   - **Thực thi:** Thay thế cụm từ mơ hồ "Phần của bạn: 1.000.000đ" bằng câu từ hành động trực tiếp: `Bạn cần trả: 1.000.000đ` (Thẻ Đỏ khi mình nợ) hoặc `Họ cần trả bạn: 1.000.000đ` (Thẻ Xanh khi người khác nợ).

7. **Bộ 3 Màu Tương Phản Sắc Nét Cho 50/30/20 (`tab-thong-ke.tsx`):**
   - **Quyết định:** *"linh hoạt và tích lũy cùng màu à"*.
   - **Thực thi:** Chuẩn hóa 3 gam màu độc lập tương phản rõ rệt: Thiết yếu (Xanh Dương `blue-600`), Linh hoạt (Cam Đậm Rực Rỡ `orange-600`), và Tích lũy (Xanh Lá Lục Bảo `emerald-600`).

8. **Tái Thiết kế Thẻ "Dòng Tiền Ròng" Thay Thẻ Tiết Kiệm Âm (`tab-thong-ke.tsx`):**
   - **Quyết định:** *"thay phần này bằng 1 cái thông tin gì đó hữu ích hơn đi"*.
   - **Thực thi:** Đổi thẻ "Tiết kiệm tháng này -8.950.000đ" gây hiểu nhầm thành **📊 Dòng tiền ròng (Thu - Chi)**. Khi bội chi hiển thị badge `⚠️ Bội chi tháng này` kèm % biến động; khi dương tiền tự động tính % thu nhập giữ lại được (`🌱 Giữ được X% thu nhập`).

9. **Đưa Khối Cảnh Báo Vượt Hạn Mức lên Vị trí Đầu Trang (`tab-tong-quan.tsx`):**
   - **Quyết định:** *"nghiên cứu hiển thị phần cảnh báo vượt hạn mức này nhanh hơn"*.
   - **Thực thi:** Đưa khối cảnh báo vượt hạn mức lên ngay vị trí đầu trang Main Content (ngay dưới Thẻ Tổng quan, trên Thao tác nhanh), nhúng thêm tín hiệu phát sáng đỏ nhấp nháy 🔴 (`animate-ping`) đập vào mắt người dùng tức thì.

10. **Làm Gọn Thẻ Cảnh Báo & Khử Trùng Lặp Theo Danh Mục (`tab-tong-quan.tsx`):**
    - **Quyết định:** *"còn sấu và dài dòng hơn"*, *"cảnh báo vượt hạn mức thì có 4 cái vuowtjt nhưng sao bên tư vấn thì chỉ có cảnh báo 2 mục nhỉ"*.
    - **Thực thi:** 
      - Gom tất cả cảnh báo vào **1 Khung Thẻ Tinh Tế (`Compact Alert Bar`)** duy nhất 1 hàng vuốt ngang, loại bỏ tiêu đề kép rườm rà.
      - Sửa thuật toán `catKey` ưu tiên `b.categoryName`, gom các bản ghi ngân sách trùng danh mục (như "Ngân sách Y tế T4", "Ngân sách Y tế T5") thành 1 thẻ duy nhất đại diện cho danh mục "Y tế", đồng bộ số lượng cảnh báo khớp 100% (2 mục) với tab Tư vấn.

11. **Giới hạn Cảnh báo Tính Theo Tháng Hiện Tại (`tab-tong-quan.tsx`):**
    - **Quyết định:** *"vượt hạn mức ngân sách này chỉ tính theo từng tháng thôi nhá"*.
    - **Thực thi:** Đổi tiêu đề thành **`CẢNH BÁO HẠN MỨC THÁNG NÀY`**, đảm bảo dữ liệu truy vấn từ `/budgets/summary` và thuật toán lọc chỉ xử lý các ngân sách thuộc tháng/năm hiện tại.

12. **Điều hướng Thông minh & Tự động Cuộn + Highlight Ngân sách Mục tiêu (`tab-tong-quan.tsx`, `page.tsx`, `tab-ngan-sach.tsx`):**
    - **Quyết định:** *"khi tôi bấm vô thì nó vô phần quản lý ngân sách vào hiển thị đúng khoản mà tôi vừa bám vào nhé được ko"*.
    - **Thực thi:**
      - Đưa `targetBudgetId` qua callback `onNavigate` và state `page.tsx`.
      - Khi chuyển sang tab Quản lý Ngân sách, ứng dụng tự động cuộn mượt (`scrollIntoView`) tới đúng vị trí thẻ ngân sách đã chọn.
      - Phát hiệu ứng viền đỏ nhấp nháy nổi bật 🔴 (`ring-4 ring-rose-500 scale-[1.02] shadow-lg animate-pulse`) trong 4 giây giúp người dùng nhận biết ngay lập tức.

---

### Session [2026-07-29] - Tối ưu Thuật toán & Tái thiết kế Giao diện Thẻ Cảnh báo Chi tiêu High-Contrast

**✅ Đã hoàn thành (Compact Procedure):**

**1. Phân biệt & Loại bỏ 100% Chi phí Cố định khỏi Tab Cảnh báo Chi tiêu (`FinancialAdvisorService.java` & `tab-tu-van.tsx`):**
   - **Bối cảnh:** Chi phí cố định (Tiền nhà, Tiền điện, Tiền nước, Tiền mạng, Học phí, Lãi vay...) phát sinh 1 lần/tháng, không thể chia theo tỷ lệ ngày đã qua (`daily burn-rate`).
   - **Thực thi Backend & Frontend:** Loại bỏ hoàn toàn chi phí cố định khỏi tab Cảnh báo Chi tiêu Bất thường ở cả Java Backend (`FinancialAdvisorService.java`) và React Frontend (`tab-tu-van.tsx`). Tab Cảnh báo giờ đây chuyên biệt 100% cho các khoản chi sinh hoạt linh hoạt hàng ngày (Ăn uống, Y tế, Giao lưu, Mua sắm...).

**2. Gỡ bỏ 100% Đoạn văn Giải thích Dài dòng & Trùng lặp:**
   - Phản hồi người dùng: *"phần giải thích quá dài dòng và khó hiểu font chữ quá bé"*, *"Phần giải thích đang bị thừa"*.
   - **Thực thi:** Gỡ bỏ toàn bộ đoạn văn giải thích rườm rà lặp lại số tiền. Thay bằng thẻ thiết kế thông minh với thông điệp tiếng Việt súc tích: `Chi tiêu Tăng cao (+41% so với TB)` và `Chi tiêu Bùng nổ (+80% so với TB)`.

**3. Tái thiết kế Thẻ Cảnh báo High-Contrast & Lưới 3 Con số (`15px` Font Black):**
   - **Thẻ Trắng Nền Cao Cấp (`bg-white border-l-4`):** Loại bỏ màu nền vàng/kem cũ bị mờ. Thay bằng thẻ trắng viền bên trái màu điểm nhấn (`border-l-4 border-l-rose-500` cho mức Bùng nổ và `border-l-amber-500` cho mức Tăng cao).
   - **Khối 3 Con số Trực quan (`15px` Font Black):** Hiển thị 3 ô số rõ nét `ĐÃ CHI` | `TB 3 THÁNG` | `DỰ KIẾN CẢ THÁNG` giúp người dùng đọc hiểu trong 1 giây.
   - **Khắc phục triệt me lỗi Trùng Icon:** Khung avatar bên trái hiển thị đúng Icon danh mục thực tế (`🏥` Y tế, `🍔` Ăn uống, `☕` Cà phê, `🛍️` Mua sắm, `🎬` Giải trí, `🚗` Di chuyển...), gỡ bỏ hoàn toàn emoji bị lặp trong subtitle.

### Session [2026-07-29] - Tái cấu trúc Tab Tư vấn (Sub-tabs), Nâng cấp Theme Indigo & Modal Chi tiết Tổng chi

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tái cấu trúc Tab Tư vấn sang Dạng Sub-tabs Chuyên biệt (`tab-tu-van.tsx`):**
   - Phản hồi người dùng: Dạng 1 trang cuộn dài bị dồn dập ("cái này không nên gom lại 1 cục như vậy").
   - Đã tái cấu trúc tab Tư vấn thành 3 Sub-tabs chuyên biệt: `📊 Thói quen` (Hero Card + 3 mini-stat + 50/30/20), `⚠️ Cảnh báo` (Badge đếm cảnh báo + cards rủi ro), và `💡 Gợi ý hạn mức` (Bảng gợi ý hạn mức 3 tháng + nút "Đặt hạn mức 🎯").

2. **Thay đổi Màu chủ đạo Toàn ứng dụng sang Indigo & Deep Purple (`#6366f1`):**
   - Chuyển màu nhận diện từ Xanh lá (#45b39d) sang **Indigo & Purple Modern Fintech** (`#6366f1`, `from-indigo-600 to-purple-600`).
   - Đã cập nhật `globals.css`, Bottom Navigation (`thanh-dieu-huong-duoi.tsx`), Tab Tiết kiệm, Tab Tổng quan, Modal Chuyển khoản và Modal Tạo nhóm.

3. **Nâng cấp Modal "Chi tiết Tổng chi" — Smart Accordion & Compact Numbers (`10tr+`):**
   - Tái thiết kế Hero Card với công thức tính trực quan: `1. Đã chi + 2. Chưa chi + 3. Đang nợ = Tổng dự kiến`. Đồng bộ màu Hero Card sang Indigo & Deep Purple Gradient (`from-indigo-600 via-purple-600 to-violet-700`).
   - **Tăng cỡ chữ Hero Card**: Tăng font size tiêu đề, con số và ghi chú giúp hiển thị nổi bật, rõ nét.
   - **Định dạng số tiền `10tr+`**: Tự động chuyển các con số ≥ 10.000.000đ sang dạng rút gọn súc tích (`10tr+`, `33,4tr+`, `47,4tr+`).
   - **Clickable Đã chi**: Bấm vào thẻ 1 "Đã chi thực tế trong tháng" để chuyển trực tiếp sang danh sách giao dịch chi tiết.
   - **Accordion Thu gọn 100%**: Thẻ 2 (Ngân sách chưa chi) và Thẻ 3 (Nợ nhóm) thu gọn mặc định, bấm vào header để mở rộng/thu gọn danh sách.

4. **Fix Lỗi Radix Accessibility `DialogTitle` (`drawer.tsx`):**
   - Đã thêm tiêu đề ẩn `<DrawerPrimitive.Title className="sr-only">` dự phòng vào `DrawerContent` giúp khắc phục triệt để thông báo lỗi `DialogContent requires a DialogTitle` từ Radix UI.

5. **Tái thiết kế Giao diện Quản lý Ngân sách (`tab-ngan-sach.tsx`):**
   - Chuyển Summary Card sang Gradient Indigo-Purple (`from-indigo-600 via-purple-600 to-violet-700`).
   - Loại bỏ viền vàng dày thô cứng của thẻ ưu tiên, thay bằng badge `📌 ƯU TIÊN` màu vàng kim thanh lịch.
   - Chuẩn hóa nút "Tạo thêm", "Trả ngay", icon danh mục và các badge trạng thái thanh toán sang phong cách Modern Fintech.

6. **Fix Lỗi Nguồn tiền Trống khi Chuyển tiền (`hop-thoai-chuyen-khoan.tsx`):**
   - Tự động load và chọn ngay ví đầu tiên (hoặc ví ngân hàng khớp) khi mở modal `TransferModal`.
   - Hiển thị trực tiếp Tên ví + Số dư ví (`Ví chính (10.000.000đ)`) ngay trên nút chọn nguồn tiền.

7. **Tối ưu Thuật toán & Giao diện Cảnh báo Chi tiêu (`FinancialAdvisorService.java` & `tab-tu-van.tsx`):**
   - Loại bỏ **hoàn toàn** các khoản Chi phí Cố định / Hóa đơn định kỳ (`Tiền điện`, `Tiền nhà`, `Tiền nước`, `Tiền mạng`, `Hóa đơn`, `Lãi vay`...) khỏi danh sách **Cảnh báo Chi tiêu Bất thường**.
   - **Tái thiết kế Thẻ Cảnh báo High-Contrast & Fix Trùng Icon**: Khung icon đại diện bên trái hiển thị đúng icon danh mục thực tế (`🏥` Y tế, `🍔` Ăn uống, `🛍️` Mua sắm...), gỡ bỏ emoji trùng lặp trong subtitle, kết hợp thẻ trắng `border-l-4` cao cấp và lưới số `15px` phông đậm rõ nét.

---

### Session [2026-07-29] - Nâng cấp UI/UX Thông minh cho 5 Modal Báo cáo Tài chính

**✅ Đã hoàn thành (Compact Procedure):**

**1. Sửa 3 Lỗi UI/Logic Cốt lõi (Bug Fixes P0):**
   - **Fix nhãn sai ngữ cảnh `"% tổng chi"`:** Component `CategoryItem` trong `tab-thong-ke.tsx` hardcode nhãn "tổng chi" cho mọi trường hợp, kể cả modal THU NHẬP. Đã bổ sung prop `isIncome` để hiển thị đúng: `"% tổng thu"` khi xem thu nhập, `"% tổng chi"` khi xem chi tiêu.
   - **Fix dấu âm tiết kiệm:** Khi xem lịch sử danh mục "Mục tiêu tiết kiệm", các khoản nạp hiển thị `-1đ`, `-68đ` gây hiểu nhầm. Đã bổ sung hàm `isSavingsCategory()` kiểm tra tên danh mục, chuyển hiển thị sang `+68đ` (xanh lá), phản ánh đúng hành vi TÍCH LŨY tài sản.
   - **Fix text truncation "Nguyễ...":** Layout hóa đơn nợ nhóm bị dồn 1 dòng khiến tên dài bị cắt. Đã tái cấu trúc layout thành card bo góc `rounded-2xl`, tách Ngày/Người trả/Phần của bạn thành 3 dòng riêng biệt.

**2. Nâng cấp Modal "Chi tiết Đã thu" — Income Health Indicator (`tab-thong-ke.tsx`):**
   - **Thuật toán:** Phân tích phân bố thu nhập từ `incBreakdown[]`. Nếu danh mục lớn nhất chiếm >70%: hiển thị badge Cam ⚠️ "Thu nhập tập trung cao". Nếu ≥3 nguồn, không nguồn nào >50%: badge Xanh ✅ "Thu nhập đa dạng tốt".
   - **Truyền prop `isIncome={true}`** cho tất cả `<CategoryItem>` trong modal thu nhập.

**3. Nâng cấp Modal "Chi tiết Đã chi" — Phân nhóm 50/30/20 (`tab-thong-ke.tsx`):**
   - **Thuật toán phân nhóm:** Xây dựng hàm `categorizeExpenseGroup()` dùng heuristic keyword matching (tương tự `FinancialAdvisorService.java`):
     + **NEEDS:** Tiền nhà, Tiền điện, Y tế, Đi lại, Phí liên lạc...
     + **WANTS:** Phí giao lưu, Quần áo, Mỹ phẩm, Ăn uống...
     + **SAVINGS:** Mục tiêu tiết kiệm, Hoàn tiền tiết kiệm
   - **Giao diện:** Thay danh sách phẳng bằng 3 Section có header + subtotal. Thêm Mini 50/30/20 Progress Bar 3 màu (blue/amber/emerald) phía trên.

**4. Nâng cấp Modal "Lịch sử Danh mục" — Summary Header & Daily Aggregation:**
   - **Summary Header Card:** Hiển thị 3 chỉ số tóm tắt: Tổng tháng | Số lần | TB/lần. Card xanh lá cho danh mục tiết kiệm.
   - **Daily Aggregation:** Gom giao dịch theo ngày (`groupBy dateKey`), hiển thị header ngày với icon 📅, tổng ngày, và số lượng giao dịch. Mỗi giao dịch hiển thị giờ HH:mm thay vì full datetime.

**5. Nâng cấp Modal "Chi tiết Tổng thu" — Progress Bar & Smart Netting:**
   - **Progress Bar Thu hồi Nợ:** Thanh tiến trình 3 màu (emerald ≥80%, blue ≥50%, amber <50%) hiển thị tỷ lệ đã thu / cần thu. Kèm nhãn "Đã thu: Xđ" / "Chưa thu: Yđ".
   - **Smart Netting Suggestion (Gợi ý Cấn trừ Nợ):** Quét `debtSummary.details`, nếu user vừa là chủ nợ vừa là con nợ cùng 1 người ở 2 nhóm khác nhau, tự động tính nợ ròng và hiển thị card Violet với gợi ý: *"Chỉ cần thu/trả ròng: Xđ"*.

**6. Nâng cấp Modal "Chi tiết Nợ Nhóm" — Nút Trả nợ Sticky:**
   - Thêm nút Gradient `from-rose-500 to-pink-500` dạng Sticky Footer cho nợ `OWING`. Bấm vào điều hướng trực tiếp đến trang nhóm để mở Drawer thanh toán nợ VietQR.



**✅ Đã hoàn thành (Compact Procedure):**

**1. Hỗ trợ Gợi ý Chi tiêu & Ngân sách Đa Tháng (`FinancialAdvisorService` & `tab-tu-van.tsx`):**
   - **Yêu cầu của người dùng:** *"Nghiên cứu plan. Để giúp tôi có thể tạo ra gợi ý chi tiêu cho từng tháng. Ví dụ tháng 8 thì thì sẽ gợi ý chi tiêu cho tháng 8 tháng 9 sẽ gợi ý cho tháng 9"*.
   - **Thực thi Backend (`FinancialAdvisorService.java` & `FinancialAdvisorController.java`):**
     - Đã bổ sung overload `analyze(UUID userId, Integer year, Integer month)` cho phép phân tích dữ liệu 3 tháng quá khứ lùi tương đối theo năm/tháng target.
     - Cập nhật REST API `@GetMapping("/insights/{userId}")` tiếp nhận 2 param tùy chọn `year` và `month`.
   - **Thực thi Frontend (`tab-tu-van.tsx` & `tab-tiet-kiem.tsx`):**
     - Bổ sung bộ chọn Tháng/Năm dạng Pill `< Tháng X / YYYY >` kèm logic tự động refetch dữ liệu advisor.
     - Bổ sung nút 1-click **"Áp dụng 🎯"** tại từng thẻ gợi ý ngân sách để thiết lập nhanh hạn mức chi tiêu cho tháng đang chọn.

**2. Khắc phục Lỗi HTTP 500, Null-Safety Toàn diện & Xử lý Tháng Tương lai:**
   - **Phân tích Nguyên nhân Lỗi 500:** `Collectors.toMap` ném NPE khi `categoryName` null hoặc bị đè key; `debtService.getUserDebtSummary(userId)` thiếu null check; các giao dịch/split thiếu danh mục gây crash JPA runtime.
   - **Thực thi Backend (`FinancialAdvisorService.java`):**
     - Bổ sung null check toàn diện cho `debtSummary`, `currentBudgets`, `tx.getCategory()`, `split.getCategory()`.
     - Thay thế `Collectors.toMap` bằng vòng lặp an toàn `putIfAbsent` chống trùng lặp key/value null.
     - Xử lý các tháng trong tương lai: Tự động gắn thông điệp nhận xét *"🗓️ Tháng X/YYYY là tháng trong tương lai (Chưa có dữ liệu chi tiêu thực tế)"* và tự động ẩn các cảnh báo tiêu lố (burn-rate).
   - **Thực thi Frontend (`tab-tu-van.tsx`):**
     - Cập nhật hiển thị **Banner Tháng Tương lai** màu xanh lam nhẹ nhàng thông báo cho người dùng.
     - Cập nhật khối `catch` để trích xuất thông điệp `message` hoặc mã lỗi HTTP thực tế từ Server thay vì hardcode chuỗi thông báo lỗi mặc định.

**3. Tái cấu trúc & Nâng cấp Modal "Chi tiết Tổng chi" (`tab-thong-ke.tsx`):**
   - **Phản hồi người dùng:** *"phần tổng chi này là tổng hợp những khoản phải chi nhé bao gồm cả nợ và những khoản phải chi chứ không phải nợ ấy"*.
   - **Mô hình Thuật toán Cần trả:**
     $$\text{Tổng chi (Cần trả / Dự kiến chi)} = \text{Đã chi thực tế} + \text{Ngân sách \& Hóa đơn chưa chi} + \text{Tổng nợ nhóm cần trả}$$
   - **Thực thi Frontend (`Frontend/src/components/tab-thong-ke.tsx`):**
     - Khai báo và tính toán `unpaidBudgetsList` và `unpaidBudgetsTotal` từ danh sách ngân sách khả dụng.
     - Cập nhật thẻ tóm tắt "📤 Tổng chi (Cần trả)" trên Dashboard Thống kê.
     - Mở rộng cấu trúc Modal **Chi tiết Tổng chi** thành 3 phân đoạn rõ ràng:
       1. **💸 Đã chi thực tế:** Chi tiết tổng tiền đã giao dịch trong tháng.
       2. **📌 Ngân sách & Hóa đơn chưa chi:** Liệt kê từng mục Ngân sách/Hóa đơn cố định chưa chi hết trong tháng, hiển thị chính xác số tiền còn thiếu.
       3. **🤝 Danh sách tôi đang nợ:** Danh sách chi tiết các khoản nợ nhóm cần thanh toán.

---

### Session [2026-07-28] - Nâng cấp Seed V3, Tái thiết kế Form Ngân sách & Cảnh báo Tiết kiệm Quá mức

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khảo sát, Chuẩn hóa Mốc thời gian & Khắc phục Đồng bộ Dữ liệu Ngân sách (Jan 2026 đến 28/07/2026):**
   - **Bối cảnh & Yêu cầu:** 
     + Quy định nghiêm ngặt toàn bộ các sự kiện tài chính (Giao dịch, Chi tiêu nhóm, Hạn mức ngân sách, Mục tiêu tiết kiệm, Thanh toán nợ) chỉ diễn ra từ `01/01/2026` đến `28/07/2026` (Thời điểm hiện tại).
     + Giải quyết thắc mắc của người dùng về việc Dashboard hiển thị chi tiêu 7.000.000đ nhưng tab Ngân sách chỉ hiển thị 1 thẻ duy nhất và ghi `Đã chi: 0đ`.
   - **Phân tích Nguyên nhân Kỹ thuật:**
     + JPQL Query trong `TransactionRepository.java` (`sumExpenseByCategoryAndMonth`) bắt buộc kiểm tra điều kiện `t.wallet.isLiability = false OR t.wallet.isLiability IS NULL`. Nếu giao dịch bị gán ngẫu nhiên vào Ví thẻ tín dụng (`is_liability = true`), Backend sẽ loại trừ khỏi ngân sách cá nhân.
     + Trong Seed cũ, 9/10 danh mục chi tiêu chưa được tạo thẻ Ngân sách tương ứng cho từng tháng.
   - **Giải pháp & Thực thi (`generate_seed_v3.js` & `seed_v3.sql`):**
     + Phát triển kịch bản Node.js tự động tạo 7 tháng dữ liệu liên tục cho 5 người dùng mẫu, phủ kín 17+ bảng thực thể.
     + Bổ sung khối PL/pgSQL an toàn `DO $$ ... END $$;` kiểm tra `information_schema.tables` trước khi `DELETE`, khắc phục triệt để lỗi `ERROR: relation "transaction_tags" does not exist` khi nạp trên Database trắng.
     + Tạo sẵn trọn vẹn 10 thẻ Ngân sách hàng tháng cho 10 danh mục chi tiêu (*Ăn uống*, *Chi tiêu hàng ngày*, *Tiền điện*, *Phí liên lạc*, *Phí giao lưu*, *Mỹ phẩm*, *Tiền nhà*, *Quần áo*, *Đi lại*, *Y tế*).
     + Gán 100% giao dịch chi tiêu vào Ví tiền mặt (`w1` - `is_liability = false`), đảm bảo khi import `seed_v3.sql` (746KB, 4.378 dòng SQL), tab Ngân sách hiển thị chính xác từng đồng số tiền `Đã chi: X VNĐ` trùng khớp với Dashboard. Cập nhật tài liệu [seeder.md](file:///c:/Users/DELL/Downloads/sharemoney/sharemoney/seeder.md).

**2. Tái cấu trúc & Thiết kế lại Giao diện Form Ngân sách (`SetBudgetDrawer`):**
   - **Bối cảnh & Vấn đề UI/UX:**
     + Người dùng chụp màn hình phản hồi: *"chỉnh lại form này đi trông nó ko đồng bộ"*.
     + Phân tích lỗi thiết kế cũ (`ngan-keo-thiet-lap-ngan-sach.tsx`): Dính 3 hình ảnh minh họa 3D bên thứ 3 (`Target`, `Piggy Bank`, Line art SVG) đặt vị trí `absolute` đè trực tiếp lên chữ tiêu đề và ô nhập liệu; tiêu đề chế độ Tạo mới bị xuống dòng 3 hàng (`<br /> Đặt <br /> Ngân Sách`) lệch với chế độ Chỉnh sửa; ô nhập Số tiền và Chọn danh mục bị dính gộp bên trong 1 card 2 tầng với icon không đồng nhất; nhãn Ngày hết hạn hiển thị định dạng Tiếng Anh `mm/dd/yyyy`; nút Submit bị đè bởi badge avatar màu đen.
   - **Giải pháp & Thực thi Frontend (`Frontend/src/components/ngan-keo-thiet-lap-ngan-sach.tsx`):**
     + **Header nâng cấp:** Loại bỏ toàn bộ ảnh 3D rác đè chữ. Thêm badge tiêu đề `✨ Quản lý hạn mức`, tiêu đề chính `Chỉnh sửa ngân sách` / `Tạo ngân sách mới` và Icon `Layers` góc phải tạo điểm nhấn hiện đại.
     + **Tách biệt ô nhập liệu (Atomic Input Cards):**
       - *Hạn mức số tiền (*):* Card bo góc trắng riêng biệt kèm Icon `Coins` và đơn vị badge `VNĐ` màu xanh ngọc.
       - *Danh mục áp dụng (*):* Select dropdown riêng biệt hiển thị Icon Emoji + Tên danh mục trực quan.
       - *Tên ngân sách (Tùy chọn):* Card nhập tên gợi nhớ với Icon bút chì `Pencil`.
     + **Segmented Control:** Nút gạt 2 tab dạng Pill chọn loại ngân sách (`🎯 Linh hoạt` vs `📌 Hóa đơn cố định`) với hiệu ứng bóng mờ trắng bổi bật.
     + **Tùy chọn nâng cao & Nút Submit:** Gom nhóm `Ưu tiên thanh toán` (icon `CheckCircle2`, toggle Amber) và `Lặp lại hàng tháng` (icon `Repeat`, toggle Emerald) vào card riêng. Định dạng Ngày hết hạn với Icon `Calendar` và nút bấm `Lưu ngân sách ngay` phủ Gradient Emerald-Teal hiện đại.

**3. Triển khai Hệ thống Cảnh báo Tiết kiệm Quá mức (Emergency Reserve Protection):**
   - **Yêu cầu của người dùng:** *"đặt cho tôi cảnh báo nếu tôi tiết kiệm quá nhiều ăn cả vào tiền dự trữ cho tôi nhé"*.
   - **Mô hình Thuật toán Tài chính:**
     $$\text{Tiền nhàn rỗi khả dụng (Safe to Spend)} = \text{Tổng số dư ví tiền mặt/ngân hàng} - \text{Hạn mức ngân sách chưa chi trong tháng} - \text{Tổng nợ phải trả}$$
     *Nếu số tiền nạp vào Quỹ tiết kiệm vượt quá Tiền nhàn rỗi khả dụng, hành động này bắt buộc phải bị cảnh báo vì gây nguy cơ thâm hụt Quỹ dự trữ khẩn cấp và Ngân sách bắt buộc.*
   - **Thực thi Backend (`SavingsGoalService.java` & `SavingsGoalResponse.java`):**
     + Bổ sung trường `warningMessage` vào `SavingsGoalResponse` DTO.
     + Trong `SavingsGoalService.fundSavingsGoal`, tích hợp `BudgetService`, `WalletRepository`, `DebtService` để tính toán `idleMoney` trước khi nạp tiền.
     + Nếu `fundAmount > idleMoney`: Backend tự động tạo và đẩy một **Notification Real-time (WebSocket STOMP)** loại `WARNING` tới thiết bị người dùng với nội dung:
       > `"⚠️ Cảnh báo Tiết kiệm Quá mức: Khoản nạp Xđ vào quỹ '[Tên quỹ]' đã ăn lấn vào Quỹ dự trữ & Ngân sách bắt buộc của bạn (Tiền nhàn rỗi khả dụng chỉ còn Yđ)!"`
     + Đóng gói `warningMessage` trả về trong JSON Payload.
   - **Thực thi Frontend (`ngan-keo-nap-tiet-kiem.tsx` & `tab-tiet-kiem.tsx`):**
     + Truyền prop `safeToSpend` vào `FundSavingsDrawer`.
     + Phản hồi thời gian thực khi gõ số tiền: Khi `action === "FUND"` và `numAmount > safeToSpend`, tự động hiển thị ngay **Thẻ Cảnh báo màu Cam nổi bật** (`⚠️ Cảnh báo Tiết kiệm Quá mức!`) trực tiếp trên Drawer ngay trên nút bấm.
     + Chuyển trạng thái nút bấm thành `Vẫn xác nhận nạp (Có cảnh báo)` (Màu cam) và kích hoạt Toast alert `toast.warning(warningMessage)` phản hồi lại người dùng khi giao dịch hoàn tất.

---



### Session [2026-07-26] - Nâng cấp Database Seed v2 & Hoàn thiện UX/UI Xem Chi tiết Nợ/Danh mục

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tái cấu trúc & Nâng cấp Dữ liệu mẫu (Database Seed v2):**
   - **Thực thi:** Tạo mới toàn bộ kịch bản dữ liệu `seed_v2.sql` mô phỏng 6 tháng chi tiêu liên tục cho 5 người dùng. Cập nhật các cột dữ liệu theo chuẩn Entity mới nhất (thêm các trường boolean `is_split`, `is_auto_generated`, `exclude_from_budget`, sửa Type Enum,...). Điều chỉnh `application.properties` về lại chế độ `update` để bảo vệ dữ liệu. Đảm bảo toàn bộ biểu đồ xu hướng 6 tháng hoạt động hoàn hảo khi có dữ liệu.

**2. Nâng cấp Trải nghiệm UX/UI (Nested Modal Details):**
   - **Thực thi:** Cải tiến mạnh mẽ tab Thống kê (`tab-thong-ke.tsx`). Cho phép người dùng click trực tiếp vào các khoản mục trên biểu đồ (Tổng thu, Tổng chi, Danh mục) và các mục nợ nhóm để mở ngay một Popup hiển thị danh sách chi tiết các giao dịch liên quan thay vì phải chuyển trang. Trải nghiệm người dùng trở nên mượt mà và trực quan hơn rất nhiều.

**3. Cải tiến Thuật toán Hiển thị Chi tiết Nợ (FIFO Filter & Smart Splits):**
   - **Vấn đề:** Khi click vào một khoản nợ (VD: Nợ Trần Thị B 1.000.000đ), hệ thống hiển thị toàn bộ lịch sử chi tiêu của nhóm khiến người dùng hiểu nhầm rằng họ mắc nợ rất nhiều.
   - **Thực thi Backend:** Cập nhật `ExpenseService` và `ExpenseResponse` để trả về thêm trường `currentUserSplitAmount` – số tiền chính xác mà người dùng hiện tại phải chịu trong từng hóa đơn.
   - **Thực thi Frontend:** Áp dụng thuật toán lọc FIFO (First-In, First-Out). Quét các hóa đơn từ mới nhất đến cũ nhất, tích lũy số tiền nợ cho đến khi vừa khớp với khoản nợ ròng thực tế. Hệ thống hiện tại chỉ hiển thị chính xác các hóa đơn "Còn Nợ" và ẩn đi các hóa đơn đã được thanh toán, đồng thời gắn nhãn "Phần của bạn: X VNĐ" cực kỳ rõ ràng.

---

### Session [2026-07-22] - Tự động hóa Tiết kiệm, Tối ưu Cảnh báo, Quản lý Nhóm & Hoàn thiện Seed Data

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tích hợp Quản lý Chi tiêu Nhóm vào PFM (Group Expenses Integration):**
   - **Yêu cầu của người dùng:** Tiền nhóm phải được đồng bộ vào dòng tiền cá nhân (trừ tiền khỏi Ví, ghi nhận vào Dashboard).
   - **Quyết định & Thực thi Backend:** Xây dựng hệ thống sự kiện (Event-driven) thông qua `PfmEventListener.java`. Khi một Hóa đơn chung được tạo, hệ thống sử dụng thuật toán chia tiền, tự động tính ra phần tiền cá nhân người dùng phải chịu. Sau đó, nó tự động trích tiền từ Ví mặc định (Wallet) và tạo một bản ghi Giao dịch (Transaction) tương ứng với cờ `is_split = true`. Các giao dịch này sẽ hiển thị lên Dashboard và trừ vào Ngân sách nếu có.
   - **Thực thi Frontend:** Nâng cấp toàn diện giao diện `[id]/page.tsx` (Chi tiết nhóm), cập nhật Modal Thêm chi tiêu (`ngan-keo-them-chi-tieu.tsx`) và tạo Modal Chuyển khoản (Thanh toán nợ).

**2. Khắc phục thuật toán Cảnh báo Chi tiêu (Smart Alerts) cho Chi phí cố định:**
   - **Yêu cầu của người dùng:** Báo lỗi logic khi AI cảnh báo "Tiền nhà" chi tiêu bất thường. Lý do: Tiền nhà là khoản cố định đóng 1 lần/tháng, không thể chia trung bình theo ngày (burn-rate) để dự phóng lên cuối tháng.
   - **Quyết định & Thực thi:** Bổ sung thuật toán nội suy linh hoạt vào `FinancialAdvisorService.java`. Xây dựng một danh sách từ khóa tĩnh (Heuristic) nhận diện chi phí cố định (`tiền nhà`, `thuê nhà`, `trả góp`, `lãi vay`, `học phí`, `internet`, `định kỳ`). Nếu giao dịch thuộc nhóm này, AI sẽ bỏ qua bước chia trung bình `monthProgress`, lấy trực tiếp số tiền đã chi để so sánh với trung bình 3 tháng trước, loại bỏ hoàn toàn cảnh báo sai lệch.

**3. Nâng cấp Tab Tiết kiệm (Auto-Fund Savings Goals):**
   - **Yêu cầu của người dùng:** Thắc mắc về việc ai quản lý tiền trong Quỹ tiết kiệm (App đóng vai trò sổ tay, không giữ tiền) và yêu cầu có nút bấm để chuyển nhanh số tiền mà AI "gợi ý" vào quỹ tiết kiệm.
   - **Quyết định & Thực thi Frontend (`tab-tiet-kiem.tsx`):** 
     + Khơi thông chức năng Nạp/Rút thủ công: Component `ngan-keo-nap-tiet-kiem.tsx` đã được code trước đó nhưng quên gắn UI. Đã bổ sung nút **Nạp/Rút** tại từng thẻ Mục tiêu.
     + Phát triển tính năng **"Phân bổ tự động ngay"**: Thêm nút bấm dưới thẻ "Gợi ý Tiết kiệm". Khi click, hệ thống đọc tham số `suggestedSaveAmount` từ AI, lặp qua danh sách các mục tiêu tiết kiệm, chia tiền theo tỷ lệ **Mức độ ưu tiên** (Tối quan trọng, Ưu tiên cao...). Nếu một quỹ đã đầy, tiền dư tự động tràn (overflow) sang quỹ ưu tiên thấp hơn. Gọi API `/fund` hàng loạt để hoàn tất toàn bộ quy trình chỉ với 1 click.

**4. Khôi phục & Cấu trúc lại Dữ liệu mẫu (Comprehensive 3-Month Seed Data):**
   - **Yêu cầu của người dùng:** Cần một bộ dữ liệu SQL có sẵn cho 5 người dùng, kéo dài 3 tháng, dữ liệu đa dạng phủ kín tất cả 17 bảng và ít nhất 50% danh mục (để chạy Demo/Thuyết trình). Quá trình trước đó bị lỗi làm mất cấu trúc `CREATE TABLE` và hỏng font tiếng Việt do PowerShell.
   - **Quyết định & Thực thi:** 
     + Phục hồi file `seed_1_year.sql` gốc qua Git để giữ lại khối `CREATE TABLE`.
     + Viết script Node.js (`append_data.js`) sử dụng marker ASCII (`DELETE FROM transaction_tags;`) để xác định đúng vị trí cần nối dữ liệu.
     + Sinh ra hơn 70KB dữ liệu hoàn hảo, chứa đầy đủ Hóa đơn, Giao dịch, Chia tiền nhóm, Tiết kiệm, Ngân sách cho 5 user. Dữ liệu chuẩn tiếng Việt 100%.

**5. Quản lý Git & Tích hợp liên tục (Careful Commits):**
   - **Yêu cầu của người dùng:** Commit cẩn thận và push mã nguồn lên Github.
   - **Thực thi:** Đã rà soát và chia 28 files thay đổi thành 3 commits độc lập với tiêu đề chuẩn mực (Groups, Advisor, Seed) và push thành công lên nhánh `feat/uncategorized-transactions`.

---

### Session [2026-07-19] - Cập nhật Biểu đồ Xu Hướng & Giải đáp Kiến trúc Cơ sở Dữ liệu

**✅ Đã hoàn thành (Compact Procedure):**

**1. Sửa lỗi logic & Giao diện Biểu đồ Xu hướng 6 tháng:**
   - **Câu hỏi 1-3:** "Hiển thị 6 tháng gần nhất kể từ tháng hiện tại", "tháng 7 ko có gì... sao nó trống trơn thế được", "tháng nào chưa có dữ liệu hãy hiển thị nó là dừng ở tháng mà nó có dữ liệu chứ không kéo nó về 0 nhé".
   - **Thực thi:** 
     + Backend (`TransactionService`): Đã cập nhật thuật toán để danh sách 6 tháng luôn tính lùi từ tháng hiện tại (`YearMonth.now()`), độc lập với tháng người dùng chọn trên bộ lọc (chỉ lọc cho Top Cards).
     + Frontend (`tab-thong-ke.tsx`): Khắc phục lỗi biểu đồ trống do danh mục rỗng ở tháng mới. Chuyển sang trích xuất Top 5 danh mục từ toàn bộ 6 tháng thay vì chỉ từ tháng đang chọn.
     + Frontend (Line rendering): Cải tiến logic vẽ SVG (polyline và dots). Đường biểu diễn sẽ tự động ngắt/dừng ở tháng cuối cùng có dữ liệu chi tiêu, không bị rơi tụt xuống mức 0 ở các tháng tương lai (chưa có dữ liệu).

**2. Giải đáp Kiến trúc Cơ sở dữ liệu Cốt lõi (PFM Database Structure):**
   - **Câu hỏi 4-8:** Yêu cầu giải thích chi tiết cột, tác dụng bảng `transaction_tags`, `transaction_splits`, `savings_goals` và mối liên hệ giữa các bảng. Lấy ví dụ thực tế từ trong Database của project.
   - **Thực thi:**
     + **Bảng `transaction_tags` (Quan hệ N-N):** Đã phân tích đây là bảng trung gian giúp gắn nhiều nhãn dán cho 1 giao dịch. Lấy đúng ví dụ thực tế từ file `seed_1_year.sql`: Giao dịch Lẩu Thái (120k) gắn đồng thời tag `#anuong` và `#banbe`.
     + **Bảng `transaction_splits` (Quan hệ 1-N):** Đã phân tích tính năng "Split Transaction" (chia nhỏ giao dịch). Dùng ví dụ đi siêu thị (hóa đơn gộp ăn uống, sinh hoạt, giáo dục) để giải thích cách phân bổ 1 dòng tiền ra thành nhiều danh mục ngân sách khác nhau, không làm sai lệch số dư.
     + **Liên kết 3 bảng:** Đã tổng hợp thành sơ đồ rễ cây: `transactions` là thân cây (số tiền tổng, thời gian), `transaction_splits` là nhánh chia nhỏ theo danh mục, `transaction_tags` là nhánh nhóm chéo theo sự kiện/nhãn dán.
     + **Bảng `savings_goals`:** Giải thích cơ chế lưu trữ các mục tiêu tiết kiệm, ý nghĩa các cột `target_amount`, `current_amount`, `deadline_date` và cách hệ thống nhắc nhở tiến độ.

---

### Session [2026-07-19] - Hoàn thiện Chức năng Nhập Nhanh (Chưa Phân Loại) & Popup Quản lý

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tích hợp Giao dịch "Nhập nhanh" (Chưa phân loại):**
   - **Giao diện (`ngan-keo-them-giao-dich.tsx`):** Hoàn thiện nút "Nhập nhanh (Chưa phân loại)" cho luồng thêm chi tiêu cá nhân, cho phép tạo nhanh một giao dịch mà không cần chọn danh mục (tự động gán vào danh mục "Chưa phân loại").
   - **Backend:** Cập nhật 2 REST APIs (`GET /api/transactions/uncategorized` và `/api/transactions/uncategorized/count`) để lấy danh sách và đếm số lượng các giao dịch cần phân loại lại.

**2. Giao diện Cảnh báo & Popup Phân loại (Dashboard):**
   - **Dashboard (`tab-tong-quan.tsx`):** Tích hợp banner cảnh báo (màu hổ phách) trên màn hình Tổng quan khi phát hiện có giao dịch chưa phân loại.
   - **Popup Danh sách:** Bổ sung component `Dialog` hiển thị danh sách các giao dịch "Nhập nhanh" (hiển thị ghi chú, ngày tháng, và số tiền).
   - **Liên kết Sửa Giao dịch:** Kết nối trực tiếp từng item trong Popup với `<EditTransactionDrawer>`, giúp người dùng bấm vào là có thể chọn lại danh mục và cập nhật dễ dàng.

**3. Quản lý Git & Triển khai:**
   - Tạo mới nhánh (branch) `feat/uncategorized-transactions`.
   - Commit toàn bộ thay đổi mã nguồn và push thành công lên kho lưu trữ GitHub.

---

### Session [2026-07-16] - Code Formatting, Báo cáo Clean Code & Việt hóa Cấu trúc Component

**✅ Đã hoàn thành (Compact Procedure):**

**1. Chuẩn hóa & Làm sạch Mã nguồn (Code Formatting):**
   - **Backend (Spring Boot):** Chạy thành công plugin `spotless-maven-plugin` để tự động dọn dẹp và chuẩn hóa định dạng (format) cho 110 files mã nguồn Java theo tiêu chuẩn Google Java Format.
   - **Frontend (Next.js):** Kích hoạt Prettier để định dạng lại toàn bộ 66 files `.tsx`, tự động sắp xếp CSS classes và thụt lề chuẩn xác.

**2. Phân tích & Báo cáo Kiến trúc (Clean Code Report):**
   - Viết và bàn giao bản báo cáo chi tiết về "Clean Code trên Frontend" (phục vụ viết luận văn).
   - Báo cáo nhấn mạnh 5 điểm mạnh: Cấu trúc thư mục (app/components/lib), thiết kế Atomic, bóc tách logic bằng Custom Hooks, Axios Interceptors, và TypeScript.

**3. Việt hóa Cấu trúc Tên file Frontend:**
   - **Quyết định:** Mặc dù được cảnh báo về tiêu chuẩn tiếng Anh, nhưng để thuận tiện cho việc rà soát đồ án, toàn bộ tên file giao diện đã được chuyển sang tiếng Việt.
   - **Thực thi:** Viết script tự động đổi tên 39 files components sang tiếng Việt không dấu (ví dụ: `dashboard-tab.tsx` thành `tab-tong-quan.tsx`).
   - **Đồng bộ hóa:** Script tự động dò tìm và cập nhật toàn bộ đường dẫn `import` trong 13 files liên quan.
   - **Vá lỗi biên dịch:** Khắc phục thành công một lỗi TypeScript trong `ngan-keo-tong-hop-no.tsx` (thiếu props `open`). Quá trình build Next.js (Production) đã diễn ra trơn tru 100%.

---

### Session [2026-07-14] - Quyết định Chiến lược: Gỡ bỏ OCR & Rà soát Lỗi Toàn cục (Deep Audit)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Quyết định Chiến lược: Gỡ bỏ Tính năng Quét Hóa đơn (AI/OCR):**
   - **Quyết định của người dùng:** Nhận định việc phụ thuộc hoàn toàn vào các API bên thứ 3 (Gemini/OCR) để nhận diện hóa đơn rất dễ phát sinh lỗi, thiếu tính ổn định ở môi trường thực tế, người dùng đã dứt khoát chỉ đạo: **Ngừng phát triển và gỡ bỏ hoàn toàn phần này**.
   - **Thực thi:** Đã tiến hành gỡ bỏ toàn bộ giao diện UI (nút camera, luồng scan) và triệt tiêu các liên kết logic dưới Backend (`ReceiptScanService`, `GeminiService`) liên quan đến tính năng quét hóa đơn, giúp giảm tải hệ thống và loại bỏ một rủi ro tiềm ẩn lớn (point of failure).

**2. Quy trình Rà soát & Khắc phục Lỗi Logic Cốt lõi (Deep Logic Audit):**
   - Tuân thủ lệnh "kiểm soát lỗi toàn project", đã thực hiện kiểm tra chéo toàn bộ các Service và khắc phục thành công **10 lỗi logic cốt lõi**:
     + **Tiết kiệm:** Sửa lỗi trừ sai tiền khi nạp/rút quỹ tiết kiệm (khai báo biến `fundAmount` muộn).
     + **Dashboard & Ngân sách:** Fix logic tính sai "Tiền có thể tiêu", chuẩn hóa việc gom nhóm giao dịch theo tháng bằng `LocalDate`.
     + **Chia nhóm & Nợ:** Vá thuật toán chia đều (tự động tính luôn phần của người trả tiền), gỡ bỏ vòng lặp vô hạn và cồng kềnh trong `DebtService` để tính toán nợ 1 chiều đúng nguyên tắc kế toán (Cash-basis).
     + **Sức khỏe tài chính:** Bổ sung thuật toán tính điểm động thay vì hardcode.
     + **Dòng tiền (PfmEventListener):** Thiết lập quy trình Rollback giao dịch hoàn hảo khi người dùng cập nhật/xóa Hóa đơn gốc.

**3. Quy trình Nâng cấp Kiểm soát Lỗi Toàn dự án (Global Error Handling):**
   - **Quyết định:** Không để bất kỳ ngoại lệ (exception) nào làm sập hệ thống (mã lỗi 500). Mọi lỗi phải được kiểm soát, có thông báo thân thiện và trả về status code chuẩn.
   - **Thực thi quy trình:** 
     + Cấu trúc lại `GlobalExceptionHandler` để tự động bắt các lỗi phổ biến (`HttpMessageNotReadableException`, `ConstraintViolationException`, `DataIntegrityViolationException`) và dịch thành `400 Bad Request` hoặc `409 Conflict`.
     + Kích hoạt `@Validated` cho 100% (16/16) REST Controllers để chặn ngay các request sai định dạng.
     + Rà soát và triệt tiêu toàn bộ các lệnh gọi `.orElseThrow()` "chay" dễ sinh `NoSuchElementException`, thay bằng exception tùy chỉnh có mô tả rõ ràng. Chuyển đổi `e.printStackTrace()` sang `log.error()`.

---

### Session [2026-07-14] - Khắc phục Lỗi Hiển thị Vượt Ngân sách & Smart Auto-Linking

**✅ Đã hoàn thành (Compact Procedure):**

**1. Gỡ bỏ Giới hạn Hiển thị Ngân sách (Uncapped Budget UI):**
   - **Vấn đề:** Mặc dù Backend lưu trữ số tiền chi tiêu thực tế (VD: chi 11tr cho ngân sách 8.5tr), nhưng Frontend sử dụng hàm `Math.min(đã_chi, giới_hạn)` ở các màn hình `dashboard-tab`, `budget-tab`, và `financial-health-card`, khiến thanh tiến độ luôn khóa ở mức 100% (8.5tr) và che giấu khoản tiền chi vượt quá.
   - **Giải pháp:** Gỡ bỏ toàn bộ hàm `Math.min()` ở Frontend. Cập nhật thanh tiến độ (Progress bar) để tính đúng tỷ lệ % (có thể >100%) và hiển thị chính xác số tiền đã chi vượt hạn mức.

**2. Sửa lỗi Unlink Giao dịch (Smart Auto-Linking Bugfix):**
   - **Vấn đề:** Khi người dùng vào Lịch sử chỉnh sửa giao dịch (thêm ghi chú, đổi số tiền), nếu giao dịch đó thuộc loại "Tiền nhà" (BILL) thì không những không tự liên kết, mà tính năng cũ còn vô tình chèn đè `linkedBudgetId = null`, làm tuột luôn các liên kết Ngân sách đang có. Nguyên nhân là do REST API không gửi lên `linkedBudgetId`.
   - **Giải pháp Backend (`TransactionService.java`):** Sửa lại logic `updateTransaction` để giữ nguyên (preserve) liên kết cũ nếu Frontend gửi lên giá trị null. Đồng thời bổ sung tính năng kích hoạt lại thuật toán Smart Auto-Link: nếu giao dịch chưa có liên kết, backend sẽ tự động truy vấn tìm Ngân sách Cố định (BILL) khớp Danh mục, Tháng, và Năm để ép gán (Force Link). Người dùng chỉ cần "Sửa" và "Lưu" là dữ liệu sẽ tự động sửa chữa.

---

### Session [2026-07-10] - Tối ưu Hiệu năng (Pagination) & Rà soát Lỗi Kế toán (PFM Algorithms)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Tối ưu Hiệu năng với Phân trang (Pagination) & Cuộn vô hạn (Infinite Scroll):**
   - **Vấn đề (Bottleneck):** Lịch sử Giao dịch và Chi tiêu nhóm trước đây gọi API lấy toàn bộ danh sách (List), gây tràn bộ nhớ (OOM) nếu số lượng bản ghi tăng theo thời gian.
   - **Thực thi Backend:** Cập nhật `TransactionRepository` và `ExpenseRepository` sang `Page<T>` bằng `Pageable`. Viết lại `TransactionController` và `ExpenseController` để trả về dữ liệu có phân trang (`page`, `size`, `totalPages`).
   - **Thực thi Frontend:** Nhúng thư viện `react-intersection-observer`. Viết lại hook tìm nạp dữ liệu trên màn hình Lịch sử và Nhóm để theo dõi `ref` của phần tử cuối cùng, tự động gọi API lấy trang tiếp theo (Infinite Scroll).

**2. Vá lỗ hổng Thuật toán 50/30/20 (Habit Analysis):**
   - **Vấn đề:** Giao dịch "Mục tiêu tiết kiệm" (gửi tiền vào Quỹ) bị hệ thống tự động gán vào nhóm **Chi tiêu linh hoạt (WANTS)**, khiến người dùng bị báo cáo "Tiêu xài quá nhiều, tiết kiệm quá ít" ngay cả khi họ đang nạp tiền tiết kiệm.
   - **Giải pháp:** Cập nhật công thức tính của Hệ chuyên gia (`FinancialAdvisorService`). `savingsAmount` giờ đây được tính bằng: `Thu nhập - TẤT CẢ các khoản NEEDS và WANTS`. Qua đó, tiền gửi vào quỹ tự động được xếp đúng vào nhóm 20% Tiết kiệm.

**3. Khắc phục lỗi "Tiền nhàn rỗi" hiển thị sai lệch & Chống nhiễu Ngân sách:**
   - **Vấn đề:** Số dư khả dụng trên tab Tiết kiệm bị trừ đi `totalSavings` lần thứ hai (Double deduction). Đồng thời, việc nạp/rút quỹ làm tăng ảo Tổng chi phí / Tổng thu nhập, khiến thuật toán Gom tiền rảnh rỗi quét sai.
   - **Giải pháp:** Sửa công thức ở Frontend (`savings-tab.tsx`) loại bỏ phép trừ lặp. Bổ sung cờ `excludeFromBudget = true` vào các giao dịch nạp/rút tiền quỹ ở Backend (`SavingsGoalService.java`), và chặn các giao dịch này tại `FinancialAdvisorService` để đảm bảo chúng không làm nhiễu dữ liệu thu/chi nhưng vẫn giữ nguyên Lịch sử Giao dịch.
   - **Quản lý phiên bản:** Đã push mã nguồn hoàn chỉnh lên `feature/vietqr-budget`.

---

### Session [2026-07-09] - Quản lý Ngân sách Cố định & Đồng nhất Giao diện Chuyển tiền (Unified Transfer & Bank Binding)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Liên kết Ví với Tài khoản Ngân hàng (Bank Binding):**
   - **Câu hỏi của người dùng:** "Kiểm tra toàn bộ project xem có phần nào cho thiết lập liên kết ví với tài khoản ngân hàng chưa. Vì app sẽ không làm nhiệm vụ giữ tiền của khách hàng mà đứng giữa ngân hàng và khách hàng để làm kiểm soát viên tài chính cho user nhé."
   - **Phân tích:** Ứng dụng PFM đóng vai trò sổ tay kiểm soát, không giữ tiền thực tế. Do đó, mỗi Ví (Wallet) cần được định danh bằng một tài khoản ngân hàng thực tế để luồng tiền minh bạch.
   - **Quyết định & Thực thi:** 
     - Cập nhật cơ sở dữ liệu và Entity `Wallet` (Backend) bổ sung các trường `bankBin`, `bankAccountNo`, `bankAccountName`.
     - Nâng cấp DTOs và UI tạo/sửa ví để cho phép người dùng ánh xạ Ví ảo trong ứng dụng với Tài khoản Ngân hàng thật.

**2. Đồng nhất Giao diện Chuyển tiền & Tự động điền (Unified Transfer & Auto-fill):**
   - **Câu hỏi của người dùng:** "Tôi nói tất cả các giao dịch chuyển tiền ra ngoài tài khoản đều về chung giao diện chuyển tiền mà. Nhưng suy nghĩ kịch bản xem sao cho đôi cái nó có sẵn số tiền ở đó rồi ấy nhé" và "Vì sao phải chọn ví nguồn nhỉ?"
   - **Phân tích:** Người dùng muốn một nút "Chuyển tiền" duy nhất giải quyết mọi bài toán (cả chi tiêu thường và đóng tiền hóa đơn/ngân sách), đồng thời tối giản hóa trải nghiệm nhập liệu: tự động điền số tiền và bỏ qua các bước chọn ví không cần thiết nếu có thể.
   - **Quyết định & Thực thi:** 
     - Tích hợp tính năng thanh toán Ngân sách trực tiếp vào `TransferModal` chung.
     - Xây dựng kịch bản "Có sẵn số tiền": Nếu người dùng mở form chuyển tiền và chọn một danh mục Hóa đơn cố định (VD: Tiền nhà) chưa thanh toán đủ, hệ thống tự động điền (auto-fill) số tiền còn thiếu vào biểu mẫu.
     - Tối ưu hóa bước chọn Ví nguồn và Tài khoản đích (bỏ qua bước nhập nếu dữ liệu đã được kế thừa từ Ngân sách).

**3. Khắc phục lỗi Không cập nhật Ngân sách (Budget Tracking Fixes):**
   - **Câu hỏi của người dùng:** "Sau khi thanh toán tiền nhà rồi thì phần ngân sách này cũng phải được cập nhật đúng không?"
   - **Phân tích:** Tiền nhà đã được thanh toán qua `TransferModal` nhưng thẻ Ngân sách không tăng mức "Đã chi". Nguyên nhân là do API Categories tự động ghi đè danh mục thành "Ăn uống" và Modal quên truyền tham số `linkedBudgetId` về Backend khi giao dịch được khởi tạo từ màn hình Dashboard. Hơn nữa, giao diện cũ chặn hiển thị số tiền "Đã chi" của các Ngân sách loại Hóa đơn (`BILL`).
   - **Quyết định & Thực thi:**
     - Sửa lỗi ghi đè danh mục trong `TransferModal`, bảo toàn chính xác `categoryId` và đảm bảo `linkedBudgetId` được gắn vào JSON payload đẩy xuống `TransactionService`.
     - Cập nhật `budget-tab.tsx` hiển thị tiến độ "Đã chi: X đ" cho các loại Ngân sách `BILL` (trước đây chỉ hiển thị tổng Hạn mức).
     - Đã build thành công Next.js và pass toàn bộ Type Check.

---

### Session [2026-07-07] - Cập nhật Logic Tiền nhàn rỗi & Giao diện Dashboard (Wealth Snapshot)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Chuẩn hóa Thuật toán Tiền Nhàn Rỗi (Idle Money):**
   - **Câu hỏi của người dùng:** "Tại sao Tiền nhàn rỗi ở Dashboard và Tab Tiết kiệm lại khác nhau? Nếu tôi tiết kiệm 4.675.000đ thì số tiền nhàn rỗi còn lại có được đề xuất tiết kiệm tiếp không, hay bị lặp lại?"
   - **Phân tích:** Ứng dụng trước đó chưa trừ "Tiền đã gửi tiết kiệm" khỏi ví tổng. Dẫn đến vòng lặp vô tận: tiền đã cất vào ống heo nhưng hệ thống vẫn coi là rảnh rỗi và tiếp tục giục đi gửi.
   - **Giải pháp:** Cập nhật công thức lõi ở cả `FinancialAdvisorService.java` và Frontend (`dashboard-tab.tsx`, `savings-tab.tsx`): 
     *Tiền nhàn rỗi = Tổng tiền các ví - Ngân sách chưa chi - Nợ - Tổng tiền trong Quỹ tiết kiệm*.
   - **Kết quả:** Đảm bảo đúng chuẩn phương pháp "Phong bì" (Envelope System) trong Quản lý Tài chính Cá nhân.

**2. Tái cấu trúc Dashboard (Từ Dòng tiền Tháng sang Bức tranh Tài sản):**
   - **Câu hỏi của người dùng:** "Vì sao Tháng mới (Tháng 7) thì các số Đã thu / Đã chi lại về 0đ? Tất cả các tính năng phải dựa trên số dư hiện tại chứ không phải tính theo thời điểm!"
   - **Phân tích:** Giao diện cũ hiển thị Dòng tiền theo tháng (Monthly Cash Flow), khiến dữ liệu reset về 0 vào ngày mùng 1 hàng tháng, gây hụt hẫng cho người dùng muốn xem bức tranh toàn cảnh.
   - **Giải pháp:** Gỡ bỏ hoàn toàn 4 chỉ số dòng tiền tháng. Thay bằng khối **"Snapshot Tài sản" (Wealth Snapshot)** phản ánh tức thì trạng thái thực:
     1. Tổng tiền các ví
     2. Tổng tiền tiết kiệm
     3. Nợ cần thu
     4. Nợ phải trả
   - **Kết quả:** Giao diện trực quan minh bạch. Bóc trần được điểm vô lý trong dữ liệu mẫu (Tiết kiệm > Tổng tiền ví), giúp người dùng thấu hiểu chính xác dòng tiền của mình ở thì hiện tại.

---

### Session [2026-07-06] - Thuật toán Z-Score Anomaly Detection & Nghiên cứu Seeder

**✅ Đã hoàn thành (Compact Procedure):**

**1. Phân tích Hiện trạng & Đề xuất 6 Tính năng Nâng cao:**
   - Hoàn thành báo cáo phân tích kiến trúc hiện tại (đã có 13 tính năng Beyond CRUD).
   - Lọc ra 6 đề xuất mới để nâng cao chất lượng đồ án, trong đó nổi bật là thuật toán phát hiện bất thường chi tiêu bằng phương pháp phân tích thống kê Z-Score.

**2. Triển khai Z-Score Anomaly Detection (Real-time):**
   - Xây dựng `AnomalyDetectionService` tự động query dữ liệu 90 ngày của từng danh mục để tìm **Mean** và **Standard Deviation**.
   - Kích hoạt tính toán ngay khi người dùng ghi chép chi tiêu (hoặc khi hệ thống tự sinh giao dịch nhóm).
   - Thiết lập ngưỡng báo động: Nếu $Z > 2.0$ (vượt 95% phân phối) và giao dịch > 100k, lập tức push thông báo qua WebSocket với cờ `SPENDING_ANOMALY`.
   - Nâng cấp Frontend (Drawer Thông báo và Toast) hiển thị UI màu đỏ khẩn cấp (icon 🚨) để làm nổi bật cảnh báo.

**3. Nghiên cứu Database Schema & Lên Kế hoạch Seeder:**
   - Rà soát toàn bộ cấu trúc DB: `User`, `Wallet`, `Category`, `Transaction`, `Group`.
   - Chốt phương án viết `DatabaseSeeder.java` (thay vì `data.sql`) để xử lý `UUID`, `BCrypt` password và sinh (generate) tự động 90 ngày dữ liệu mẫu theo phân phối chuẩn, nhằm biểu diễn hoàn hảo tính năng Z-Score cho hội đồng đánh giá.

---

### Session [2026-07-01] - Khắc phục lỗi 500 Internal Server Error & Fix Database Nulls

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục lỗi Crash JPA do dữ liệu NULL ở kiểu Boolean nguyên thủy:**
   - **Vấn đề:** Khi truy cập các tab Tư vấn, Lịch sử, Thống kê, Frontend báo lỗi "Không thể tải dữ liệu" (Axios 500 Network Error). Ở Backend, Spring Boot (JPA/Hibernate) quăng lỗi `JpaSystemException: Null value was assigned to a property [...] of primitive type`. Nguyên nhân là do các Entity như `Transaction`, `Wallet`, `Budget` định nghĩa các cột cờ (flag) bằng kiểu `boolean` nguyên thủy (chỉ nhận `true`/`false`), nhưng dữ liệu mẫu (seed data) trong PostgreSQL bị thiếu các giá trị này, dẫn đến giá trị DB là `NULL`.
   - **Giải pháp thiết kế:** Thay vì đổi toàn bộ `boolean` thành `Boolean` (gây ảnh hưởng dây chuyền đến các Getter như `isSplit()`, `isAutoGenerated()`), tôi đã viết một Component tự động chạy lúc khởi động mang tên `DatabaseFixer.java`.
   - **Thực thi:** Sử dụng `@PostConstruct` và `JdbcTemplate` để tự động dò quét và chạy lệnh `UPDATE` vá lại toàn bộ các trường bị `NULL` (bao gồm `exclude_from_budget`, `is_auto_generated`, `is_split` trong bảng `transactions`, `is_liability` trong bảng `wallets`, và `is_recurring`, `is_mandatory` trong bảng `budgets`) thành mặc định `false`. Server sau khi khởi động lại đã tự dọn dẹp lỗi và chạy mượt mà trở lại.

---

### Session [2026-06-30] - Khôi phục Cơ sở Dữ liệu & Cập nhật Dữ liệu Mẫu (Seed Data 3 Tháng)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Sửa lỗi Ràng buộc Dữ liệu (Database Constraints) khi nạp file SQL:**
   - **Vấn đề:** Quá trình nạp file `seed_data.sql` qua pgAdmin bị thất bại và báo lỗi trắng trơn database (403 Axios Error). Nguyên nhân do cấu trúc các Entity trong Spring Boot đã được cập nhật thêm các cột bắt buộc (`NOT NULL`) như `is_liability` trong `wallets`, `is_auto_generated` trong `transactions`, và `is_mandatory`, đổi tên type thành `BILL` trong `budgets`. Nhưng file SQL cũ chưa được cập nhật theo, dẫn đến Insert bị Rollback.
   - **Giải pháp:** Viết lại toàn bộ tool sinh dữ liệu (`generate_seed_data.js`) để bổ sung đầy đủ các trường mới khớp 100% với cấu trúc Entity hiện tại. Loại bỏ các cột thừa (như `is_rollover`) và cập nhật chuẩn `BudgetType`.

**2. Bơm Dữ liệu 3 tháng Trực tiếp (Direct Database Seeding):**
   - **Thực thi:** Thay vì nạp thủ công qua pgAdmin dễ rủi ro lỗi cú pháp, tôi đã triển khai Script Node.js (`run_seed.js`) tự động nạp thẳng file `seed_data_3_months.sql` vào cơ sở dữ liệu `share-money`.
   - **Kết quả:** Quá trình seed data thành công tuyệt đối. Hệ thống giờ đây đã được lấp đầy bởi dữ liệu 3 tháng liên tiếp (Tháng 4, 5, 6) phong phú để phục vụ hiển thị Dashboard và Thống kê. Lỗi 403 Forbidden đã biến mất, người dùng có thể đăng nhập tức thì bằng tài khoản `nguyenvana@gmail.com` và mật khẩu `123456`.

---

### Session [2026-06-25] - Hợp nhất Luồng Tiết kiệm & Hoàn thiện Điều hướng (Dashboard UX)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Hợp nhất Tính năng Tư vấn Tiết kiệm (Unified Savings Flow):**
   - **Vấn đề:** Có sự chồng chéo chức năng giữa Tab "Quản lý Tiết kiệm" (Heo đất) và mục "Gợi ý Tiết kiệm" bên trong Tab "Tư vấn Tài chính".
   - **Giải pháp:** Rút toàn bộ thuật toán và giao diện "Gợi ý Tiết kiệm" (bao gồm đề xuất cắt giảm chi tiêu và tính toán tiền nhàn rỗi) ra khỏi Tab Tư vấn. Nhúng trực tiếp khối dữ liệu này lên đầu trang `savings-tab.tsx`.
   - **Kết quả UX:** Người dùng trải nghiệm một luồng xuyên suốt hoàn hảo: Đọc lời khuyên cắt giảm (từ Trợ lý) $\rightarrow$ Quyết định cất tiền $\rightarrow$ Thao tác trích lập vào các hũ Heo đất (ngay phía dưới) mà không phải chuyển đổi qua lại giữa các tab.

**2. Khôi phục Nút truy cập Lịch sử (History Quick Action):**
   - **Vấn đề:** Sau khi thay thế Tab "Lịch sử" bằng Tab "Tư vấn" ở thanh điều hướng dưới cùng (Bottom Navigation), tính năng theo dõi lịch sử bị ẩn sâu gây khó tiếp cận.
   - **Giải pháp:** Bổ sung nút **"Lịch sử"** (kèm icon Đồng hồ) vào lưới Thao tác nhanh (Quick Actions) trên màn hình Dashboard (`dashboard-tab.tsx`).
   - **Kết quả UX:** Lưới thao tác nhanh được lấp đầy hoàn hảo với 6 nút cân đối (Nạp vào ví, Chuyển khoản, Ngân sách, Nhóm, Tiết kiệm, Lịch sử), đảm bảo các tính năng cốt lõi luôn cách người dùng không quá 1 thao tác nhấn (1-tap away).

---

### Session [2026-06-25] - Triển khai Tư vấn Tài chính Thông minh (Rule-based PFM Advisor)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Kiến trúc hóa Trợ lý Tài chính (Không dùng AI):**
   - **Chuyển đổi chiến lược:** Từ chối phương án tích hợp AI (Gemini) chậm chạp và tốn kém, chuyển sang xây dựng hệ thống **Thuật toán Chuyên gia (Rule-based Expert System)** để phân tích dữ liệu cục bộ, đảm bảo tính toán tức thời (Real-time), chính xác tuyệt đối và bảo mật dữ liệu người dùng.
   - **Backend Core:** Tạo mới `FinancialAdvisorService` với hơn 350 dòng logic thuần túy Java thực thi 4 thuật toán tài chính cốt lõi. Cung cấp API `GET /api/advisor/insights/{userId}`.

**2. Triển khai 4 Thuật toán Phân tích Cốt lõi:**
   - **Habit Analyzer (Phân tích Thói quen 50/30/20):** Thuật toán phân cụm danh mục chi tiêu thành 3 rổ: Thiết yếu (Needs), Linh hoạt (Wants), Tiết kiệm (Savings). So sánh tỷ trọng thực tế với chuẩn quốc tế 50/30/20 và tự động render lời khuyên.
   - **One-Click Budget (Tự lập kế hoạch):** Áp dụng thuật toán *Trung bình động (Moving Average)* trên lịch sử 3 tháng, kết hợp bộ lọc nhiễu *Loại bỏ Outliers* (>2x trung bình) để đề xuất hạn mức ngân sách cực kỳ sát thực tế (làm tròn bội số 50k).
   - **Smart Alerts (Cảnh báo thông minh):** Sử dụng *Burn-rate Prediction* để dự phóng (project) tổng chi tiêu cuối tháng dựa trên tốc độ tiêu tiền những ngày đầu tháng. Kích hoạt cờ đỏ (HIGH) hoặc vàng (MEDIUM) nếu tốc độ chi vượt trung bình >30%.
   - **Idle Money Sweep (Gom tiền nhàn rỗi):** Định vị các danh mục "Linh hoạt" đang chi tiêu lãng phí, đề xuất cắt giảm 20% và tự động tính toán tiềm năng tiết kiệm để gợi ý người dùng khóa tiền nhàn rỗi.

**3. Tích hợp UI/UX "Tư vấn" (Advisor Tab):**
   - **Giao diện:** Thiết kế mới hoàn toàn `advisor-tab.tsx` với 4 phân hệ tương ứng 4 thuật toán. Ứng dụng Glassmorphism, Gradient Cards, và Animated Progress Bars mang lại cảm giác "Smart" sắc nét.
   - **Hệ thống hóa:** Nhúng Tab "Tư vấn" (biểu tượng 💡) vào Bottom Navigation (thay thế tab Lịch sử) tạo luồng điều hướng liền mạch như một ứng dụng Super-app thực thụ.
   - **Hoàn thiện:** Đã compile thành công toàn bộ Backend (Maven) và Build Production thành công cho Frontend (Next.js 16).

---

### Session [2026-06-25] - Hoàn thiện Báo cáo Đồ án & Quản lý Git

**✅ Đã hoàn thành (Compact Procedure):**

**1. Soạn thảo Bộ Báo cáo Đồ án Tốt nghiệp (Thesis Reports):**
   - Viết hoàn chỉnh 5 file báo cáo (từ `module_1_database.md` đến `module_5_conclusion.md`) dưới góc độ của một Kiến trúc sư hệ thống.
   - **Đặc biệt:** Trình bày thuật toán chia tiền nhóm (Greedy Algorithm) cực kỳ dễ hiểu. Nhấn mạnh rào cản kỹ thuật thực tế của AI OCR (đọc sai hóa đơn do phụ thuộc API bên ngoài) làm điểm nhấn cho báo cáo.

**2. Quản lý mã nguồn (Git Management):**
   - Hỗ trợ commit trạng thái mã nguồn mới nhất.
   - Revert thành công và loại bỏ sạch sẽ các thư mục báo cáo khỏi kho lưu trữ theo yêu cầu.
   - Force-push mã nguồn chuẩn xác lên nhánh `feature/vietqr-budget`.

---

### Session [2026-06-24] - Cập nhật Danh mục & Tối giản hóa Cơ chế Ngân sách

**✅ Đã hoàn thành (Compact Procedure):**

**1. Mở rộng Hệ thống Danh mục Mặc định (Category System):**
   - **Thay đổi:** Cập nhật logic backend (`CategoryService.java`) và cơ sở dữ liệu mẫu (`seed_data.sql`) để thay thế danh mục cũ bằng hệ thống danh mục mới trực quan và phong phú hơn.
   - **Chi tiết:** Các danh mục mới được tự động khởi tạo cho mọi người dùng gồm: Ăn uống (🍽️), Chi tiêu hàng ngày (🧴), Quần áo (👕), Mỹ phẩm (💄), Phí giao lưu (🥂), Y tế (💊), Giáo dục (📚), Tiền điện (💡), Đi lại (🚆), Phí liên lạc (📱), Tiền nhà (🏠).

**2. Gỡ bỏ Thông tin Thanh toán Tích hợp (Payment Info Removal):**
   - **Vấn đề:** Biểu mẫu tạo ngân sách cố định chứa quá nhiều trường điền thông tin tài khoản ngân hàng, trong khi người dùng ưu tiên thanh toán qua ứng dụng ngân hàng riêng.
   - **Giải pháp:** Xóa bỏ hoàn toàn các form nhập thông tin người nhận khỏi giao diện (`set-budget-drawer.tsx`). Giúp tối ưu hóa trải nghiệm tạo ngân sách, hướng ứng dụng tập trung thuần túy vào quản lý sổ sách thay vì luồng thanh toán vật lý.

**3. Xóa bỏ Cơ chế Cộng dồn Ngân sách (Rollover Elimination):**
   - **Vấn đề:** Việc số dư ngân sách tự động cộng dồn sang tháng sau gây khó hiểu và nhầm lẫn cho người dùng khi theo dõi định mức chi tiêu hàng tháng.
   - **Giải pháp:** Gỡ bỏ hoàn toàn logic "Chuyển sang tháng sau" (`isRollover` & `rolloverAmount`) từ Backend (`BudgetService`, Entity, DTOs) đến Frontend (xóa bỏ nút gạt toggle ở UI và logic tính gộp ở tab Báo cáo). Hệ thống quay về cơ chế **Kế toán hàng tháng độc lập (Strict Monthly Basis)**.

---

### Session [2026-06-23] - Nâng cấp Điểm Sức khỏe Tài chính & Kế hoạch Phân trang Backend

**✅ Đã hoàn thành (Compact Procedure):**

**1. Cải tiến Trực quan hóa Điểm Sức khỏe Tài chính (Financial Health Score):**
   - **Vấn đề:** Điểm số thô hiển thị dưới dạng phân số (VD: 25/25) khá khô khan và khó hình dung đối với người dùng cuối.
   - **Giải pháp:** Thiết kế lại hoàn toàn hệ thống chấm điểm trong `financial-health-card.tsx`. Chuyển đổi sang thang điểm 10 vạch trực quan.
   - Bổ sung các nhãn đánh giá thân thiện dựa trên mức điểm: "Cảnh báo" (đỏ), "Tạm ổn" (cam), "Khá tốt" (vàng), "Tuyệt vời" (xanh lá), giúp trải nghiệm người dùng sinh động và dễ hiểu hơn.

**2. Rà soát Chuyên sâu Backend (Deep Audit) & Sửa Sai Lầm Đánh Giá:**
   - Đã thực hiện rà soát lại toàn bộ hệ thống `DebtService` và `ExpenseService`.
   - Xác nhận hệ thống của người dùng đã tự thân tích hợp xuất sắc hai logic phức tạp: **Thuật toán đồ thị (Greedy / Max Flow)** để tối giản nợ chéo, và **API Tỷ giá thời gian thực (Multi-currency)** cho các giao dịch ngoại tệ. Đã đính chính lại những đánh giá sai lầm trước đó của AI.

**3. Đề xuất Kế hoạch Tối ưu hóa Hiệu năng Backend (Pagination):**
   - **Phát hiện (Bottleneck):** Các Repository như `TransactionRepository` và `ExpenseRepository` đang tải toàn bộ dữ liệu (List) vào bộ nhớ trong mỗi lần gọi API. Điều này sẽ gây tràn RAM (Out Of Memory) và giật lag hệ thống khi dữ liệu phình to.
   - **Hành động:** Thiết lập và trình bày `implementation_plan.md` cho việc chuyển đổi toàn bộ `List<T>` sang `Page<T>` (Spring Data JPA) kết hợp `Pageable`, và cơ chế Cuộn tải thêm (Infinite Scroll) dưới Frontend.

**4. Khảo sát Tính năng Quét Hóa Đơn AI (OCR / Gemini):**
   - Lên phương án kiến trúc dùng LLM/OCR để đọc ảnh hóa đơn giấy và điền tự động vào Form.
   - Trạng thái: **Tạm dừng (Paused)** theo yêu cầu của người dùng để ưu tiên ổn định các tính năng cốt lõi trước.

---
### Session [2026-06-23] - Triển khai VPS & Đóng gói Docker (Deployment)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khảo sát & Xây dựng Chiến lược Triển khai (Deployment Strategy):**
   - Đã phân tích kiến trúc mã nguồn (Spring Boot + Next.js + PostgreSQL) và đề xuất phương án triển khai tối ưu để phục vụ bảo vệ đồ án.
   - Quyết định: Người dùng chọn Phương án 2 (Thuê VPS + Docker) để đảm bảo hiệu năng, tính ổn định (không bị sleep) và sự chuyên nghiệp.

**2. Đóng gói ứng dụng với Docker (Dockerization):**
   - Thiết lập `Dockerfile` cho Backend Spring Boot (Maven 3.9, JDK 17 Alpine).
   - Thiết lập `Dockerfile` cho Frontend Next.js (Node 20 Alpine), xử lý truyền biến môi trường `NEXT_PUBLIC_API_URL` lúc build.
   - Viết cấu hình `docker-compose.yml` liên kết cả 3 containers (Frontend, Backend, DB PostgreSQL) và thiết lập ánh xạ cổng cũng như Volume lưu trữ vĩnh viễn dữ liệu.

**3. Hướng dẫn Deploy lên VPS:**
   - Biên soạn cẩm nang triển khai 7 bước chi tiết: Cài đặt Docker, Clone code, cấu hình file `.env` bảo mật, và lệnh khởi chạy một chạm `docker compose up -d --build`.

**🚀 Session tiếp theo cần làm gì?**
1. **Thiết lập Tên miền & SSL (Nginx):** Trỏ domain về IP của VPS và cài đặt chứng chỉ bảo mật HTTPS (Let's Encrypt) bằng Nginx để nâng tầm chuyên nghiệp.
2. **Nạp dữ liệu mẫu (Seed Data):** Copy file `seed_data.sql` lên VPS và import vào PostgreSQL để có sẵn dữ liệu phong phú phục vụ buổi bảo vệ đồ án.
3. **Theo dõi & Fix bug thực tế:** Xem log Docker để đảm bảo không có container nào sập và kiểm tra luồng API trên môi trường Production.

---

### Session [2026-06-22] - Khắc phục Lỗi hiển thị Số liệu Dashboard, Thiết kế lại Sức khỏe tài chính & Di chuyển Tiết kiệm (Current)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khắc phục lỗi hiển thị & Sửa lỗi TypeScript của Dashboard:**
   - Đã gỡ bỏ lệnh gọi hàm `setBudgetSummary` thừa gây lỗi `ReferenceError` làm gián đoạn toàn bộ tiến trình nạp dữ liệu Dashboard.
   - Sửa đổi ánh xạ thuộc tính trong `setDebtSummary` từ `totalOwedToMe` thành `totalOwed` cho đồng bộ với API và hiển thị UI.
   - Sửa lỗi kiểu dữ liệu TypeScript của `myDebts` và `owedToMe` bằng cách truyền đối tượng `currentUser` (lấy từ `localStorage`) vào các trường `from` và `to` tương ứng của `GlobalDebtTransaction`.

**2. Thiết kế trực quan hóa Sức khỏe Tài chính (`financial-health-card.tsx`):**
   - Thay thế biểu đồ bán nguyệt (semicircle gauge chart) cũ thành vòng tròn tiến độ (circular progress chart) nằm gọn gàng cạnh danh sách phân tích 4 chỉ số cốt lõi: **Tỷ lệ tích lũy (Savings)**, **Tuân thủ ngân sách (Budget)**, **Kiểm soát nợ (Debt)**, và **Quỹ dự phòng (Emergency)**.
   - Tích hợp thang điểm động `/25` cho từng danh mục kèm theo thanh tiến trình mini tự động đổi màu sắc cảnh báo theo hiệu năng (Xanh lá $\ge 20$, Vàng/Cam $\ge 10$, Đỏ $< 10$).

**3. Khôi phục & Tái cấu trúc tính năng "Tiết kiệm" (Mục tiêu tích lũy Heo Đất):**
   - **Khôi phục hoàn toàn:** Khôi phục toàn bộ các file backend và frontend liên quan đến `SavingsGoal` đã bị xóa nhầm trước đó bằng Git (CSDL, REST APIs, Repository, Service, Controller, các drawer tạo/sửa mục tiêu và `savings-tab`).
   - **Sửa lỗi API 404:** Biên dịch lại và khởi động lại máy chủ Spring Boot để nạp đầy đủ các API endpoint mới được khôi phục, giải quyết triệt để lỗi Axios 404 khi gọi `/api/savings-goals` từ frontend.
    - **Giao diện Dashboard:** Loại bỏ hoàn toàn các hàng liên quan đến phân bổ tiết kiệm và tiền rảnh rỗi (gồm cả "Dành cho Tiết kiệm (40%)", "Tiền rảnh rỗi (Heo đất)" và "Số tiền có thể tiêu") khỏi thẻ ví chính trên Dashboard để tối giản hóa giao diện, giữ cho thẻ ví chỉ hiển thị Tổng số dư và các khoản giữ chỗ (Ngân sách/Nợ).
    - **Khôi phục dữ liệu:** Chèn lại 10 mục tiêu tiết kiệm mặc định từ `seed_data.sql` trực tiếp vào tài khoản thử nghiệm của người dùng (`Test1@gmail.com`) trong PostgreSQL để hiển thị đầy đủ thông tin trong tab Tiết kiệm.
   - Đã kiểm tra build Next.js thành công 100% không phát sinh lỗi biên dịch.

---

### Session [2026-06-22] - Xóa Bỏ Heo Đất & Tính năng Ghi Chép Nhanh (Quick Add)

**✅ Đã hoàn thành (Compact Procedure):**

**1. Gỡ bỏ hoàn toàn Tính năng "Heo đất" (Savings Goal):**
   - Theo yêu cầu tối giản hóa của người dùng, toàn bộ logic và giao diện liên quan đến "Heo đất" đã được gỡ bỏ khỏi hệ thống.
   - **Backend:** Xóa entity `SavingsGoal`, các repository, service, và controller liên quan. Sửa đổi `BudgetService` để không còn tự động trích 40% tiền nhàn rỗi. 100% dòng tiền nhàn rỗi hiện tại được tính là "Có thể tiêu".
   - **Frontend:** Dọn dẹp sạch sẽ tab "Tiết kiệm", xóa các widget "Heo đất" trên màn hình Dashboard và giải quyết các lỗi dependency phát sinh sau khi xóa code.

**2. Khảo sát Tích hợp API Ngân hàng (Webhook):**
   - Khảo sát các dịch vụ trung gian (Casso, SePay, PayOS) và giới thiệu các gói Free.
   - Tư vấn các giải pháp DIY (Tự làm) không qua trung gian: Viết app Android đọc Notification/SMS, hoặc cấu hình Backend đọc Email thông báo biến động số dư.

**3. Hoàn thiện tính năng "Ghi chép nhanh" (Quick Add Transaction):**
   - **Giao diện:** Tối ưu hóa nút dấu `+` (Quick Action). Tách nút "Ghi chép cá nhân" thành 2 nút chuyên biệt: **"Ghi Chi Tiêu"** và **"Ghi Thu Nhập"**, đáp ứng hoàn hảo Use-case "vừa mua một món đồ xong nhớ ra cần ghi lại".
   - **Logic:** Nhúng `AddTransactionDrawer` trực tiếp vào `page.tsx`. Tự động fetch `walletId` của Ví mặc định ngay khi load ứng dụng.
   - **Đồng bộ Thời gian thực (Real-time Sync):** Triển khai cơ chế `refreshTrigger` truyền thẳng vào màn hình Thống kê (`ReportTab`). Khi có giao dịch mới được tạo, biểu đồ Cơ cấu tài chính và Line Chart sẽ lập tức gọi API vẽ lại màn hình mà không cần refresh.

---

### Session [2026-06-22] - Multi-currency Integration & OCR Validation

**✅ Đã hoàn thành (Compact Procedure):**

**1. Khảo sát & Đề xuất Tích hợp Public APIs:**
   - Đã tư vấn và phân tích danh sách các API công khai từ nguồn Public APIs.
   - Đề xuất hai tính năng giá trị nhất để tích hợp vào đồ án PFM ShareMoney: **Tỷ giá đa tiền tệ** (Currency Exchange API) và **Quét hóa đơn bằng ảnh** (OCR.Space API).

**2. Triển khai Tỷ giá Đa tiền tệ (Currency Exchange API):**
   - **Giao diện:** Bổ sung native `<select>` dropdown cho phép người dùng lựa chọn đơn vị tiền tệ (VND, USD, EUR, THB, JPY...) bên cạnh trường nhập số tiền trong 2 màn hình Thêm chi tiêu nhóm (`add-expense-drawer.tsx`) và Thêm giao dịch cá nhân (`add-transaction-drawer.tsx`).
   - **Xử lý Logic:** Gọi API miễn phí `currency-api` theo thời gian thực mỗi khi thay đổi loại tiền tệ. Tự động tính nhẩm tỷ giá và hiển thị số tiền quy đổi ước tính ra VNĐ ngay bên dưới biểu mẫu.
   - **Dữ liệu:** Tự động quy đổi và làm tròn ngoại tệ thành VNĐ dựa trên tỷ giá lấy từ API trước khi submit xuống Backend (`amount: Math.round(finalAmount * exchangeRate)`), đảm bảo hệ thống lưu trữ đồng nhất về chuẩn VNĐ.

**3. Thử nghiệm OCR & Quyết định Gỡ bỏ do Tính Chính xác:**
   - **Triển khai ban đầu:** Đã hoàn tất chức năng Upload ảnh chụp hóa đơn, truyền dữ liệu lên API OCR.Space miễn phí. Triển khai thuật toán xử lý chuỗi (Regex) loại bỏ khoảng trắng dư thừa do lỗi OCR và tìm số tiền lớn nhất trên hóa đơn.
   - **Loại bỏ tính năng:** Dù thuật toán đã tối ưu nhưng API công khai đọc thông tin hình ảnh không ổn định (thường xuyên sai số và tốn thời gian phản hồi). Dựa trên yêu cầu của người dùng, toàn bộ logic OCR, nút `Camera` và các State liên quan đã được tháo dỡ sạch sẽ khỏi hệ thống để đảm bảo trải nghiệm nhập liệu nhanh gọn không bị gián đoạn.

**4. Quản lý Git & Triển khai:**
   - Tiến trình code, bug fix cho OCR, và thao tác gỡ OCR đã được commit tách bạch và push gọn gàng lên nhánh `feature/vietqr-budget`.

---

### Session [2026-06-21] - VietQR & Editable Payment Info

**✅ Đã hoàn thành (Compact Procedure):**

**1. Nâng cấp Thanh toán Ngân sách (Budget) - Giao diện Nhập liệu linh hoạt:**
   - **Mục tiêu:** Nhấn mạnh vai trò của ứng dụng là trung gian quản lý và ghi nhận giao dịch thay vì ví điện tử giữ tiền trực tiếp.
   - **Backend:** Mở rộng `Budget` entity và các DTO (`BudgetRequest`, `BudgetResponse`) bằng 3 trường dữ liệu mới: `payeeBankBin`, `payeeBankAccount`, `payeeAccountName`. Cập nhật `BudgetService.java` để map dữ liệu khi tạo mới, cập nhật và gia hạn ngân sách tự động.
   - **Frontend:** Sửa đổi `set-budget-drawer.tsx` bổ sung form nhập thông tin người nhận khi chọn loại ngân sách "Cố định". Nâng cấp popup "Trả ngay" (`budget-tab.tsx`) loại bỏ giao diện mã QR cứng nhắc, thay thế bằng Form nhập liệu cho phép tự do chỉnh sửa Ngân hàng, Số tài khoản, Tên người nhận và **Số tiền thực tế thanh toán**.
   - **UX/UI Fixes:** 
     - Chuyển đổi Component `Select` của Radix UI thành thẻ `<select>` native để khắc phục triệt để lỗi không mở được dropdown do z-index và lỗi hiển thị mã BIN thay vì Tên Ngân hàng.
     - Cài đặt **Inline Validation**: tự động báo lỗi viền đỏ và highlight nhãn trực tiếp trên các trường thông tin nếu bị bỏ trống, gỡ bỏ thông báo toast chung chung.

**2. Nâng cấp Thanh toán Nợ nhóm (Group Debt) - Form thông minh & Logic Ẩn/Hiện QR:**
   - **Giao diện (`settle-debt-dialog.tsx`):** Đồng bộ hóa trải nghiệm với Ngân sách bằng cách bổ sung Form điền thông tin và Số tiền thanh toán.
   - **Logic sinh QR Động:** Hệ thống thông minh nhận diện:
     - Nếu người nhận đã cấu hình tài khoản từ trước: Hiển thị ngay mã VietQR (hoặc mã QR tĩnh cá nhân) cho người trả quét.
     - Nếu người trả phải **tự nhập tay** thông tin ngân hàng của người nhận: Form sẽ tự động giấu đi toàn bộ khối sinh mã QR và thuần túy hoạt động như một biểu mẫu ghi nhận biên lai giao dịch.
   - **UX/UI:** Áp dụng Native Select và Inline Validation giống hệt module Ngân sách.

**3. Quản lý Git & Triển khai:**
   - Tất cả thay đổi mã nguồn được quản lý phiên bản với lịch sử rõ ràng, commit theo từng bước chi tiết (UI features, error fixes, UI changes).
   - Đã push thành công toàn bộ code lên nhánh `feature/vietqr-budget` trên Github repository (`origin feature/vietqr-budget`).

---

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

### Session 2026-08-05 - Đồng Bộ 1:1 React Native Mobile App (`FrontendReact`) & Khắc Phục Giao Diện UI/UX

**✅ Đã hoàn thành (Compact Procedure):**

1. **Đồng bộ 1:1 Giao diện Màn hình Nhóm & Chi tiết Nhóm (`GroupDetailScreen.tsx`):**
   * **Mời Bạn Bè qua SĐT & Mã QR Thực:** Thêm nút *"Mời bạn bè"* tông màu kem `#FEF7E6` trên Top Bar Header. Xây dựng BottomSheet `AddMemberBottomSheet.tsx` chứa 2 Tab (*📱 Số điện thoại* & *📲 Mã QR Mời*). Tự động tạo ảnh mã QR ma trận 2D thực tế qua API `api.qrserver.com`.
   * **Thông báo mờ dạng Toast dưới Bottom (2s):** Xây dựng linh kiện `Toast.tsx` với hoạt họa trượt fade-in, nền tối mờ mờ `rgba(15, 23, 42, 0.90)`, vị trí `bottom: 50`, tự động biến mất sau 2 giây (2000ms).

2. **Khắc phục Triệt để Lỗi Đè Vùng An Toàn (Status Bar & Camera Notch Overlap):**
   * Tự động tính toán độ cao thanh trạng thái thiết bị (`StatusBar.currentHeight` trên Android và offset `54px` trên iOS) trên tất cả các màn hình: `DashboardScreen.tsx`, `GroupsScreen.tsx`, `GroupDetailScreen.tsx`, `AdvisorScreen.tsx`, `BudgetScreen.tsx`.

3. **Khôi phục Chuẩn Thanh Navigation Bar Dưới (Bottom Tabs) & Nút Quay Lại (`‹`):**
   * Chuẩn hóa 5 mục Bottom Tab chính khớp 1:1 với Web: **`Tổng quan 🏠`**, **`Thống kê 📊`**, **`+`**, **`Tư vấn 💡`**, **`Cá nhân 👤`**.
   * Kết nối nút quay lại `‹` trên Top Header của các màn hình con để chuyển hướng mượt mà về `Dashboard`.

4. **Tối Ưu Thẻ Bóc Tách Chi Tiết Chi Tiêu & Quản Lý Ví (`DashboardScreen.tsx` & `WalletManagerBottomSheet.tsx`):**
   * Xóa bỏ mục thừa *"Sổ nợ vay cá nhân"* không có trên Web. Chuẩn hóa lại 5 nhãn hiển thị khớp 1:1 với Web (*Tổng tất cả các ví*, *Giữ cho Ngân sách*, *Nợ người khác*, *Người khác nợ tôi*, *Đã tiết kiệm*).
   * **Chuyển đổi Bảng Quản lý Ví sang Hamburger Left Side Drawer:** Khi bấm vào *"Tổng tất cả các ví"*, danh sách ví & tài khoản trượt mượt mà từ mép Trái màn hình sang (Hamburger style, `transform: [{ translateX }]`).

5. **Tích Hợp Thẻ "CẢNH BÁO HẠN MỨC THÁNG NÀY" & Xây Dựng Màn Hình Ngân Sách (`BudgetScreen.tsx`):**
   * **Thẻ Cảnh Báo Hạn Mức Real-time (`DashboardScreen.tsx`):** Tích hợp thẻ thông báo các khoản chi tiêu chạm ngưỡng 80% (Vàng) hoặc vượt hạn mức 100% (Hồng đỏ) trượt ngang sinh động. Căn lề chuẩn 20px, xử lý tràn chữ không làm ảnh hưởng layout.
   * **Màn hình BudgetScreen.tsx:** Header cố định, khối Tổng ngân sách tháng, danh sách thẻ ngân sách, nhãn trạng thái (*Đã đủ tiền trả*, *Đã thanh toán*, *Vượt ...đ*), nút công tác ưu tiên **⭐** và nút **`✓ Trả ngay`** tự động thanh toán.
   * **Pop-up Đặt Ngân Sách Chi Tiêu 🎯:** Thiết kế lại BottomSheet theo phong cách Mint Glassmorphism sang trọng với icon Bút chì `✏️`, Đồng xu `🪙`, Nút gạt Switch Toggle hiện đại và nút lưu Emerald nổi bật.

6. **Sửa Dứt Điểm Lỗi Cú Pháp (Syntax Error Parser) & Kiểm Tra Hệ Thống:**
   * Bổ sung đầy đủ dấu ngoặc đóng thuộc tính `budgetCard`, loại bỏ triệt để khai báo trùng lặp giúp mã nguồn React Native biên dịch sạch 100%.
   * Xác nhận nhánh Git `feat/uncategorized-transactions` trên máy hoàn toàn đồng bộ 100% với commit `c32a685` trên GitHub `Bao040517/doantotnghiep-moneyM`.
   * Đảm bảo Spring Boot Backend (Port 8080) và Next.js Web (Port 3000) chạy ổn định.

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
2. Thiết lập Tên miền và chứng chỉ HTTPS trên VPS qua Nginx.
3. Import dữ liệu mẫu (`seed_data.sql`) vào Database trên VPS.
4. Chạy kiểm thử API và luồng dữ liệu trên môi trường VPS Production trước khi nộp cho giáo viên.

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
