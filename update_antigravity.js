const fs = require('fs');

const path = 'c:\\Users\\DELL\\Downloads\\sharemoney\\sharemoney\\antigravity.md';
let content = fs.readFileSync(path, 'utf8');

const newSession = `
### Session [2026-08-07] - Tích hợp Thông báo Realtime (WebSocket) & Đồng bộ Toàn diện API Mobile (React Native)

**✅ Đã hoàn thành (Compact Procedure):**

1. **Phân tích Khác biệt (Gap Analysis) & Tái cấu trúc API Tính toán Tổng hợp (\`useAppData.ts\` & \`financialServices.ts\`):**
   - Loại bỏ hoàn toàn các vòng lặp tính toán thủ công ở Client (React Native) cho các chỉ số quan trọng nhằm đảm bảo 100% đồng nhất công thức (Single Source of Truth) với bản Web.
   - Bổ sung và ánh xạ chuẩn xác API \`GET /wallets/total-balance\` (trả về \`TotalBalanceResponse\`) và \`GET /budgets/safe-to-spend\` (trả về \`SafeToSpendResponse\`).
   - Cập nhật Hook \`useAppData.ts\` để fetch trực tiếp 2 số liệu \`totalWalletBalance\` và \`safeToSpend\` từ Backend.

2. **Tích hợp Kiến trúc Giao tiếp Thời gian thực (STOMP WebSocket) cho Mobile:**
   - Cài đặt hệ sinh thái WebSocket (\`@stomp/stompjs\`, \`sockjs-client\`, \`text-encoding\`).
   - Khởi tạo \`socketService.ts\` quản lý vòng đời kết nối an toàn với Token JWT.
   - Tích hợp tự động kết nối Socket khi Đăng nhập thành công vào luồng định tuyến chính (\`AppNavigator.tsx\`).
   - Lắng nghe kênh \`/user/queue/notifications\` và nảy \`Alert.alert\` Local Push Notification ngay lập tức (0 độ trễ) khi có người nhắc nợ, thêm hóa đơn hoặc có biến động tài chính từ Web.
`;

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.startsWith('### Session'));

if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, newSession.trim() + '\n');
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Successfully updated antigravity.md');
} else {
    console.log('Could not find insert index');
}
