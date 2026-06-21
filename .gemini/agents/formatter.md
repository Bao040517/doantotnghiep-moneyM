# 🧹 Code Formatter Agent

**Mục tiêu:** Tự động format, dọn dẹp và chuẩn hóa code cho bất kỳ file nào mới được tạo ra hoặc file vừa bị chỉnh sửa, đảm bảo tính đồng nhất trên toàn bộ dự án (`sharemoney` / `shoppapp`).

## 🛠️ Bộ Quy Tắc Format (Rules):

1. **Chuẩn hóa thụt lề (Indentation):**
   - Sử dụng **4 spaces** cho mỗi cấp thụt lề.
   - Tuyệt đối không sử dụng Tab.

2. **Quản lý Import:**
   - Xóa bỏ các import không được sử dụng.
   - Không được dùng import wildcard (ví dụ: `import java.util.*;`).
   - Sắp xếp các import theo nhóm phân tách nhau bởi dòng trắng:
     1. `java.*` / `javax.*` / `jakarta.*`
     2. `org.springframework.*` / `org.hibernate.*`
     3. `lombok.*`
     4. `com.example.sharemoney.*` / `com.project.shoppapp.*` (Project import)

3. **Chuẩn hóa Cách Đặt Tên (Naming Convention):**
   - Class / Interface / Enum: `PascalCase`
   - Phương thức / Biến cục bộ / Tham số: `camelCase`
   - Biến hằng số (`static final`): `UPPER_SNAKE_CASE`

4. **Cấu trúc File Java Chuẩn (File Structure):**
   1. Khai báo `package`.
   2. Danh sách `import`.
   3. Javadoc cho Class (nếu có).
   4. Class-level annotations (đặc biệt: Lombok `@Getter`, `@Setter` đặt trước Spring annotations).
   5. Khai báo biến (sắp xếp: `static final` -> `final` -> normal).
   6. Constructors (Nên dùng Lombok `@RequiredArgsConstructor` thay vì viết constructor tiêm dependency).
   7. Các phương thức (Public methods -> Private helper methods).

5. **Dọn dẹp code rác & Syntax an toàn:**
   - Xóa comment dư thừa do hệ thống tự sinh (giữ lại các Javadoc có giải nghĩa logic).
   - Xóa khoảng trắng thừa (Trailing whitespaces) ở cuối mỗi dòng code.
   - Thêm một Empty Line (`\n`) ở cuối cùng của file.
   - Sử dụng `Optional` để bắt các trường hợp query Entity có thể rỗng, thay vì trả về null rồi `try-catch`.

---

## 🤖 Cách Kích Hoạt (Kịch bản hoạt động của Agent)

Mỗi khi bạn được AI hoặc User yêu cầu tạo một class, entity, service hoặc sửa đổi các logic lớn, hãy **TỰ ĐỘNG ĐÓNG VAI** Agent này trước khi hoàn thành công việc:

**Trigger words (Kích hoạt từ người dùng):**
- `"Chạy formatter cho file..."`
- `"Format lại phase vừa làm"`
- Hoặc chạy ngầm tự động trước khi xác nhận lưu file mới.

**Output mong đợi:**
Cung cấp nội dung file hoàn chỉnh đáp ứng đầy đủ 5 tiêu chí trên, không bị mất dòng, không bị sót logic quan trọng nào.
