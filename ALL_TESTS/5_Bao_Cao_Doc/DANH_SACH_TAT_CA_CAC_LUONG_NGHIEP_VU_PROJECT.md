# 📑 TỔNG HỢP TOÀN BỘ TẤT CẢ CÁC LUỒNG NGHIỆP VỤ HỆ THỐNG SHAREMONEY
**Dự án**: ShareMoney - Hệ thống Quản lý Tài chính Cá nhân (PFM) & Chia tiền Nhóm Thông minh  
**Phục vụ**: Báo cáo Đồ án / Khóa luận Tốt nghiệp & Thuyết minh Hội đồng  
**Kiến trúc**: Spring Boot 3 + PostgreSQL (Supabase/AWS EC2) + React Native Expo (Android/iOS) + Google Gemini AI  

---

## 🗺️ TỔNG QUAN 11 PHÂN HỆ & 75 LUỒNG NGHIỆP VỤ KHÉP KÍN

---

### PHÂN HỆ 1: XÁC THỰC, PHÂN QUYỀN & BẢO MẬT (AUTH & SECURITY)

1. **Luồng 1.1: Đăng ký tài khoản mới**
   - *Quy trình*: Người dùng nhập Họ tên, Email, Mật khẩu -> Frontend kiểm tra Regex Gmail (`@gmail.com`) và mật khẩu phức hợp (>= 6 ký tự gồm cả chữ và số) -> Backend chuẩn hóa email (`trim().toLowerCase()`), kiểm tra trùng lặp trong DB -> Băm mật khẩu bằng BCrypt -> Tạo User mới -> Cấp JWT Access Token và Refresh Token -> Chuyển thẳng vào Dashboard.
2. **Luồng 1.2: Đăng nhập hệ thống**
   - *Quy trình*: Người dùng nhập Email và Mật khẩu -> Backend xác thực qua `AuthenticationManager` -> So khớp mật khẩu BCrypt -> Trả về Access Token (hạn 15 phút), Refresh Token (hạn 7 ngày) và thông tin tóm tắt User.
3. **Luồng 1.3: Làm mới Token tự động (Silent Refresh Token Interceptor)**
   - *Quy trình*: Khi Access Token hết hạn, API trả về `401 Unauthorized` -> Axios Response Interceptor chặn lại -> Đưa request vào hàng đợi -> Gọi âm thầm `/api/auth/refresh` bằng Refresh Token -> Nhận Access Token mới và Refresh Token mới (Cơ chế Token Rotation) -> Tự động thử lại request ban đầu mà người dùng không bị văng ra màn hình đăng nhập.
4. **Luồng 1.4: Quên mật khẩu & Gửi mã OTP qua Gmail SMTP**
   - *Quy trình*: Người dùng bấm *"Quên mật khẩu?"* -> Nhập Email -> Backend kiểm tra email tồn tại -> Sinh mã OTP ngẫu nhiên 6 chữ số (`SecureRandom`) -> Lưu vào bộ nhớ tạm Thread-safe (`ConcurrentHashMap`) kèm thời gian sống 5 phút (TTL 300s) -> Gửi email HTML ShareMoney qua Gmail SMTP `ducbao040517@gmail.com`.
5. **Luồng 1.5: Xác thực OTP, Chống Brute-force & Đặt lại mật khẩu mới**
   - *Quy trình*: Người dùng nhập mã OTP 6 số và mật khẩu mới -> Backend kiểm tra: Nếu mã sai tăng biến đếm số lần thử, nếu sai quá 5 lần thì hủy mã và khóa chống brute-force -> Nếu mã đúng và còn hạn: Mã hóa BCrypt mật khẩu mới, cập nhật vào bảng `users`, xóa mã OTP khỏi bộ nhớ -> Frontend hiển thị màn hình chúc mừng Bước 3 và nút Đăng nhập lại.
6. **Luồng 1.6: Đăng xuất an toàn & Thu hồi Token**
   - *Quy trình*: Người dùng bấm Đăng xuất -> Gọi API `/api/auth/logout` -> Backend đánh dấu `revoked = true` cho Refresh Token trong DB -> Frontend xóa sạch Access Token và Refresh Token trong bộ nhớ mã hóa `safeStorage` -> Chuyển về màn hình đăng nhập.
7. **Luồng 1.7: Tự động xóa phiên và đăng xuất cấp ngân hàng khi thoát App (`AppState`)**
   - *Quy trình*: Ứng dụng lắng nghe sự kiện `AppState.addEventListener('change')` -> Khi người dùng chuyển app sang chạy nền (background) hoặc đóng app -> Tự động xóa sạch token trong máy -> Khi mở lại app bắt buộc phải đăng nhập lại để bảo vệ thông tin tài chính cá nhân.
8. **Luồng 1.8: Bộ lọc giới hạn tần suất yêu cầu (Rate Limiting Filter chống DDoS)**
   - *Quy trình*: Mỗi request đi qua `RateLimitingFilter` -> Kiểm tra IP theo thuật toán Fixed Window (60 req/phút cho API thường, 10 req/phút cho API Auth) -> Nếu vượt ngưỡng trả về `HTTP 429 Too Many Requests` kèm thông báo *"Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút"*.

---

### PHÂN HỆ 2: HỒ SƠ NGƯỜI DÙNG & TÀI KHOẢN NGÂN HÀNG (PROFILE & VIETQR)

9. **Luồng 2.1: Hiển thị hồ sơ cá nhân & Trạng thái Empty State**
   - *Quy trình*: Mở tab Tài khoản -> Gọi API `/api/users/me` -> Nếu tài khoản mới chưa có STK ngân hàng: Hiển thị thẻ nét đứt Empty State sạch sẽ kèm biểu tượng placeholder và nút `+ Cấu hình` (loại bỏ hoàn toàn dữ liệu hardcode ảo).
10. **Luồng 2.2: Cập nhật thông tin cơ bản (Họ tên, Số điện thoại)**
    - *Quy trình*: Người dùng sửa Họ tên / SĐT -> Kiểm tra số điện thoại không trùng với người khác trong DB -> Lưu thay đổi và đồng bộ Profile tức thì.
11. **Luồng 2.3: Đổi ảnh đại diện cá nhân (Avatar)**
    - *Quy trình*: Người dùng bấm đổi Avatar -> Mở Thư viện ảnh (`expo-image-picker`) hoặc chọn từ bộ sưu tập Avatar Vector -> Nén ảnh chất lượng cao dạng base64/URI -> Gọi API `/api/users/me/avatar` -> Cập nhật avatar trên toàn bộ hệ thống.
12. **Luồng 2.4: Cấu hình Tài khoản Ngân hàng chính (VietQR Napas247)**
    - *Quy trình*: Bấm `+ Cấu hình` -> Mở modal chọn ngân hàng từ danh sách 50+ ngân hàng Việt Nam (MB, VCB, TCB, ACB, VPB...) -> Nhập STK -> Hệ thống tự động gọi API VietQR Lookup tra cứu tên chủ tài khoản thực tế -> Người dùng xác nhận lưu -> Hệ thống lưu `bankBin`, `bankAccountNo`, `bankAccountName`.
13. **Luồng 2.5: Cấu hình Tài khoản Ngân hàng Tiết kiệm (Savings Bank)**
    - *Quy trình*: Tương tự ngân hàng chính, người dùng thiết lập riêng 1 tài khoản chuyên nhận tiền tiết kiệm hoặc hũ tích lũy -> Phục vụ cho việc nhận phân bổ tiền tiết kiệm tự động.
14. **Luồng 2.6: Sinh & Chia sẻ Mã QR cá nhân nhận tiền**
    - *Quy trình*: Vào màn hình Mã QR của tôi -> Hệ thống tự động render mã VietQR tĩnh chứa thông tin STK và Tên chủ thẻ -> Cho phép Lưu ảnh vào thư viện thiết bị (`expo-media-library`) hoặc Chia sẻ qua Zalo/Messenger/AirDrop.
15. **Luồng 2.7: Đăng ký mã Expo Push Token nhận thông báo Native**
    - *Quy trình*: Khi đăng nhập thành công -> Thiết bị di động cấp quyền Notification -> Ứng dụng lấy `pushToken` gửi lên API `/api/users/me/push-token` -> Backend lưu lại để bắn thông báo Native ra màn hình khóa khi có biến động tài chính.

---

### PHÂN HỆ 3: QUẢN LÝ VÍ & TÀI SẢN CÁ NHÂN (WALLETS & NET WORTH)

16. **Luồng 3.1: Tự động tạo Ví Tiền mặt mặc định khi khởi tạo (Cold-start)**
    - *Quy trình*: Khi user mới đăng ký chưa có ví -> API `/api/wallets` tự động khởi tạo 1 ví "Tiền mặt", số dư 0đ, đơn vị "VND" để user có thể bắt đầu ghi chép ngay.
17. **Luồng 3.2: Tạo ví tài chính mới**
    - *Quy trình*: Bấm `+ Thêm ví` -> Chọn loại ví: Ví Tiền mặt, Ví Tài khoản Ngân hàng, hoặc Ví Nợ / Thẻ tín dụng thấu chi (`isLiability = true`) -> Nhập số dư ban đầu -> Lưu vào DB.
18. **Luồng 3.3: Chỉnh sửa thông tin ví**
    - *Quy trình*: Sửa tên ví, STK liên kết, tên ngân hàng -> Backend kiểm tra quyền sở hữu (`userId`) và cập nhật bản ghi trong bảng `wallets`.
19. **Luồng 3.4: Xóa ví an toàn & Chặn xóa ví có giao dịch**
    - *Quy trình*: Người dùng bấm Xóa ví -> Backend kiểm tra trong bảng `transactions`: Nếu ví đã có bất kỳ giao dịch nào -> Chặn lại và ném `WALLET_HAS_TRANSACTIONS (400)` để bảo vệ dữ liệu kế toán; Nếu ví trống -> Xóa thành công.
20. **Luồng 3.5: Tính toán Tổng tài sản ròng (Net Worth)**
    - *Quy trình*: Gọi API `/api/wallets/total-balance` -> Backend lấy danh sách ví: Cộng dồn số dư tất cả ví tài sản (`isLiability = false`) và trừ đi số dư tất cả ví nợ (`isLiability = true`) -> Hiển thị con số tài sản ròng chính xác trên trang chủ.

---

### PHÂN HỆ 4: QUẢN LÝ GIAO DỊCH THU/CHI CÁ NHÂN (TRANSACTIONS)

21. **Luồng 4.1: Ghi nhận giao dịch Chi tiêu cá nhân**
    - *Quy trình*: Chọn Ví -> Nhập số tiền, Danh mục (Ăn uống, Tiền nhà, Mua sắm...), Ngày giao dịch, Ghi chú -> Bấm Lưu -> Backend tạo bản ghi `Transaction (type = EXPENSE)`, tự động trừ số dư ví nguồn, kiểm tra liên kết với Ngân sách và kích hoạt bộ quét phát hiện bất thường.
22. **Luồng 4.2: Ghi nhận giao dịch Thu nhập cá nhân**
    - *Quy trình*: Chọn Ví -> Nhập số tiền, Danh mục (Tiền lương, Thưởng, Lãi đầu tư...) -> Bấm Lưu -> Backend tạo `Transaction (type = INCOME)`, tự động cộng số dư ví nguồn.
23. **Luồng 4.3: Ghi nhận giao dịch có Người thụ hưởng (Payee Directory)**
    - *Quy trình*: Khi nhập tên người nhận tiền -> Backend kiểm tra bảng `payees`: Nếu chưa có thì tự động tạo mới Payee liên kết với user; Nếu có rồi thì gắn `payeeId` vào giao dịch.
24. **Luồng 4.4: Gắn thẻ Tag và Phân loại chi tiêu**
    - *Quy trình*: Người dùng nhập các hashtag (ví dụ: `#dulich`, `#damcuoi`) -> Backend tự động tạo bản ghi trong bảng `tags` và bảng liên kết `transaction_tags`.
25. **Luồng 4.5: Chia tách giao dịch đơn lẻ vào nhiều danh mục (Split Transaction)**
    - *Quy trình*: 1 hóa đơn đi siêu thị 500.000đ gồm 300k Thực phẩm và 200k Đồ gia dụng -> Bấm "Chia nhỏ danh mục" -> Nhập số tiền từng phần -> Backend kiểm tra tổng các phần phải bằng đúng 500k -> Tạo 2 bản ghi `TransactionSplit` gắn vào Transaction cha.
26. **Luồng 4.6: Chỉnh sửa giao dịch**
    - *Quy trình*: Người dùng sửa số tiền hoặc ví -> Backend tự động hoàn tiền lại ví cũ, trừ/cộng tiền vào ví mới và cập nhật bản ghi Transaction nguyên tử trong 1 Transaction DB.
27. **Luồng 4.7: Xóa giao dịch**
    - *Quy trình*: Người dùng bấm Xóa giao dịch -> Backend tự động khôi phục số dư ví về nguyên trạng ban đầu trước khi xóa bản ghi.
28. **Luồng 4.8: Lọc và phân trang lịch sử giao dịch**
    - *Quy trình*: Lọc theo Tháng/Năm, Danh mục, Khoảng thời gian, Loại thu/chi -> Phân trang 20 giao dịch/trang, sắp xếp theo thời gian mới nhất.
29. **Luồng 4.9: Tự động bắt biến động số dư từ SMS / Clipboard ngân hàng**
    - *Quy trình*: Khi copy tin nhắn biến động số dư từ app ngân hàng -> Mở ShareMoney -> Ứng dụng tự động phát hiện thông báo qua Clipboard -> Bóc tách Số tiền, Ngân hàng, Chiều biến động trong <1ms -> Mở Popup 1-chạm xác nhận tạo giao dịch tức thì.

---

### PHÂN HỆ 5: QUẢN LÝ NGÂN SÁCH & CẢNH BÁO CHI TIÊU (BUDGETS)

30. **Luồng 5.1: Thiết lập ngân sách linh hoạt (FLEXIBLE Budget)**
    - *Quy trình*: Chọn Danh mục (ví dụ Ăn uống) -> Nhập Hạn mức (ví dụ 3.000.000đ/tháng) -> Chọn Tháng/Năm -> Backend lưu ngân sách vào bảng `budgets`.
31. **Luồng 5.2: Thiết lập ngân sách định kỳ bắt buộc (RECURRING BILL Budget)**
    - *Quy trình*: Chọn danh mục Cố định (Tiền nhà, Tiền điện, Tiền nước Sawaco, Internet) -> Đánh dấu `isRecurring = true` và `isMandatory = true` -> Nhập Ngày đến hạn hàng tháng và STK ngân hàng người nhận -> Hệ thống hỗ trợ nút "Trả ngay 1-chạm" mở VietQR khi đến ngày.
32. **Luồng 5.3: Thuật toán tính toán chi tiêu không hồi tố (`Creation-Date Aware`)**
    - *Quy trình*: Nếu ngân sách tạo mới giữa tháng: Hệ thống chỉ đếm các giao dịch phát sinh từ sau thời điểm tạo `createdAt` trở đi (tránh lỗi vừa tạo ngân sách đã bị báo vượt do cộng dồn chi tiêu cũ); Nếu ngân sách định kỳ tự gia hạn: Đếm toàn bộ giao dịch trong tháng.
33. **Luồng 5.4: Giám sát tiến độ ngân sách & Cảnh báo 2 cấp**
    - *Quy trình*: Mỗi khi có giao dịch mới -> Tính toán tỷ lệ `% Đã chi = (Đã chi / Hạn mức) * 100`:
      - Dưới 80%: Thanh tiến độ màu Xanh lá (An toàn).
      - Từ 80% đến 99%: Đổi màu Vàng cam, bắn cảnh báo *"Bạn đã chi tiêu vượt 80% ngân sách"*.
      - Từ 100% trở lên: Đổi màu Đỏ rực, hiển thị thẻ cảnh báo *"Vượt X đồng"*.
34. **Luồng 5.5: Đánh dấu sao ưu tiên ngân sách (Star Toggle & Dynamic Sorting)**
    - *Quy trình*: Người dùng bấm biểu tượng Ngôi sao ⭐ trên thẻ ngân sách -> Đổi màu Vàng -> Hệ thống tự động đẩy các khoản ngân sách quan trọng lên đầu danh sách.
35. **Luồng 5.6: Xem chi tiết lịch sử chi tiêu của ngân sách trực tiếp trong Popup**
    - *Quy trình*: Bấm vào thẻ ngân sách -> Mở Pop-up nổi ở giữa màn hình -> Hiển thị danh sách tất cả các hóa đơn chi tiêu thuộc danh mục đó trong tháng kèm nút Xóa/Sửa trực tiếp.
36. **Luồng 5.7: Tự động gia hạn ngân sách sang chu kỳ tháng mới**
    - *Quy trình*: Khi bước sang ngày đầu tiên của tháng mới -> Hệ thống tự động quét các ngân sách `isRecurring = true` và sao chép sang tháng mới với số tiền đã chi reset về 0đ.

---

### PHÂN HỆ 6: HŨ TIẾT KIỆM & BẢO VỆ QUỸ DỰ TRỮ (SAVINGS GOALS)

37. **Luồng 6.1: Tạo mục tiêu tiết kiệm heo đất mới**
    - *Quy trình*: Nhập Tên mục tiêu (Mua xe máy, Mua laptop, Quỹ du lịch...), Số tiền đích cần tích lũy, Ngày hạn chót (Deadline) -> Tạo bản ghi `SavingsGoal` trạng thái `IN_PROGRESS`.
38. **Luồng 6.2: Nạp tiền thủ công vào hũ tiết kiệm**
    - *Quy trình*: Bấm `+ Nạp tiền` -> Chọn Ví nguồn -> Nhập số tiền nạp -> Backend trừ tiền ví nguồn và cộng vào `currentAmount` của hũ tiết kiệm -> Cập nhật thanh tiến độ % hoàn thành.
39. **Luồng 6.3: Rút tiền từ hũ tiết kiệm về ví cá nhân**
    - *Quy trình*: Bấm `Rút tiền` -> Chọn Ví đích -> Nhập số tiền rút -> Backend kiểm tra số tiền rút không được vượt quá số dư hiện có trong hũ (`INSUFFICIENT_SAVINGS_BALANCE`) -> Trừ tiền hũ và cộng trả lại ví đích.
40. **Luồng 6.4: Tự động hoàn thành mục tiêu tiết kiệm**
    - *Quy trình*: Khi số tiền tích lũy `currentAmount >= targetAmount` -> Hệ thống tự động đổi trạng thái sang `COMPLETED`, bắn thông báo chúc mừng và phát âm thanh ăn mừng.
41. **Luồng 6.5: Tự động phân bổ tiền tiết kiệm đa ví khả dụng (Auto-Allocation Engine)**
    - *Quy trình*: Khi kích hoạt phân bổ tự động cuối tháng -> Thuật toán quét tất cả các ví tiền mặt/ngân hàng khả dụng, sắp xếp giảm dần và trích lũy tiến tiền nhàn rỗi phân bổ đều vào các hũ tiết kiệm dựa theo độ ưu tiên.
42. **Luồng 6.6: Cảnh báo Tiết kiệm Quá mức (Emergency Reserve Protection)**
    - *Quy trình*: Khi người dùng nạp tiền tiết kiệm quá nhiều khiến số dư ví còn lại thấp hơn tổng các khoản Ngân sách bắt buộc và Nợ phải trả trong tháng -> Hệ thống chặn lại hoặc bật cảnh báo: *"Số dư còn lại không đủ đảm bảo Quỹ dự trữ an toàn và chi phí bắt buộc"*.

---

### PHÂN HỆ 7: QUẢN LÝ NHÓM CHI TIÊU & CHIA TIỀN (GROUPS & EXPENSES)

43. **Luồng 7.1: Tạo nhóm chi tiêu mới**
    - *Quy trình*: Nhập Tên nhóm, Mô tả, Chọn ảnh bìa nhóm -> Bấm Tạo -> Backend tạo bản ghi `Group`, tự động gán người tạo làm `owner` và thành viên đầu tiên trong bảng `group_members`.
44. **Luồng 7.2: Mời thành viên tham gia nhóm**
    - *Quy trình*: Mở chi tiết nhóm -> Bấm nút **"+ Thêm"** hoặc **"Mã QR"** nổi bật trên Header -> Hiển thị mã QR mời nhóm dạng Vector SVG độ nét cao hoặc danh bạ tìm kiếm bạn bè qua SĐT.
45. **Luồng 7.3: Quét mã QR gia nhập nhóm tức thì (1-Tap Group Join)**
    - *Quy trình*: Thành viên mở camera quét mã QR của nhóm -> Ứng dụng giải mã DeepLink `sharemoney://group/join/{groupId}` -> Hiển thị thông tin xem trước của nhóm (Tên nhóm, Avatar, Số lượng thành viên) -> Bấm *"Tham gia ngay"* -> Gọi API `/api/groups/{groupId}/join` -> Trở thành thành viên chính thức.
46. **Luồng 7.4: Đổi ảnh bìa nhóm chi tiêu**
    - *Quy trình*: Bấm nút *"Đổi ảnh"* trên Banner nhóm -> Chọn ảnh từ thư viện máy (`expo-image-picker`) -> Nén ảnh -> Gọi API cập nhật `avatarUrl` cho nhóm.
47. **Luồng 7.5: Tạo khoản chi tiêu chia đều (Equal Split kèm Thuật toán Bù Lẻ Remainder)**
    - *Quy trình*: Nhập Tiêu đề (Ăn tối lẩu Haidilao), Số tiền (100.000đ), Chọn Người trả, Chọn các thành viên tham gia chia -> Thuật toán chia: `base = floor(100.000 / 3) = 33.333đ`, `remainder = 1đ` -> Gán người đầu: 33.334đ, 2 người sau: 33.333đ -> Lưu `Expense` và 3 `ExpenseSplit` -> Tổng các phần nợ luôn khớp chính xác 100.000đ, không thất thoát tiền.
48. **Luồng 7.6: Tạo khoản chi tiêu chia tùy chỉnh (Custom / Itemized Split)**
    - *Quy trình*: Chọn chế độ Chia tùy chỉnh -> Nhập số tiền cụ thể từng người ăn (A: 50k, B: 30k, C: 20k) -> Backend kiểm tra tổng số tiền các thành viên gánh bắt buộc phải bằng đúng tổng hóa đơn (`CUSTOM_SPLIT_MISMATCH`) -> Lưu Expense.
49. **Luồng 7.7: Liên kết khoản chi nhóm với Giao dịch ví cá nhân có sẵn**
    - *Quy trình*: Khi tạo khoản chi, người trả có thể chọn 1 Transaction đã quẹt thẻ trước đó -> Backend gắn `linkedExpenseId` -> Giúp sổ kế toán cá nhân không bị tính trùng lặp 2 lần tiền.
50. **Luồng 7.8: Chỉnh sửa khoản chi nhóm**
    - *Quy trình*: Thành viên sửa lại số tiền hoặc danh sách người chia -> Backend kiểm tra: Nếu khoản chi đã có người trả nợ (`isSettled = true`) hoặc là khoản chi hệ thống `SETTLEMENT` thì chặn lại (`EXPENSE_ALREADY_SETTLED`); Nếu hợp lệ: Xóa splits cũ, tạo lại splits mới và bắn thông báo cập nhật cho các thành viên.
51. **Luồng 7.9: Xóa khoản chi nhóm**
    - *Quy trình*: Bấm Xóa hóa đơn -> Backend kiểm tra chưa thanh toán -> Xóa Expense và tự động xóa Cascade toàn bộ các Splits liên quan trong DB.
52. **Luồng 7.10: Xuất danh sách chi tiêu nhóm ra CSV**
    - *Quy trình*: Bấm *"Xuất CSV"* -> Backend trích xuất toàn bộ hóa đơn của nhóm, chèn ký tự UTF-8 BOM (`\ufeff`) -> Xuất file CSV mở hiển thị tiếng Việt chuẩn 100% trên Microsoft Excel.

---

### PHÂN HỆ 8: TỐI ƯU HÓA NỢ & QUYẾT TOÁN THANH TOÁN (GREEDY DEBT SETTLEMENT)

53. **Luồng 8.1: Xây dựng Ma trận Số dư ròng (Net Balance Matrix)**
    - *Quy trình*: Hệ thống quét tất cả các `ExpenseSplit` chưa thanh toán trong nhóm: Với mỗi split, cộng tiền cho người trả (`payer + amount`) và trừ tiền của người nợ (`debtor - amount`) -> Cho ra số dư ròng cuối cùng của từng thành viên.
54. **Luồng 8.2: Thuật toán Greedy Min-Cash-Flow rút gọn nợ chéo**
    - *Quy trình*: Lấy người nợ nhiều nhất (Max Debtor) và người được nợ nhiều nhất (Max Creditor) trong vòng lặp -> Tạo 1 giao dịch trả nợ trực tiếp giữa 2 người với số tiền `min(|debt|, credit)` -> Cập nhật lại số dư và lặp lại cho đến khi toàn bộ thành viên hòa vốn (loại bỏ sai số `< 0.01đ`) -> Rút gọn từ hàng chục giao dịch nợ chéo phức tạp xuống số lượng giao dịch tối thiểu nhất.
55. **Luồng 8.3: Gửi thông báo nhắc nợ tự động qua WebSocket**
    - *Quy trình*: Chủ nợ bấm *"Nhắc nợ"* -> Backend tạo QuickLink VietQR, bắn tin nhắn Realtime WebSocket và Push Notification đến điện thoại của con nợ: *"Nguyễn Văn A vừa nhắc bạn trả 150.000đ"*.
56. **Luồng 8.4: Sinh mã VietQR động thanh toán nợ tức thì**
    - *Quy trình*: Con nợ bấm nút **"Trả nợ 📲"** bên cạnh khoản nợ -> Hệ thống tự động sinh mã VietQR động chứa chính xác: Mã BIN ngân hàng chủ nợ, Số tài khoản, Tên chủ tài khoản và Số tiền nợ cần thanh toán kèm cú pháp chuyển khoản.
57. **Luồng 8.5: App-to-App Deep Linking (Mở thẳng App Ngân Hàng)**
    - *Quy trình*: Bấm *"Mở App Ngân Hàng"* -> Ứng dụng tự động kích hoạt Deep Link mở app ngân hàng trên điện thoại (MBBank, Vietcombank, Techcombank, VPBank, MoMo...) với STK và số tiền đã được điền sẵn 100%.
58. **Luồng 8.6: Báo chuyển tiền & Chờ chủ nợ duyệt (`Payment pending`)**
    - *Quy trình*: Người nợ chuyển khoản xong bấm *"Tôi đã chuyển"* -> Tạo bản ghi `Payment (status = 'pending')` -> Giao diện người nợ hiện tag *"⏳ Chờ duyệt"*, đồng thời gửi thông báo cho chủ nợ: *"🔔 B vừa báo đã chuyển 150.000đ cho bạn. Hãy vào xác nhận nhé!"*.
59. **Luồng 8.7: Chủ nợ duyệt thanh toán & Tự động cân bằng sổ cái đối trừ nợ**
    - *Quy trình*: Chủ nợ bấm *"Xác nhận đã nhận"* -> Backend tự động tạo 1 Expense đặc biệt loại `SETTLEMENT` với người trả là con nợ và người nợ là chủ nợ -> Chuyển Payment thành `completed` -> Thuật toán Greedy tự động bắt lấy hóa đơn này và cấn trừ triệt để, đưa nợ của người đó về 0đ.
60. **Luồng 8.8: Danh bạ thụ hưởng trung gian (Payee Selector)**
    - *Quy trình*: Nếu chủ nợ chưa cấu hình STK ngân hàng -> Hệ thống tự động mở Modal chọn người nhận thay thế trong nhóm hoặc nhập STK ngoài để quá trình trả nợ không bao giờ bị gián đoạn.
61. **Luồng 8.9: Báo cáo Tổng nợ toàn hệ thống (Safe-to-Spend)**
    - *Quy trình*: Gọi API `/api/groups/debts/summary` -> Quét xuyên suốt tất cả các nhóm mà user tham gia -> Tính tổng `TotalOwed` (tiền người khác nợ mình) và `TotalOwing` (tiền mình đang nợ người khác) để tính toán hạn mức chi tiêu an toàn.

---

### PHÂN HỆ 9: CỔNG THANH TOÁN TRỰC TUYẾN & OPEN BANKING (PAYMENTS)

62. **Luồng 9.1: Tạo đơn hàng thanh toán VNPay Sandbox**
    - *Quy trình*: Người dùng chọn thanh toán qua VNPay -> Backend tạo bản ghi `PaymentOrder` (status = PENDING), tạo URL VNPay Sandbox kèm chuỗi mã hóa bảo mật SHA512 -> Mở phiên In-App WebBrowser trên mobile để người dùng quét mã/nhập thẻ ATM test.
63. **Luồng 9.2: Xử lý VNPay Return URL & IPN Webhook tự động gạch nợ**
    - *Quy trình*: Khi giao dịch VNPay thành công -> VNPay gọi Webhook IPN về backend -> Backend kiểm tra chữ ký SHA512 -> Cập nhật `PaymentOrder` thành `SUCCESS` -> Tự động gọi `debtService.approveSettle` gạch nợ hoặc ghi nhận chi tiêu ngân sách.
64. **Luồng 9.3: Tạo liên kết thanh toán Open Banking PayOS**
    - *Quy trình*: Gọi API `/api/payos/create-payment-link` -> Backend tạo đơn hàng `POS + orderCode`, gọi API PayOS Server lấy link thanh toán Hosted Checkout chuẩn Open Banking.
65. **Luồng 9.4: PayOS Webhook đối soát tự động tức thì**
    - *Quy trình*: Khách hàng quét mã chuyển khoản tiền vào tài khoản VietQR -> PayOS Webhook bắn payload về `/api/payos/webhook` -> Backend xác thực chữ ký HMAC SHA256 -> Cập nhật đơn hàng thành công và tự động gạch nợ trong 0.5 giây.
66. **Luồng 9.5: Cơ chế Active Polling 2s dự phòng lỗi mạng**
    - *Quy trình*: Trong khi người dùng mở màn hình thanh toán, mobile app chủ động thăm dò `/api/payos/order/{orderCode}` mỗi 2 giây -> Nếu Webhook bị nghẽn mạng, backend chủ động truy vấn PayOS Server để cập nhật trạng thái ngay lập tức.
67. **Luồng 9.6: Trình giả lập thanh toán Sandbox (Payment Sandbox Modal)**
    - *Quy trình*: Modal ngân hàng giả lập tích hợp sẵn trong ứng dụng giúp hội đồng chấm thi và giảng viên có thể kiểm thử luồng thanh toán và gạch nợ tức thì mà không cần dùng tài khoản ngân hàng thật.

---

### PHÂN HỆ 10: TRÍ TUỆ NHÂN TẠO AI GEMINI & CỐ VẤN TÀI CHÍNH (AI ADVISOR)

68. **Luồng 10.1: AI Chatbot Cố vấn Tài chính Cá nhân**
    - *Quy trình*: Người dùng gửi câu hỏi tư vấn trong khung chat -> Backend truy vấn toàn bộ dữ liệu tài chính thực tế của user (Thu nhập, Chi tiêu, Danh mục tiêu nhiều nhất, Số dư ví, Nợ nhóm) -> Đóng gói vào System Prompt gửi tới Google Gemini AI (`gemini-3.6-flash`) -> Trả về câu trả lời tư vấn sâu sắc, cá nhân hóa 100%.
69. **Luồng 10.2: Lập kế hoạch mua sắm mục tiêu ước mơ (Dream Goal Planner)**
    - *Quy trình*: Người dùng chat *"Tôi muốn mua iPhone 16 Pro Max 30 triệu trong 3 tháng"* -> AI bóc tách: Số tiền (30tr), Thời gian (3 tháng), Tiền cần tích lũy mỗi tháng (10tr) -> Đánh giá độ khả thi (Feasibility Gauge) dựa trên thu nhập thực tế -> Đưa ra nút 1-chạm tạo Hũ Tiết Kiệm ngay trong khung chat.
70. **Luồng 10.3: Tự động thiết lập kế hoạch tài chính toàn diện bằng 1 tin nhắn AI (`SETUP_FINANCIAL_PLAN`)**
    - *Quy trình*: Người dùng gửi tin nhắn dài: *"Tháng này lương 20tr, tiền nhà 4tr, tiền ăn 5tr, tiền điện nước 1tr, đi chơi 2tr"* -> Gemini AI phân tích dòng tiền -> Trả về Thẻ Kế Hoạch Tài Chính trực quan kèm 2 nút hành động: `⚡ Tạo Toàn Bộ Ngân Sách Tháng` và `📝 Ghi nhận là đã chi tiêu thực tế`.
71. **Luồng 10.4: Sáng tác lời nhắc nợ bằng AI theo 4 phong cách**
    - *Quy trình*: Khi bấm nhắc nợ -> Chọn phong cách (Gen Z Hài hước, Lịch sự, Đòi nợ gấp, Thơ ca) -> Gemini AI tự động viết lời nhắc nợ dí dỏm, khéo léo giúp không làm mất lòng bạn bè.
72. **Luồng 10.5: Cơ chế ngắt mạch Heuristic NLP Fallback (3 giây)**
    - *Quy trình*: Nếu mất kết nối Internet hoặc API Key Gemini quá tải -> Bộ xử lý Heuristic NLP cục bộ tự động kích hoạt sau đúng 3 giây, tự phân tích từ khóa và trả về kết quả dự phòng, bảo đảm ứng dụng không bao giờ bị đơ hay báo lỗi 500.
73. **Luồng 10.6: Đánh giá Điểm Sức khỏe Tài chính (Financial Health Score 0-100)**
    - *Quy trình*: Gọi API `/api/financial-health` -> Hệ thống tính toán điểm số tổng hợp dựa trên 4 trụ cột tài chính:
      1. Tỷ lệ tiết kiệm (25 điểm).
      2. Tỷ lệ tuân thủ ngân sách (25 điểm).
      3. Tỷ lệ nợ trên thu nhập (25 điểm).
      4. Quỹ dự phòng khẩn cấp (25 điểm).
      -> Xếp loại sức khỏe (Tuyệt vời / Khá / Trung bình / Cảnh báo) và đưa ra lời khuyên chuyên gia.

---

### PHÂN HỆ 11: PHÁT HIỆN DỊ THƯỜNG, THÔNG BÁO THỜI GIAN THỰC & BÁO CÁO (ANOMALY & REPORTS)

74. **Luồng 11.1: Thuật toán Z-Score phát hiện chi tiêu bất thường theo thời gian thực**
    - *Quy trình*: Mỗi khi phát sinh giao dịch chi tiêu -> Thuật toán tính độ lệch chuẩn và điểm số $Z = \frac{X - \mu}{\sigma}$ so với lịch sử chi tiêu của danh mục đó -> Nếu $Z > 2$ (Chi tiêu đột biến cao gấp nhiều lần ngày thường) -> Tự động kích hoạt chuông cảnh báo `SPENDING_ANOMALY`.
75. **Luồng 11.2: Trung tâm thông báo Realtime & Động cơ Biểu đồ Thích ứng 2 chiều qua mốc 0**
    - *Quy trình*: Kết nối WebSocket STOMP (`/topic/notifications/{userId}`) nhận thông báo biến động nợ/hóa đơn ngay lập tức; Động cơ biểu đồ hiển thị dòng tiền thích ứng 6 tuần, 6 tháng và 5 năm với biểu đồ đối xứng 2 chiều qua mốc 0 (Cột dương mọc lên trên, cột âm tụt xuống dưới) cùng biểu đồ tròn Donut Chart SVG đa phân đoạn.
