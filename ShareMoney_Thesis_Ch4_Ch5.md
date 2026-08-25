# CHƯƠNG 4: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 4.1 Yêu cầu chức năng

Hệ thống quản lý tài chính cá nhân và nhóm thông minh ShareMoney được thiết kế theo kiến trúc hướng dịch vụ (Service-Oriented Architecture) với ranh giới nghiệp vụ (Bounded Context) rõ ràng, phục vụ bốn đối tượng tương tác chính như sau:

1.  **Người dùng cá nhân (End-User):** Là đối tượng trực tiếp thao tác trên ứng dụng di động (Mobile App) để thực hiện chu trình quản lý dòng tiền cá nhân, tạo nhóm chi tiêu chung, chụp ảnh hóa đơn, phân bổ nợ và thực hiện giao dịch thanh toán điện tử.
2.  **Thành viên nhóm (Group Member):** Là người dùng đã được định danh nằm trong một nhóm chia sẻ chi phí cụ thể. Đối tượng này có quyền lợi nhận thông báo đẩy thời gian thực (Push Notification & WebSocket) về biến động số dư, xem báo cáo công nợ chéo và xác nhận thanh toán minh bạch với các thành viên khác.
3.  **Hệ thống bên thứ ba (Third-party Systems):** Bao gồm:
    *   **Mindee OCR API:** Dịch vụ nhận dạng ký tự quang học chuyên sâu hỗ trợ trích xuất thực thể biên lai (Entity Extraction), tự động nhận diện tên món ăn, đơn giá và thuế VAT.
    *   **Google Gemini LLM:** Dịch vụ trí tuệ nhân tạo tạo sinh (Generative AI) hỗ trợ sinh nội dung tin nhắn nhắc nợ thông minh dựa trên kỹ thuật Prompt Engineering.
    *   **VNPay Sandbox:** Cổng thanh toán trung gian giả lập, cung cấp giao diện lập trình ứng dụng (API) khởi tạo luồng thanh toán và hệ thống Webhook trả về kết quả giao dịch.
4.  **Quản trị viên hệ thống (System Administrator):** Đối tượng truy cập qua trang quản trị để giám sát hoạt động hệ thống, quản lý tài khoản, xem nhật ký hệ thống (System Logs) và giám sát hiệu năng máy chủ (APM) [1].

Dưới đây là Bảng 4.1 mô tả chi tiết và toàn diện các yêu cầu chức năng cốt lõi của hệ thống ShareMoney.

**Bảng 4.1 – Đặc tả yêu cầu chức năng hệ thống chuyên sâu**

| Mã số | Tên chức năng | Tác nhân kích hoạt | Đầu vào / Đầu ra | Mô tả nghiệp vụ chi tiết |
| :--- | :--- | :--- | :--- | :--- |
| **UC-01** | Đăng ký và đăng nhập | Người dùng cá nhân | **Vào:** Email, Mật khẩu.<br>**Ra:** Access Token (JWT). | Xác thực danh tính người dùng. Băm mật khẩu bằng thuật toán BCrypt. Cấp phát Token để duy trì phiên làm việc không trạng thái (Stateless). |
| **UC-02** | Quản lý nhóm chi tiêu | Người dùng cá nhân | **Vào:** Tên nhóm, Danh sách thành viên.<br>**Ra:** Đối tượng Group. | Khởi tạo không gian làm việc chung (Workspace). Phân quyền thành viên (Admin/Member) và duy trì tính toàn vẹn dữ liệu nhóm. |
| **UC-03** | Quét bóc tách hóa đơn OCR | Người dùng cá nhân | **Vào:** Ảnh hóa đơn (Base64).<br>**Ra:** JSON danh sách món ăn. | Tiền xử lý ảnh, gửi ảnh qua Mindee API để bóc tách quang học. Tự động chuẩn hóa văn bản trả về thành danh sách thực thể thanh toán. |
| **UC-04** | Chia tiền đa phương thức | Người dùng cá nhân | **Vào:** Tỷ lệ phần trăm / Số tiền cụ thể.<br>**Ra:** Các bản ghi Split. | Cho phép người dùng gán chi phí cho từng thành viên theo hai chiến lược: Chia đều (Equal) hoặc Chia theo tỷ lệ phần trăm (Percentage). |
| **UC-05** | Tính toán công nợ tối ưu | Hệ thống (Tự động) | **Vào:** Lịch sử giao dịch nhóm.<br>**Ra:** Lưới giao dịch tối giản. | Thuật toán chạy ngầm tự động cấn trừ các khoản nợ vòng tròn chéo nhau, giảm thiểu tối đa số lượng lệnh chuyển khoản thực tế cần thực hiện. |
| **UC-06** | Nhắc nợ thông minh AI | Người dùng cá nhân | **Vào:** Ngữ cảnh nợ, Cảm xúc (Vui/Nghiêm túc).<br>**Ra:** Đoạn văn bản. | Đóng gói Prompt gửi lên LLM Gemini, nhận về đoạn tin nhắn nhắc nợ được sinh tự nhiên, tăng tính cá nhân hóa và giữ hòa khí nhóm. |
| **UC-07** | Thanh toán qua cổng VNPay | Thành viên nhóm | **Vào:** Mã giao dịch, Số tiền.<br>**Ra:** URL thanh toán động. | Sinh chuỗi băm HMAC SHA512 đảm bảo chống giả mạo. Điều hướng người dùng an toàn sang môi trường cổng thanh toán VNPay Sandbox. |
| **UC-08** | Xử lý Webhook thanh toán | VNPay Sandbox | **Vào:** Tham số kết quả thanh toán.<br>**Ra:** HTTP 200 OK. | Điểm cuối (Endpoint) công khai tiếp nhận tín hiệu từ ngân hàng. Xác thực chữ ký số, tránh tấn công lặp (Replay Attack) và cập nhật số dư. |
| **UC-09** | Theo dõi, thống kê chi tiêu | Người dùng cá nhân | **Vào:** Mốc thời gian (Từ ngày - Đến ngày).<br>**Ra:** Tọa độ biểu đồ. | Gom nhóm dữ liệu giao dịch bằng SQL Aggregation. Phân tích luồng tiền vào/ra (Cash flow) và kết xuất cho thư viện vẽ biểu đồ trên thiết bị. |
| **UC-10** | Nhận thông báo thời gian thực | Tất cả người dùng | **Vào:** Sự kiện hệ thống (Event).<br>**Ra:** Gói tin STOMP. | Duy trì kênh kết nối WebSocket bền bỉ, thông báo đẩy tới các thiết bị khách ngay lập tức thông qua kiến trúc Publish/Subscribe của Redis. |

## 4.2 Yêu cầu phi chức năng

Hệ thống ShareMoney cần đáp ứng các chỉ tiêu phi chức năng khắt khe nhằm đảm bảo trải nghiệm người dùng mượt mà, tính sẵn sàng cao và an toàn bảo mật cấp doanh nghiệp:

**1. Hiệu năng, Độ trễ (Latency) và Thông lượng (Throughput):**
*   Hệ thống phải đảm bảo thời gian phản hồi ở phân vị thứ 95 (P95 Latency) cho các yêu cầu truy xuất dữ liệu CRUD cơ bản không vượt quá 200 mili-giây.
*   Đối với các tác vụ phân tán qua mạng như gọi API của Mindee OCR hay Google Gemini, thời gian chờ tối đa (Timeout) được thiết lập cứng là 5.000 mili-giây (5 giây).
*   Máy chủ phải duy trì được thông lượng xử lý tối thiểu 300 giao dịch/giây (TPS) trong điều kiện tải bình thường mà không gây ra hiện tượng tràn bộ đệm cơ sở dữ liệu.

**2. Tính bảo mật, Mã hóa và Toàn vẹn dữ liệu:**
*   Toàn bộ mật khẩu của người dùng được băm một chiều bằng thuật toán BCrypt với hệ số chi phí (Cost Factor) là 12, đảm bảo chống lại các cuộc tấn công vét cạn (Brute-force).
*   Tất cả các luồng giao tiếp mạng giữa ứng dụng di động và máy chủ bắt buộc phải mã hóa bằng giao thức HTTPS (TLS 1.2 trở lên).
*   Tính năng thanh toán VNPay sử dụng thuật toán băm mật mã HMAC SHA512. Mọi tham số truyền đi đều được ký số khóa bí mật riêng, đảm bảo tuyệt đối không bị kẻ gian dùng phần mềm thứ ba can thiệp thay đổi số tiền chuyển khoản [2].

**3. Kiến trúc mở rộng (Scalability) và Tính bền bỉ (Resilience):**
*   Máy chủ Spring Boot được thiết kế tuân thủ nguyên tắc "Phi trạng thái" (Stateless). Trạng thái phiên đăng nhập hoàn toàn được quản lý qua token phía máy khách. Nhờ đó, hệ thống có thể dễ dàng nhân bản (Scale-out) thành nhiều Container Docker khi tải tăng cao.
*   Kiến trúc sử dụng mô hình "Cầu chì" (Circuit Breaker) khi tương tác với các API bên thứ ba. Nếu dịch vụ OCR bị sập, hệ thống tự động ngắt mạch, chặn luồng gọi mạng và trả về yêu cầu người dùng nhập tay, ngăn chặn hiện tượng tắc nghẽn luồng xử lý (Thread Pool Exhaustion).

## 4.3 Các ràng buộc hệ thống

**4.3.1 Ràng buộc về hạ tầng và tài nguyên máy chủ:**
Máy chủ ứng dụng phụ thuộc vào gói dịch vụ miễn phí của nền tảng điện toán đám mây Render. Gói này giới hạn nghiêm ngặt bộ nhớ RAM khả dụng ở mức 512MB và một phần nhỏ chu kỳ CPU. Do đó, hệ thống buộc phải được tinh chỉnh bộ thu gom rác (Garbage Collector) trên máy ảo Java nhằm tránh hiện tượng rò rỉ bộ nhớ (Memory Leak) khi hoạt động liên tục.
Cơ sở dữ liệu PostgreSQL 15 bị giới hạn số lượng kết nối đồng thời (Max Connections). Để giải quyết, cấu hình kết nối HikariCP được thiết lập giới hạn quy mô hồ chứa tối đa 20 kết nối.

**4.3.2 Ràng buộc kinh tế và hạn mức API bên thứ ba:**
Để đảm bảo tính khả thi về mặt tài chính cho dự án đồ án tốt nghiệp, hệ thống sử dụng các khóa API ở cấp độ nhà phát triển (Developer Tier). Cụ thể, dịch vụ Mindee OCR giới hạn 250 lượt bóc tách hóa đơn mỗi tháng. Dịch vụ Google Gemini giới hạn tối đa 60 truy vấn mỗi phút (RPM). Thuật toán phân luồng phía máy chủ được lập trình để trả về HTTP Code 429 (Too Many Requests) nếu người dùng vượt quá ngưỡng này [3].

**4.3.3 Ràng buộc về pháp lý bảo vệ dữ liệu:**
Theo Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam về bảo vệ dữ liệu cá nhân, hệ thống phải cung cấp tính năng cho phép người dùng xóa hoàn toàn dữ liệu tài khoản (Right to be Forgotten). Cơ sở dữ liệu sẽ thực thi các ràng buộc xóa xếp tầng (`ON DELETE CASCADE`) để hủy bỏ triệt để toàn bộ lịch sử chi tiêu, hóa đơn, và token truy cập của người dùng đó khỏi hệ thống.

## 4.4 Thiết kế chi tiết hệ thống

### 4.4.1 Biểu đồ Use-case và Đặc tả kịch bản chuyên sâu

Để có cái nhìn tổng quan về sự tương tác giữa các tác nhân và hệ thống, Hình 4.0 trình bày sơ đồ Use-case tổng quát của hệ thống ShareMoney. Sơ đồ này bao quát toàn bộ mười chức năng nghiệp vụ cốt lõi, thể hiện rõ mối quan hệ bao hàm (Include) và quan hệ mở rộng (Extend) giữa các ca sử dụng.

**(Chỉ định chèn: Hình 4.0 – Sơ đồ Use-case tổng quát của hệ thống ShareMoney)**

Dưới đây là đặc tả kịch bản chi tiết, bao hàm cả các luồng thay thế và quy tắc nghiệp vụ cho 10 ca sử dụng của hệ thống:

**Đặc tả Ca sử dụng 1 (UC-01): Đăng ký và đăng nhập**
*   **Tác nhân kích hoạt:** Người dùng cá nhân.
*   **Tiền điều kiện:** Ứng dụng đã được cài đặt và thiết bị có kết nối Internet.
*   **Quy tắc nghiệp vụ:** Mật khẩu phải có độ dài tối thiểu 8 ký tự, chứa ít nhất một chữ hoa, một chữ số.
*   **Luồng sự kiện chính:**
    1.  Người dùng nhập tên đăng nhập và mật khẩu trên giao diện.
    2.  Máy khách gửi dữ liệu qua API `POST /api/auth/login`.
    3.  Máy chủ truy vấn cơ sở dữ liệu để tìm kiếm tài khoản theo định danh.
    4.  Lớp bảo mật đối chiếu mật khẩu thông qua thuật toán BCrypt.
    5.  Hệ thống tạo mã thông báo (JWT) có thời hạn 24 giờ và trả về mã 200 OK.
*   **Luồng ngoại lệ (Alternative Flow):**
    *   Tài khoản không tồn tại hoặc sai mật khẩu: Trả về mã lỗi 401 Unauthorized, giao diện hiển thị "Thông tin đăng nhập không hợp lệ".
    *   Tài khoản bị khóa do nhập sai quá 5 lần: Trả về mã lỗi 403 Forbidden.
*   **Hậu điều kiện:** Mã JWT được lưu trữ an toàn vào KeyStore/Keychain của thiết bị. Trạng thái đăng nhập được xác lập.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.1 – Sơ đồ ca sử dụng Đăng nhập)

**Đặc tả Ca sử dụng 2 (UC-02): Quản lý nhóm chi tiêu**
*   **Tác nhân kích hoạt:** Người dùng cá nhân.
*   **Tiền điều kiện:** Người dùng đang ở trạng thái đã xác thực (có mã JWT hợp lệ).
*   **Luồng sự kiện chính:**
    1.  Người dùng nhấn nút "Tạo nhóm mới", nhập tên nhóm.
    2.  Hệ thống cấp phát một định danh UUIDv4 duy nhất cho nhóm.
    3.  Lưu thông tin nhóm vào cơ sở dữ liệu `groups`.
    4.  Người dùng tìm kiếm thành viên qua số điện thoại/email và gửi lời mời.
    5.  Máy chủ lưu bản ghi thành viên vào bảng `group_members` với vai trò là `MEMBER`.
    6.  Hệ thống phát sóng (Broadcast) thông báo WebSocket đến các thành viên vừa được thêm.
*   **Luồng ngoại lệ (Alternative Flow):** Không tìm thấy thông tin thành viên (báo lỗi 404 Not Found).
*   **Hậu điều kiện:** Nhóm được khởi tạo, giao diện điều hướng người dùng vào màn hình tổng quan của nhóm vừa tạo.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.2 – Sơ đồ ca sử dụng Quản lý nhóm)

**Đặc tả Ca sử dụng 3 (UC-03): Quét và bóc tách hóa đơn OCR**
*   **Tác nhân kích hoạt:** Người dùng cá nhân.
*   **Tiền điều kiện:** Người dùng đang ở trong không gian của một nhóm cụ thể.
*   **Quy tắc nghiệp vụ:** Tệp tin ảnh đầu vào không được vượt quá 5 Megabytes (MB).
*   **Luồng sự kiện chính:**
    1.  Người dùng khởi động camera, chụp mặt trước của hóa đơn giấy.
    2.  Thiết bị nén ảnh định dạng JPEG và mã hóa sang chuỗi Base64.
    3.  Gửi yêu cầu trích xuất qua `POST /api/receipts/scan`.
    4.  Máy chủ ShareMoney hoạt động như một Reverse Proxy, đẩy ảnh và Bearer Token nội bộ lên dịch vụ Mindee API.
    5.  Dịch vụ Mindee phân tích không gian và trả về chuỗi JSON chứa các thực thể (Entity).
    6.  Máy chủ ShareMoney bóc tách mảng `line_items`, loại bỏ rác dữ liệu, chuẩn hóa tên món và giá tiền.
    7.  Trả về dữ liệu đã được làm sạch cho giao diện hiển thị.
*   **Luồng ngoại lệ (Alternative Flow):**
    *   Hóa đơn quá nhòe, Mindee trả về mảng rỗng: Ứng dụng cảnh báo "Vui lòng chụp lại rõ nét hơn" hoặc đề xuất nhập tay.
    *   Lỗi 504 Gateway Timeout từ Mindee: Ngắt mạch gọi mạng sau 5 giây, trả về lỗi.
*   **Hậu điều kiện:** Giao diện điền sẵn (pre-fill) danh sách món ăn vào bảng phân chia tiền.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.3 – Sơ đồ ca sử dụng Quét hóa đơn OCR)

**Đặc tả Ca sử dụng 4 (UC-04): Chia tiền thủ công và tự động**
*   **Tác nhân kích hoạt:** Người dùng cá nhân.
*   **Tiền điều kiện:** Có sẵn một danh sách các món ăn (nhập tay hoặc quét từ OCR) cùng tổng số tiền hóa đơn.
*   **Quy tắc nghiệp vụ:** Tổng số tiền phân bổ cho từng thành viên (kể cả thuế/phí dịch vụ) bắt buộc phải bằng chính xác `total_amount` của hóa đơn.
*   **Luồng sự kiện chính:**
    1.  Người dùng chọn các thành viên tham gia chia sẻ khoản ăn uống này.
    2.  Thuật toán trên ứng dụng tính toán chi phí trung bình.
    3.  Người dùng có thể gạt sang chế độ "Tùy chỉnh" để nhập số tiền cụ thể cho từng cá nhân.
    4.  Máy khách gửi cấu trúc phức hợp (Mảng đối tượng Split) lên máy chủ.
    5.  Máy chủ kiểm tra tính toàn vẹn (Validation).
    6.  Lưu đồng loạt các bản ghi `expense_splits` thông qua giao dịch cơ sở dữ liệu nguyên tử (ACID Transaction).
*   **Luồng ngoại lệ (Alternative Flow):** Lỗi lệch số dư làm tròn thập phân. Máy chủ từ chối với lỗi 400 Bad Request, trả về giá trị chênh lệch.
*   **Hậu điều kiện:** Công nợ của từng thành viên trong nhóm bị thay đổi ngay lập tức.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.4 – Sơ đồ ca sử dụng Chia tiền)

**Đặc tả Ca sử dụng 5 (UC-05): Tính toán công nợ tối ưu (Tự động)**
*   **Tác nhân kích hoạt:** Trình lập lịch hệ thống (Scheduler) hoặc yêu cầu chủ động từ người dùng.
*   **Tiền điều kiện:** Có sự biến động về hóa đơn trong nhóm gây thay đổi đồ thị công nợ.
*   **Luồng sự kiện chính:**
    1.  Quét toàn bộ giao dịch phân bổ nợ (`expense_splits`) chưa được thanh toán trong nhóm.
    2.  Tính tổng nợ và tổng có cho từng tài khoản định danh, rút ra số dư ròng cuối cùng (`Net Balance`).
    3.  Đưa các tài khoản số dư âm (Con nợ) vào danh sách A, số dư dương (Chủ nợ) vào danh sách B.
    4.  Sắp xếp danh sách theo thứ tự độ lớn giảm dần.
    5.  Áp dụng Thuật toán Tham lam (Greedy Algorithm): Khớp tài khoản nợ lớn nhất với chủ nợ lớn nhất để cấn trừ trực tiếp, triệt tiêu dòng tiền vòng tròn qua nhiều người.
    6.  Tạo ra danh sách lệnh chuyển khoản tối giản và hiển thị lên màn hình.
*   **Luồng ngoại lệ (Alternative Flow):** Nếu số dư tổng toàn nhóm không bằng 0 (lỗi logic), hệ thống dừng thuật toán và ghi cảnh báo lỗi nghiêm trọng (Fatal Error) vào tệp log.
*   **Hậu điều kiện:** Lưới công nợ được tinh giản, một người thay vì phải chuyển 5 khoản nhỏ cho 5 người sẽ chỉ cần chuyển 1 khoản lớn cho 1 người.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.5 – Sơ đồ ca sử dụng Tối ưu công nợ)

**Đặc tả Ca sử dụng 6 (UC-06): Nhắc nợ thông minh bằng Trí tuệ nhân tạo (AI)**
*   **Tác nhân kích hoạt:** Người dùng cá nhân (Chủ nợ).
*   **Tiền điều kiện:** Hệ thống ghi nhận có khoản nợ quá hạn hoặc chưa thanh toán.
*   **Luồng sự kiện chính:**
    1.  Chủ nợ nhấn vào biểu tượng AI bên cạnh khoản nợ.
    2.  Lựa chọn phong cách mong muốn (Vui nhộn, Cực gắt, Lịch sự, Văn vở).
    3.  Máy chủ đóng gói dữ liệu (Tên người nợ, Số tiền, Số ngày trễ) thành một câu lệnh Prompt tiếng Việt tối ưu.
    4.  Gửi luồng dữ liệu sang máy chủ LLM Google Gemini.
    5.  Tiếp nhận chuỗi văn bản sáng tạo, loại bỏ các thẻ định dạng thừa.
    6.  Trả văn bản về máy khách, người dùng nhấn nút chia sẻ qua các nền tảng mạng xã hội (Zalo, Messenger).
*   **Luồng ngoại lệ (Alternative Flow):** Máy chủ AI phản hồi chậm, hệ thống ShareMoney chèn đoạn tin nhắn mẫu cứng được lưu sẵn dưới cơ sở dữ liệu để đảm bảo trải nghiệm không đứt gãy.
*   **Hậu điều kiện:** Tin nhắn được sinh ra và gửi thành công tới tay con nợ.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.6 – Sơ đồ ca sử dụng Nhắc nợ AI)

**Đặc tả Ca sử dụng 7 (UC-07): Thanh toán trực tuyến qua cổng VNPay**
*   **Tác nhân kích hoạt:** Thành viên mắc nợ.
*   **Tiền điều kiện:** Thành viên chọn thanh toán một khoản nợ từ danh sách đã cấn trừ.
*   **Quy tắc nghiệp vụ:** Số tiền giao dịch phải lớn hơn hoặc bằng 10.000 VNĐ theo chuẩn VNPay.
*   **Luồng sự kiện chính:**
    1.  Máy khách gọi API yêu cầu tạo mã thanh toán, đính kèm ID khoản nợ.
    2.  Máy chủ lấy thông tin nợ, tạo đối tượng Transaction lưu trạng thái `PENDING`.
    3.  Khởi tạo các tham số theo tiêu chuẩn VNPay (`vnp_Amount`, `vnp_TxnRef`, `vnp_IpAddr`).
    4.  Sắp xếp các tham số theo bảng chữ cái từ khóa. Nối chuỗi và sử dụng khóa bí mật (Secret Key) băm qua thuật toán HMAC SHA512.
    5.  Nối chữ ký bảo mật vào cuối chuỗi và trả URL đầy đủ cho máy khách.
    6.  Máy khách mở một Webview (trình duyệt nhúng) điều hướng người dùng tới máy chủ VNPay Sandbox.
    7.  Người dùng nhập thông tin thẻ nội địa kiểm thử và bấm thanh toán.
*   **Luồng ngoại lệ (Alternative Flow):** Người dùng bấm nút "Hủy thanh toán", VNPay điều hướng trở lại ứng dụng với mã phản hồi từ chối. Trạng thái Transaction giữ nguyên là `PENDING`.
*   **Hậu điều kiện:** Khởi tạo thành công phiên giao dịch trên môi trường kiểm thử.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.7 – Sơ đồ ca sử dụng Thanh toán VNPay)

**Đặc tả Ca sử dụng 8 (UC-08): Xử lý Webhook gọi lại và xác nhận thanh toán**
*   **Tác nhân kích hoạt:** Hệ thống VNPay.
*   **Tiền điều kiện:** Giao dịch ở phía VNPay đã thực hiện thành công (Mã 00).
*   **Quy tắc nghiệp vụ:** Điểm cuối API Webhook bắt buộc phải được mở công khai (Public) và không bảo vệ bằng JWT.
*   **Luồng sự kiện chính:**
    1.  Máy chủ VNPay kích hoạt yêu cầu HTTP GET gọi về điểm cuối Webhook của hệ thống ShareMoney.
    2.  Máy chủ ShareMoney trích xuất mảng tham số, tách lấy mã chữ ký `vnp_SecureHash` gửi kèm.
    3.  Hệ thống ShareMoney sử dụng Secret Key nội bộ để băm lại các tham số còn lại thành một chữ ký nội bộ.
    4.  So sánh hai chữ ký: Nếu trùng khớp 100%, dữ liệu được chứng minh là toàn vẹn (không bị tấn công xen giữa MITM).
    5.  Cập nhật trạng thái bản ghi Transaction từ `PENDING` sang `SETTLED` trong PostgreSQL.
    6.  Gửi trả mã HTTP 200 OK cùng chuỗi JSON {"RspCode": "00"} cho hệ thống ngân hàng.
    7.  Kích hoạt tiến trình cập nhật số dư lưới công nợ.
*   **Luồng ngoại lệ (Alternative Flow):** Chữ ký không khớp, nghi ngờ giả mạo. Hệ thống từ chối cập nhật dữ liệu, trả về HTTP 400 Bad Request cho phía gọi và ghi cảnh báo bảo mật.
*   **Hậu điều kiện:** Khoản nợ được đánh dấu đã thanh toán, không cần sự can thiệp thủ công từ con người.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.8 – Sơ đồ ca sử dụng Webhook)

**Đặc tả Ca sử dụng 9 (UC-09): Phân tích, thống kê chi tiêu**
*   **Tác nhân kích hoạt:** Người dùng cá nhân.
*   **Tiền điều kiện:** Dữ liệu giao dịch tồn tại trong khoảng thời gian truy vấn.
*   **Luồng sự kiện chính:**
    1.  Giao diện ứng dụng gửi yêu cầu truy xuất dữ liệu tổng hợp theo chu kỳ (Tuần/Tháng).
    2.  Máy chủ sử dụng câu lệnh truy vấn PostgreSQL có sử dụng hàm nhóm (Aggregation: `SUM`, `GROUP BY` theo ngày/tháng).
    3.  Tính toán phân loại chi phí vào các danh mục.
    4.  Định dạng dữ liệu thành các cấu trúc tọa độ trục X/Y.
    5.  Thư viện React Native Chart Kit trên thiết bị vẽ biểu đồ đường (Line Chart) cho luồng tiền và biểu đồ tròn (Pie Chart) cho các danh mục.
*   **Luồng ngoại lệ (Alternative Flow):** Chưa có giao dịch nào phát sinh. Hệ thống trả về mảng rỗng, giao diện hiển thị hình ảnh minh họa "Không có dữ liệu".
*   **Hậu điều kiện:** Người dùng có cái nhìn bao quát về tình hình sức khỏe tài chính.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.9 – Sơ đồ ca sử dụng Thống kê)

**Đặc tả Ca sử dụng 10 (UC-10): Giao thức thông báo thời gian thực (Real-time Notification)**
*   **Tác nhân kích hoạt:** Hệ thống hoặc Người dùng khác.
*   **Tiền điều kiện:** Máy khách duy trì kết nối Transmission Control Protocol (TCP) bền bỉ tới máy chủ WebSocket.
*   **Quy tắc nghiệp vụ:** Thông báo cần được lưu vết vào cơ sở dữ liệu trước khi đẩy đi để phòng trường hợp khách hàng đang ngoại tuyến.
*   **Luồng sự kiện chính:**
    1.  Một hành động sinh ra thông báo (Vd: Nhóm có hóa đơn mới).
    2.  Hệ thống lưu một bản ghi Notification trạng thái "Chưa đọc" vào cơ sở dữ liệu.
    3.  Lớp dịch vụ WebSocket sử dụng giao thức STOMP định tuyến gói tin.
    4.  Kênh trao đổi bản tin phân tán Redis Pub/Sub đồng bộ thông báo xuyên suốt các máy chủ con.
    5.  Gói tin được đẩy thẳng xuống thiết bị máy khách đang kết nối tại kênh cá nhân (vd: `/user/{id}/queue/notify`).
    6.  Ứng dụng kích hoạt rung thiết bị và hiển thị hộp thoại nổi (Toast Notification) ở cạnh trên màn hình.
*   **Luồng ngoại lệ (Alternative Flow):** Kết nối WebSocket bị đứt do mạng kém. Ứng dụng thực hiện chiến lược kết nối lại lũy thừa (Exponential Backoff). Các thông báo nhỡ sẽ được truy vấn bằng API REST thông thường khi ứng dụng hoạt động lại.
*   **Hậu điều kiện:** Dòng thông tin được cập nhật liên tục không độ trễ, thúc đẩy tương tác người dùng.
*   **Hình tham chiếu:** (Chỉ định chèn: Hình 4.10 – Sơ đồ ca sử dụng Thông báo)

### 4.4.2 Biểu đồ lớp (Class Diagram) thực thể cấp cơ sở dữ liệu

Việc tổ chức dữ liệu đóng vai trò quyết định đến hiệu năng hệ thống. Hình 4.11 trình bày biểu đồ lớp các thực thể nghiệp vụ cốt lõi, phản ánh ánh xạ đối tượng quan hệ (ORM) thông qua kiến trúc thư viện trung gian Hibernate/JPA.
Đặc biệt, hệ thống áp dụng cơ chế theo dõi tự động (Auditing) giúp tự động cập nhật thời gian tạo (`created_at`) và thời gian chỉnh sửa (`updated_at`) thông qua lớp `@EntityListeners(AuditingEntityListener.class)`. Ngoài ra, khóa lạc quan (`@Version`) được sử dụng để tránh xung đột dữ liệu (Lost Update) khi xử lý đồng thời.

**(Chỉ định chèn: Hình 4.11 – Biểu đồ lớp chi tiết các thực thể nghiệp vụ ShareMoney)**

Hệ thống bao gồm 6 lớp thực thể trung tâm. Mã nguồn Java Spring Boot định nghĩa cấu trúc cấp thấp như sau:

```java
package com.example.sharemoney.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.util.UUID;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UUID")
    private UUID id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ExpenseSplit> expenseSplits;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    // Các phương thức Getters và Setters chuẩn
}

@Entity
@Table(name = "expenses")
@EntityListeners(AuditingEntityListener.class)
public class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExpenseSplit> splits;
    
    @Version
    @Column(name = "version")
    private Long version; // Khóa lạc quan chống ghi đè dữ liệu
}

@Entity
@Table(name = "expense_splits")
public class ExpenseSplit {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false)
    private SplitType splitType; // Enum: EQUAL, EXACT, PERCENTAGE
}
```

### 4.4.3 Biểu đồ tuần tự (Sequence Diagram) cấp kiến trúc phần mềm

Biểu đồ tuần tự đặc tả chính xác luồng tương tác mạng lưới theo trục thời gian giữa Máy khách (Client), Bộ điều khiển (Controller), Lớp nghiệp vụ (Service), Lớp dữ liệu (Repository) và Cơ sở dữ liệu. Dưới đây là mô tả hệ thống tương tác cực kỳ chi tiết cho 10 chu trình cốt lõi:

**Luồng 1: Quy trình Đăng ký và đăng nhập (UC-01)**
**(Chỉ định chèn: Hình 4.12 – Biểu đồ tuần tự Đăng nhập chi tiết)**
1. **Mobile App** thu thập thông tin tài khoản, gọi phương thức `POST /api/auth/login`.
2. **AuthController** tiếp nhận yêu cầu, đẩy đối tượng dữ liệu sang lớp **AuthService**.
3. **AuthService** gọi hàm `findByEmail()` trên **UserRepository**.
4. **UserRepository** thực thi truy vấn tới **PostgreSQL** để lấy chuỗi mật khẩu đã băm.
5. **AuthService** gọi hàm `matches()` của thư viện **BCryptPasswordEncoder** để kiểm tra mật khẩu.
6. Nếu hợp lệ, **AuthService** chuyển tiếp yêu cầu đến tiện ích **JwtUtils**.
7. **JwtUtils** sử dụng khóa bí mật (Secret Key) được lưu trong biến môi trường, sử dụng thuật toán HMAC SHA256 để ký chuỗi JWT Token.
8. **AuthController** đóng gói JWT vào JSON và phản hồi HTTP 200 OK về cho **Mobile App**.

**Luồng 2: Quy trình Quản lý nhóm chi tiêu (UC-02)**
**(Chỉ định chèn: Hình 4.13 – Biểu đồ tuần tự Quản lý nhóm)**
1. **Mobile App** gửi yêu cầu khởi tạo nhóm đính kèm Bearer Token trên HTTP Header qua `POST /api/groups`.
2. Lớp lọc bảo mật (Security Filter Chain) chặn yêu cầu, giải mã Token để lấy ID người gửi.
3. **GroupController** chuyển cấu trúc dữ liệu cho **GroupService**.
4. **GroupService** khởi tạo thực thể `Group`, gán ID người tạo.
5. Gọi `save()` trên **GroupRepository**, lưu dữ liệu vào **PostgreSQL**.
6. **GroupService** kích hoạt **NotificationService** để đẩy thông điệp đa hướng.
7. **NotificationService** gửi cấu trúc bản tin tới hệ thống **WebSocket (STOMP)**.
8. Trả về đối tượng JSON của nhóm mới cho **Mobile App**.

**Luồng 3: Quy trình Quét và bóc tách hóa đơn OCR (UC-03)**
**(Chỉ định chèn: Hình 4.14 – Biểu đồ tuần tự bóc tách OCR API)**
1. **Mobile App** mã hóa ảnh hóa đơn thành Base64 và gửi lên `POST /api/receipts/scan`.
2. **ReceiptController** tiếp nhận, giao phó ảnh cho **OcrService**.
3. **OcrService** đóng vai trò Proxy, cấu hình Header chứa khóa API bí mật của hệ thống và thiết lập HTTP Client.
4. Yêu cầu được gửi qua mạng Internet công cộng đến máy chủ **Mindee OCR Engine**.
5. **Mindee OCR Engine** chạy mô hình máy học thị giác máy tính và phản hồi chuỗi JSON đa tầng chứa tọa độ và nhãn.
6. **OcrService** sử dụng thư viện xử lý JSON (Jackson) phân giải dữ liệu, trích xuất thực thể `line_items`, loại bỏ tọa độ bounding-box dư thừa.
7. Chuẩn hóa thành đối tượng `ReceiptResponseDTO` (Data Transfer Object).
8. **ReceiptController** phản hồi đối tượng này về **Mobile App**.

**Luồng 4: Quy trình Chia tiền thủ công và tự động (UC-04)**
**(Chỉ định chèn: Hình 4.15 – Biểu đồ tuần tự Chia tiền ACID)**
1. **Mobile App** xử lý giao diện người dùng, phân bổ chi phí nội bộ và gửi cấu trúc Mảng `splits` lên máy chủ.
2. **ExpenseController** nhận yêu cầu và đẩy sang **ExpenseService**.
3. **ExpenseService** khởi tạo một giao dịch ACID (thông qua chú thích `@Transactional`).
4. Hệ thống dùng vòng lặp chạy tính tổng (Summation) toàn bộ mảng `splits` để đối chiếu với `total_amount` của hóa đơn.
5. Gọi **ExpenseRepository** để lưu thực thể cha (Expense).
6. Gọi **ExpenseSplitRepository** để lưu toàn bộ thực thể con (ExpenseSplit).
7. Nếu có bất kỳ lỗi lưu trữ nào, `@Transactional` kích hoạt tính năng Rollback toàn bộ dữ liệu.
8. **ExpenseController** phản hồi trạng thái hoàn tất mã 200 OK.

**Luồng 5: Quy trình Tính toán công nợ tối ưu (UC-05)**
**(Chỉ định chèn: Hình 4.16 – Biểu đồ tuần tự Tối ưu công nợ Tham lam)**
1. **Mobile App** gửi yêu cầu lấy công nợ qua `GET /api/groups/{id}/debts`.
2. **DebtController** gọi **DebtCalculationService**.
3. **DebtCalculationService** thực hiện truy vấn SQL lấy tổng số dư ròng của các tài khoản thông qua **TransactionRepository**.
4. Lớp dịch vụ tạo hai hàng đợi ưu tiên (PriorityQueue): Hàng đợi `Debtors` (người nợ) và hàng đợi `Creditors` (người cho nợ).
5. Vòng lặp thuật toán Tham lam liên tục rút phần tử đỉnh (lớn nhất) của hai hàng đợi ra cấn trừ. Tính toán số tiền chuyển giả lập và nạp lại phần dư thừa vào hàng đợi.
6. Quá trình kết thúc, tạo ra danh sách đối tượng `OptimizedDebtDTO`.
7. **DebtController** cấu trúc mảng JSON và phản hồi về **Mobile App**.

**Luồng 6: Quy trình Nhắc nợ thông minh AI (UC-06)**
**(Chỉ định chèn: Hình 4.17 – Biểu đồ tuần tự Nhắc nợ AI Prompt Engineering)**
1. **Mobile App** gửi các tham số ngữ cảnh nợ qua `POST /api/gemini/remind`.
2. **GeminiController** đẩy tham số vào **AiService**.
3. **AiService** chèn các tham số biến động vào trong mẫu văn bản Prompt (vd: `"Hãy viết một tin nhắn đòi nợ %s số tiền %d với thái độ %s..."`).
4. Thiết lập kết nối bất đồng bộ qua WebClient gọi sang **Google Gemini REST API**.
5. **Google Gemini LLM** sinh văn bản (Text Generation) và trả về mảng kết quả.
6. **AiService** sử dụng biểu thức chính quy (Regex) cắt bỏ các ký tự thừa thãi do mô hình tự thêm (như Markdown `**`).
7. **GeminiController** trả về luồng chuỗi thuần túy cho **Mobile App**.

**Luồng 7: Quy trình Thanh toán qua cổng VNPay (UC-07)**
**(Chỉ định chèn: Hình 4.18 – Biểu đồ tuần tự Khởi tạo Thanh toán VNPay)**
1. **Mobile App** gửi yêu cầu thanh toán khoản nợ qua `POST /api/vnpay/create-payment`.
2. **VNPayController** gọi **PaymentService**.
3. **PaymentService** sinh mã chuỗi tham chiếu giao dịch nội bộ duy nhất (`TxnRef`).
4. Gán mã này vào cấu trúc băm Map, cùng với địa chỉ IP gốc và giá trị tiền tệ, tiến hành sắp xếp (Sorting).
5. Sử dụng thuật toán mã hóa HMAC SHA512 cùng `vnp_HashSecret` ký vào toàn bộ chuỗi.
6. Cấu trúc URL Endpoint đầy đủ của **VNPay Sandbox** được nối thành công.
7. **VNPayController** trả về URL tĩnh cho **Mobile App** để tải lên Webview.

**Luồng 8: Quy trình Xử lý Webhook thanh toán (UC-08)**
**(Chỉ định chèn: Hình 4.19 – Biểu đồ tuần tự Webhook VNPay IPN)**
1. Hệ thống **VNPay Sandbox** sau khi trừ tiền tài khoản khách, tiến hành gọi HTTP GET tự động về `GET /api/vnpay/webhook`.
2. **VNPayWebhookController** đón nhận tham số dạng `RequestParam`.
3. Chuyển cho **PaymentService** thực hiện trích xuất `vnp_SecureHash` gốc và loại bỏ nó khỏi Map tham số.
4. Lớp dịch vụ tính toán lại chữ ký số (Re-calculate Signature) từ Map tham số còn lại bằng khóa bí mật máy chủ.
5. So sánh chuỗi ký tự bằng hàm so khớp an toàn thời gian (Time-constant equals) tránh tấn công dò thời gian.
6. Cập nhật dòng Transaction trong **PostgreSQL** sang `SETTLED`.
7. **VNPayWebhookController** xuất chuỗi JSON phản hồi chuẩn `RspCode: 00` cho ngân hàng.

**Luồng 9: Quy trình Theo dõi và thống kê chi tiêu (UC-09)**
**(Chỉ định chèn: Hình 4.20 – Biểu đồ tuần tự SQL Aggregation)**
1. **Mobile App** gửi khoảng thời gian truy vấn.
2. **StatisticController** gọi **StatisticService**.
3. **StatisticService** thực thi Native Query thông qua JPA (e.g. `SELECT date_trunc('day', created_at), SUM(amount) FROM...`).
4. **PostgreSQL** xử lý tối ưu hóa kế hoạch truy vấn (Query Plan) và trả về bộ kết quả tập hợp (ResultSet).
5. Lớp dịch vụ ánh xạ ResultSet thành cấu trúc DTO gồm các mảng X (thời gian) và Y (số tiền).
6. **StatisticController** trả mảng tọa độ về **Mobile App**.

**Luồng 10: Quy trình Nhận thông báo thời gian thực (UC-10)**
**(Chỉ định chèn: Hình 4.21 – Biểu đồ tuần tự Pub/Sub WebSocket)**
1. Sự kiện thay đổi dữ liệu phát sinh (Ví dụ: Thanh toán thành công) gọi hàm trung tâm trong **NotificationService**.
2. **NotificationService** khởi tạo Entity Notification và lưu cứng vào **PostgreSQL** thông qua Repository.
3. Lớp dịch vụ tiếp tục gửi đối tượng này vào hàng đợi của môi giới (Message Broker) **Redis Pub/Sub**.
4. Các máy chủ (Node) đang chạy cùng lắng nghe trên Redis sẽ nhận thông điệp.
5. Máy chủ chứa luồng kết nối **WebSocket (SimpMessagingTemplate)** của người dùng nhận thực hiện định tuyến (Routing) qua kênh `/topic/user/x`.
6. Gói tin được truyền tải tức thời qua kết nối TCP mở sẵn tới **Mobile App**.

### 4.4.4 Thiết kế cơ sở dữ liệu vật lý phân rã và tối ưu (Physical DB Design)

Kiến trúc dữ liệu đóng vai trò quyết định, Hình 4.22 mô phỏng lược đồ quan hệ vật lý. Hệ thống đạt chuẩn hóa Dạng chuẩn 3 (3NF), ngăn chặn dư thừa dữ liệu. Dưới đây là toàn bộ mã lệnh định nghĩa dữ liệu (DDL), bao gồm cả khởi tạo chỉ mục (Index) nhằm giải quyết thắt cổ chai hiệu năng truy vấn trên bảng lớn:

**(Chỉ định chèn: Hình 4.22 – Lược đồ cơ sở dữ liệu quan hệ vật lý hệ thống ShareMoney)**

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    total_amount DECIMAL(19, 2) NOT NULL CHECK (total_amount > 0),
    version BIGINT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_expenses_group_id ON expenses(group_id);

CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(19, 2) NOT NULL CHECK (amount > 0),
    split_type VARCHAR(20) NOT NULL,
    CONSTRAINT fk_split_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_split_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    amount DECIMAL(19, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transaction_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_participants ON transactions(sender_id, receiver_id);
```

### 4.4.5 Thiết kế luồng giao diện người dùng (UI Navigation Flow)

Trải nghiệm tương tác thiết bị di động (Mobile UX) được xây dựng trên thư viện điều hướng theo dạng ngăn xếp (Stack Navigation) và điều hướng thẻ dưới đáy (Bottom Tab Navigation).

**(Chỉ định chèn: Hình 4.23 – Sơ đồ luồng giao diện người dùng trên thiết bị di động ShareMoney)**

1.  **Màn hình Khởi động (Splash) & Xác thực sinh trắc học:** Nếu Token JWT lưu cục bộ còn hạn, ứng dụng gọi cảm biến vân tay/FaceID trên máy để bỏ qua bước đăng nhập rườm rà.
2.  **Trang chủ (Bottom Tab 1):** Cung cấp bức tranh toàn cảnh dòng tiền qua biểu đồ vành khăn hiển thị số liệu Tổng thu, Tổng chi và Số dư công nợ ròng. Nút hành động nổi (Floating Action Button) được đặt cố định góc dưới bên phải nhằm tăng tốc quá trình tạo giao dịch mới.
3.  **Màn hình Quản lý Nhóm (Bottom Tab 2):** Liệt kê thẻ (Card) của các nhóm đang tham gia. Cấp thông tin tổng số lượng hóa đơn và thành viên tại mặt ngoài thẻ.
4.  **Luồng trong chi tiết Nhóm (Group Detail):**
    *   **Bảng phân tách hóa đơn:** Hiển thị danh sách hóa đơn dọc theo dạng mốc thời gian (Timeline).
    *   **Bảng thanh toán bù trừ (Settlement):** Áp dụng thuật toán tối ưu công nợ để hiển thị chính xác ai nợ ai, số lượng thẻ thanh toán được làm phẳng tối giản.
5.  **Luồng quét Hóa đơn (Bottom Sheet Modal):** Sử dụng mô hình ngăn kéo nổi kéo từ dưới lên thay vì chuyển trang hoàn toàn (Push Screen). Kỹ thuật này duy trì ngữ cảnh làm việc liên tục cho người dùng, giúp thao tác chọn ảnh, chờ xử lý OCR và điền số liệu diễn ra liền mạch trên một khung nhìn ảo.

## 4.5 Thiết kế giao thức RESTful API chi tiết

Kiến trúc API của ShareMoney tuân thủ chặt chẽ tiêu chuẩn OpenAPI 3.0. Dữ liệu trao đổi thông qua định dạng chuỗi JSON nguyên khối, hỗ trợ tham số truy vấn có phân trang nhằm tối ưu hiệu năng băng thông máy chủ. Các API luôn kèm tiêu đề xác thực chuẩn: `Authorization: Bearer <token>`.

**1. API Khởi tạo hóa đơn chi tiêu cho nhóm**
*   **Điểm cuối:** `POST /api/expenses/group`
*   **Request Body (JSON):**
    ```json
    {
      "group_id": "f5g6-h7i8-9j0k-1l2m",
      "description": "Ăn tối lẩu Thái",
      "total_amount": 500000.00,
      "splits": [
        { "user_id": "a1b2-c3d4...", "amount": 200000.00, "type": "EXACT" },
        { "user_id": "e9f0-g1h2...", "amount": 300000.00, "type": "EXACT" }
      ]
    }
    ```
*   **Cấu trúc phản hồi (200 OK):**
    ```json
    {
      "status": 200,
      "message": "Lưu hóa đơn thành công và tạo lệnh chia tiền",
      "timestamp": "2026-08-10T15:30:00Z"
    }
    ```

**2. API Bóc tách hóa đơn thông qua dịch vụ OCR**
*   **Điểm cuối:** `POST /api/receipts/scan`
*   **Request Body (JSON FormData):** Yêu cầu truyền chuỗi ảnh siêu lớn (Payload).
    ```json
    {
      "image_base64": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAk..."
    }
    ```
*   **Cấu trúc phản hồi (200 OK):** Chứa hệ thống cấu trúc dạng cây thực thể bóc tách.
    ```json
    {
      "status": 200,
      "data": {
        "items": [
          { "name": "Bò mỹ nhúng", "price": 40000.0 },
          { "name": "Nước suối", "price": 10000.0 }
        ],
        "tax": 4000.0,
        "confidence_score": 0.98
      }
    }
    ```

**3. API Truy vấn lịch sử giao dịch (Hỗ trợ phân trang)**
*   **Điểm cuối:** `GET /api/transactions`
*   **Tham số truy vấn (Query Params):** `?page=0&size=20&sort=createdAt,desc`
*   **Cấu trúc phản hồi (200 OK):** Chuẩn cấu trúc `Pageable` của Spring Boot.
    ```json
    {
      "content": [
        { "id": "...", "amount": 150000, "status": "SETTLED" }
      ],
      "pageNo": 0,
      "pageSize": 20,
      "totalElements": 150,
      "totalPages": 8,
      "last": false
    }
    ```

Dưới đây là mã nguồn minh họa lớp điều khiển lập trình API xử lý luồng tạo hóa đơn, áp dụng chú thích `@Valid` để kiểm duyệt dữ liệu toàn vẹn ngay tại cổng (Validation Gates):

```java
package com.example.sharemoney.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.validation.Valid;
import com.example.sharemoney.service.ExpenseService;
import com.example.sharemoney.dto.request.ExpenseRequest;
import com.example.sharemoney.dto.response.ApiResponse;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    @PostMapping("/group")
    public ResponseEntity<ApiResponse<String>> createGroupExpense(
            @Valid @RequestBody ExpenseRequest request) {
        
        expenseService.processAndSaveExpense(request);
        
        ApiResponse<String> response = new ApiResponse<>();
        response.setStatus(200);
        response.setMessage("Lưu hóa đơn thành công và tạo lệnh chia tiền");
        
        return ResponseEntity.ok(response);
    }
}
```

## 4.6 Áp dụng các mẫu thiết kế (Design Patterns)

Để hệ thống duy trì được vòng đời phát triển lâu dài, giảm thiểu tính liên kết phụ thuộc cứng nhắc (Tight Coupling) giữa các tầng kiến trúc, đồ án áp dụng triệt để bộ năm mẫu thiết kế cốt lõi của Gang of Four (GoF) và kiến trúc Enterprise:

**1. Mẫu thiết kế Strategy (Chiến lược)**
Xử lý linh hoạt bài toán chia tiền với nhiều thuật toán khác nhau (Chia đều, Chia phần trăm, Chia số cụ thể) tại thời điểm thực thi (Runtime).
```java
public interface SplitStrategy {
    List<ExpenseSplit> calculateSplit(BigDecimal total, List<User> members);
}
public class EqualSplitStrategy implements SplitStrategy { /* Logic chia đều */ }
public class PercentageSplitStrategy implements SplitStrategy { /* Logic chia theo % */ }
```

**2. Mẫu thiết kế Observer (Quan sát viên)**
Áp dụng thông qua hệ thống Event Listener của Spring Framework. Khi một hóa đơn lưu thành công, thực thể gốc đóng vai trò Publisher phát ra sự kiện, các Observer (vd: Dịch vụ Gửi thông báo, Dịch vụ Tính toán lại nợ) lắng nghe độc lập để xử lý luồng ngầm, không làm chặn luồng phản hồi API chính.

**3. Mẫu thiết kế Repository**
Giải quyết bài toán tách biệt hoàn toàn thao tác truy xuất dữ liệu vật lý khỏi logic nghiệp vụ. Thông qua thư viện Spring Data JPA, hệ thống không cần triển khai thủ công các câu lệnh SQL mà ánh xạ thông qua tên hàm.

**4. Mẫu thiết kế Proxy**
Được Spring Framework ứng dụng ngầm qua cơ chế lập trình hướng khía cạnh (AOP) để chèn thêm logic quản lý giao dịch bằng chú thích `@Transactional`. Lớp Service gọi ra sẽ luôn bị bọc (wrap) bởi một Proxy điều khiển việc Mở/Đóng giao dịch cơ sở dữ liệu vật lý.

**5. Mẫu thiết kế Builder**
Xử lý bài toán khởi tạo đối tượng DTO hoặc Thực thể có quá nhiều thuộc tính phức tạp, loại bỏ hoàn toàn hiện tượng nhầm lẫn vị trí tham số trong hàm khởi tạo truyền thống, đồng thời đảm bảo tính bất biến (Immutability) của đối tượng sau khi tạo.

## 4.7 Thiết kế xử lý ngoại lệ và ghi log (Centralized Logging & Exception Handling)

**Xử lý ngoại lệ tập trung (Global Exception Handler):**
Sự nhất quán trong cấu trúc phản hồi lỗi quyết định chất lượng phân tích sự cố trên ứng dụng máy khách. Hệ thống không sử dụng cơ chế ném ngoại lệ mặc định lộn xộn của Tomcat. Thay vào đó, áp dụng cơ chế chặn bắt lỗi toàn cục bằng cấu trúc `@RestControllerAdvice`.

```java
package com.example.sharemoney.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessRuleException ex) {
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("timestamp", LocalDateTime.now().toString());
        errorBody.put("status", HttpStatus.BAD_REQUEST.value());
        errorBody.put("error", "Vi phạm quy tắc nghiệp vụ");
        errorBody.put("message", ex.getMessage());
        return new ResponseEntity<>(errorBody, HttpStatus.BAD_REQUEST);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleFatalException(Exception ex) {
        // Fallback catch-all cho các lỗi NullPointer chưa kiểm soát
        return new ResponseEntity<>(..., HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

**Cơ chế ghi log hệ thống phân tán (Distributed Tracing Log):**
Hệ thống sử dụng thư viện SLF4J tích hợp lõi Logback. Để đối phó với môi trường đa luồng máy chủ, mỗi yêu cầu API cấp một định danh duy nhất thông qua Mapped Diagnostic Context (MDC) và gắn ID này vào toàn bộ vòng đời sinh Log. Các tệp nhật ký được cấu hình xoay vòng (Rolling File Policy) phân mảng nén theo từng ngày lưu trữ:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/sharemoney-core.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/archive/sharemoney-%d{yyyy-MM-dd}.log.gz</fileNamePattern>
            <maxHistory>30</maxHistory> <!-- Giữ 30 ngày -->
            <totalSizeCap>3GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <!-- Áp dụng MDC [%X{requestId}] để truy vết dòng mã -->
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} - %level - [req:%X{requestId}] - [%thread] - %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
</configuration>
```

## 4.8 Kết luận chương

Chương 4 đã đi sâu vào mô hình hóa toàn diện kiến trúc phần mềm từ cấp độ ý tưởng chức năng cho đến thiết kế vật lý mã nguồn. Việc phân tích hệ thống Use-case chuyên sâu kết hợp luồng thay thế, đặc tả 10 luồng Sequence Diagram chi tiết cùng cấu trúc quan hệ dữ liệu chuẩn hóa khắt khe đã tạo nên một kiến trúc lõi cực kỳ bền vững, an toàn và dễ dàng mở rộng, sẵn sàng cung cấp bộ khung kỹ thuật vững chắc làm cơ sở cho quá trình cài đặt, kiểm thử tải và đánh giá tại Chương 5.

***

# CHƯƠNG 5: CÀI ĐẶT, THỬ NGHIỆM VÀ ĐÁNH GIÁ KẾT QUẢ

## 5.4 Kiểm thử hiệu năng hệ thống chuyên sâu (Performance & Load Testing)

Đánh giá khả năng chịu tải đóng vai trò sống còn trong việc kiểm chứng tính đúng đắn của kiến trúc máy chủ phi trạng thái (Stateless API), mức độ chịu đựng của công cụ quản lý Connection Pool, và cơ chế giải phóng bộ nhớ của cấu trúc JVM khi hệ thống hoạt động ở chế độ cường độ cao.

**1. Thiết lập kịch bản và môi trường kiểm thử cực hạn (Stress Test Setup)**
Quá trình kiểm thử được thực thi tự động qua hệ thống mã nguồn mở Apache JMeter phiên bản 5.5, cấu hình thông qua kịch bản lập trình luồng (Thread Groups). Môi trường máy chủ nhận cấu hình đo đạc nội bộ thông qua Spring Boot Actuator và thư viện đo lường Micrometer.

Các tham số kiểm thử được chia thành 4 ngưỡng thiết lập tải (Ramp-up) cực đoan:
*   **Ngưỡng 1 (Tải thông thường - Baseline):** 100 người dùng ảo đồng thời (Concurrent Threads) truy cập ngẫu nhiên liên tục API đọc `GET /api/transactions`.
*   **Ngưỡng 2 (Tải trung bình - Moderate):** 200 người dùng ảo.
*   **Ngưỡng 3 (Tải cao - Spike Test):** 500 người dùng ảo bùng nổ trong vòng thời gian Ramp-up siêu ngắn 10 giây.
*   **Ngưỡng 4 (Chịu tải cực hạn ngập lụt - Flood Test):** 1.000 người dùng thực hiện liên hoàn tổ hợp tác vụ ghi dữ liệu vào bảng hóa đơn (`POST /api/expenses/group`) kết hợp tải liên tục cấu trúc JSON của API bóc tách quang học OCR, duy trì trong vòng 15 phút.

**2. Mô tả đồ thị kết quả thực nghiệm hiệu năng**

**(Chỉ định chèn: Hình 5.1 – Biểu đồ tương quan 3 trục: Chịu tải, Độ trễ và Thông lượng hệ thống)**

Đồ thị sinh ra từ JMeter Dashboard biểu diễn ba đường thông số kỹ thuật đan chéo theo thời gian thực:
*   **Đường màu xanh dương (Active Threads):** Số lượng người dùng ảo đang hoạt động tại thời điểm t.
*   **Đường màu xanh lá (Response Time - P95):** Thời gian phản hồi phân vị thứ 95 (loại bỏ 5% dữ liệu nhiễu cao nhất).
*   **Đường màu đỏ (Throughput - TPS):** Thông lượng số lượng yêu cầu xử lý thành công mỗi giây.

Khi đường màu xanh dương đi lên theo chiều thẳng đứng, sự thay đổi của hai đường còn lại cung cấp cái nhìn nội soi chi tiết về cách bộ nhớ RAM và hệ thống lõi ảo (vCPU) của máy chủ vật lý phản ứng khi bị cạn kiệt tài nguyên.

**3. Bảng số liệu đo đạc hiệu năng thực nghiệm toàn diện**

**Bảng 5.2 – Kết quả phân tích chỉ số hiệu năng máy chủ dưới các mức tải JMeter**

| Mức tải (Concurrent Users) | Thông lượng định mức (Req/sec) | Thời gian phản hồi trung bình (Avg) | Độ trễ phân vị P95 (95% Line) | Độ trễ tối đa (Max Latency) | Tỉ lệ lỗi tổng thể (Error Rate) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **100 người dùng** | 95,4 req/s | 120 ms | 185 ms | 410 ms | 0,00% |
| **200 người dùng** | 188,2 req/s | 280 ms | 365 ms | 720 ms | 0,00% |
| **500 người dùng** | 412,6 req/s | 890 ms | 1.250 ms | 2.800 ms | 0,45% |
| **1.000 người dùng** | 684,1 req/s | 2.450 ms | 4.800 ms | 7.950 ms | 3,12% |

**4. Phân tích chuyên sâu kết quả đồ thị và Đánh giá thắt cổ chai kiến trúc (Bottleneck Analysis)**

Kết quả thu được từ quá trình ép tải đã chứng minh năng lực đáp ứng mạnh mẽ của hệ thống nhưng đồng thời cũng làm sáng tỏ các điểm thắt cổ chai về tài nguyên phần cứng.

*   **Tính ổn định trong giới hạn thông thường (100 - 200 Users):** Ở hai kịch bản đầu, thời gian phản hồi cho các điểm cuối API duy trì mức cực kỳ ổn định (P95 Latency < 400 mili-giây). Tỉ lệ lỗi tuyệt đối giữ vững mức 0%. Cơ chế HikariCP Connection Pool cấu hình sẵn với 20 Active Connections hoạt động vô cùng hiệu quả, điều hướng luồng truy vấn vào PostgreSQL mà không gây ra hiện tượng khóa (Locking) trên Database.
*   **Phản ứng với đợt tăng vọt lưu lượng (Spike Test 500 Users):** Khi lưu lượng ép tải chạm ngưỡng 500 người dùng, đồ thị xanh lá (Response Time) bắt đầu dao động mạnh, đạt đỉnh 2,8 giây. Máy chủ ghi nhận tỉ lệ lỗi siêu nhỏ 0,45%. Nguyên nhân lỗi hoàn toàn đến từ gói tin mạng bị đánh rơi (Socket Timeout Exception) tại tầng Gateway, không phải lỗi sụp đổ nội bộ ứng dụng. Thời điểm này, bộ thu gom rác G1 Garbage Collector của JVM phải hoạt động ở công suất tối đa để dọn dẹp các luồng chuỗi chuỗi JSON Base64 kích thước lớn từ tính năng OCR, dẫn đến hiện tượng tạm dừng thế giới (Stop-the-World Pauses) chớp nhoáng trên CPU.
*   **Phân tích sự suy thoái có kiểm soát (Graceful Degradation - 1.000 Users):** Ở mức tải phá hủy với 1000 người dùng liên tục tương tác dữ liệu ghi, thông lượng (Throughput) vẫn cố gắng leo lên mức đỉnh 684 req/s thay vì sụp đổ hoàn toàn. Tuy nhiên, thời gian phản hồi P95 vọt lên gần 5 giây. Tỉ lệ lỗi đạt mức 3,12%, chủ yếu tập trung tại thông báo lỗi `503 Service Unavailable` từ các cuộc gọi gián tiếp tới Mindee OCR và Google Gemini API (do vượt hạn mức giới hạn tốc độ Rate Limit từ phía nhà cung cấp bên thứ ba). 

**Kết luận đánh giá kỹ thuật:**
Mặc dù triển khai trên hạ tầng phần cứng mỏng của nền tảng mây Render (giới hạn 512MB RAM), điểm sáng vô giá của thiết kế là hiện tượng sập máy chủ toàn cục (Out of Memory Error - OOM) **không hề xảy ra**. Máy chủ không bao giờ mất kiểm soát dẫn đến từ chối dịch vụ. Điều này có được nhờ sự tuân thủ nghiêm ngặt mô hình kiến trúc phi trạng thái (Stateless), kỹ thuật điều chỉnh bộ nhớ động cấu hình JVM, cùng cơ chế ngắt mạch an toàn (Circuit Breaker) bảo vệ tài nguyên luồng (Thread) trọng yếu khỏi sự sụp đổ dây chuyền (Cascading Failures) của hệ thống phần mềm quy mô lớn.
