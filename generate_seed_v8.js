const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatDate(year, month, day, hour, minute, second = 0) {
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    const hStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    const sStr = second.toString().padStart(2, '0');
    return `${year}-${mStr}-${dStr} ${hStr}:${minStr}:${sStr}`;
}

function formatVnpDate(year, month, day, hour, minute, second = 0) {
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    const hStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    const sStr = second.toString().padStart(2, '0');
    return `${year}${mStr}${dStr}${hStr}${minStr}${sStr}`;
}

function generateTxnRef(year, month, day, hour, minute, second = 0) {
    const vnpTime = formatVnpDate(year, month, day, hour, minute, second);
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `SM${vnpTime}${randomHex}`;
}

const users = [
    { id: '1a111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn A (Thông Thái)', email: 'nguyenvana@gmail.com', avatar: 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff', baseSalary: 32000000, rentAmt: 6000000, persona: 'SAVER', years: [2025, 2026], startYear: 2025, sAmt1: 35000000, sAmt2: 25000000 },
    { id: '1b111111-1111-4111-a111-111111111111', name: 'Trần Thị B (Tiêu Lố)', email: 'tranthib@gmail.com', avatar: 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff', baseSalary: 18000000, rentAmt: 4500000, persona: 'SPENDER', years: [2026], startYear: 2026, sAmt1: 12000000, sAmt2: 5000000 },
    { id: '1c111111-1111-4111-a111-111111111111', name: 'Lê Thị C (Trùm Nhóm)', email: 'lethic@gmail.com', avatar: 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff', baseSalary: 25000000, rentAmt: 5000000, persona: 'GROUP_LEADER', years: [2026], startYear: 2026, sAmt1: 12000000, sAmt2: 5000000 },
    { id: '1d111111-1111-4111-a111-111111111111', name: 'Phạm Văn D (Con Nợ)', email: 'phamvand@gmail.com', avatar: 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff', baseSalary: 14000000, rentAmt: 3500000, persona: 'DEBTOR', years: [2026], startYear: 2026, sAmt1: 12000000, sAmt2: 5000000 },
    { id: '1e111111-1111-4111-a111-111111111111', name: 'Hoàng Thị E (Newbie GenZ)', email: 'hoangthie@gmail.com', avatar: 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff', baseSalary: 9500000, rentAmt: 2500000, persona: 'NEWBIE', years: [2026], startYear: 2026, sAmt1: 12000000, sAmt2: 5000000 }
];

const categoryItemsMap = {
    'Ăn uống': [
        { name: 'Phở Thìn Lò Đúc - Bát tái nạm đặc biệt', min: 65000, max: 85000 },
        { name: 'Cơm tấm Sườn Bì Chả Trứng - Nguyễn Trãi', min: 50000, max: 70000 },
        { name: 'Bún chả Hương Liên - Combo Obama', min: 55000, max: 75000 },
        { name: 'Bánh mì Huỳnh Hoa - Đặc biệt chả lụa', min: 50000, max: 65000 },
        { name: 'Cơm trưa văn phòng Giao Tận Nơi', min: 40000, max: 60000 },
        { name: 'Lẩu nướng Haidilao Vincom ăn trưa', min: 350000, max: 700000 },
        { name: 'KFC Vietnam - Combo gà giòn cay & khoai', min: 99000, max: 160000 },
        { name: 'Bún bò Huế Đông Ba - Tô đặc biệt bò bắp', min: 50000, max: 70000 },
        { name: 'Highlands Coffee - Phin Sữa Đá Cỡ Lớn', min: 45000, max: 59000 },
        { name: 'Starbucks Coffee - Caramel Macchiato Venti', min: 95000, max: 125000 },
        { name: 'Trà sữa Phúc Long - Ô Long Sữa Dừa trân châu', min: 60000, max: 80000 },
        { name: 'Cà phê muối Chú Long - 2 ly mang về', min: 30000, max: 40000 }
    ],
    'Chi tiêu hàng ngày': [
        { name: 'WinMart+ - Mua rau củ hữu cơ & thịt nạc', min: 220000, max: 480000 },
        { name: 'CoopMart - Nhu yếu phẩm & nước giặt OMO', min: 380000, max: 820000 },
        { name: 'Bách Hóa Xanh - Thực phẩm tươi sống & trứng', min: 160000, max: 380000 },
        { name: 'Pharmacity - Dầu gội Head & Shoulders & sữa tắm', min: 140000, max: 300000 }
    ],
    'Quần áo': [
        { name: 'Shopee Mall - Áo thun Polo Uniqlo Dry-EX', min: 220000, max: 450000 },
        { name: 'Uniqlo Vincom - Áo khoác chống nắng UV Block', min: 520000, max: 850000 },
        { name: 'Zara Vietnam - Áo sơ mi công sở Oxford', min: 650000, max: 1050000 },
        { name: 'Shopee - Set vớ cotton nam cao cấp 5 đôi', min: 89000, max: 149000 }
    ],
    'Mỹ phẩm': [
        { name: 'Hasaki Beauty - Kem chống nắng Anessa Perfect UV', min: 380000, max: 590000 },
        { name: 'Watsons - Sữa rửa mặt CeraVe Foaming Cleanser', min: 290000, max: 450000 },
        { name: 'Guardian - Son dưỡng môi DHC Medicated Lip', min: 150000, max: 240000 },
        { name: 'Shopee Mall - Serum La Roche-Posay Hyalu B5', min: 450000, max: 720000 }
    ],
    'Phí giao lưu': [
        { name: 'Cà phê gặp đối tác công nghệ - The Coffee House', min: 130000, max: 280000 },
        { name: 'Tiệc sinh nhật đồng nghiệp - Lẩu Kichi-Kichi', min: 380000, max: 700000 },
        { name: 'Giao lưu bóng đá giao hữu - Tiền thuê sân cỏ', min: 120000, max: 220000 },
        { name: 'Xem phim CGV Cinema - Combo vé IMAX & bắp nước', min: 260000, max: 420000 }
    ],
    'Y tế': [
        { name: 'Nhà thuốc Long Châu - Thuốc cảm cúm & Vitamin C sủi', min: 90000, max: 195000 },
        { name: 'Pharmacity - Nước muối sinh lý 0.9% & khẩu trang N95', min: 50000, max: 110000 },
        { name: 'Nhà thuốc An Khang - Dầu cá Omega 3 Blackmores Úc', min: 210000, max: 380000 },
        { name: 'Khám sức khỏe định kỳ & xét nghiệm máu tổng quát', min: 500000, max: 950000 }
    ],
    'Giáo dục': [
        { name: 'Học phí khóa học IELTS Master Online 3 tháng', min: 950000, max: 1650000 },
        { name: 'Nạp tiền mua khóa học lập trình Fullstack Udemy', min: 279000, max: 549000 },
        { name: 'Sách Tiki - Combo Sách Kỹ Năng Tài Chính & Đầu Tư', min: 195000, max: 380000 },
        { name: 'Nhà sách Fahasa - Sổ tay tay bìa da & Bút ký Parker', min: 110000, max: 220000 }
    ],
    'Tiền điện': [
        { name: 'Hóa đơn Tiền điện sinh hoạt EVN HCMC', min: 720000, max: 1550000 },
        { name: 'Thanh toán Tiền nước máy Sawaco', min: 130000, max: 290000 }
    ],
    'Đi lại': [
        { name: 'GrabBike - Đón đi làm vào giờ cao điểm sáng', min: 28000, max: 48000 },
        { name: 'GrabCar Plus - Đi công tác gặp đối tác doanh nghiệp', min: 95000, max: 195000 },
        { name: 'Đổ đầy bình xăng A95 - Cây xăng Petrolimex', min: 85000, max: 130000 },
        { name: 'Nạp tiền thẻ ePass / VETC thu phí tự động cao tốc', min: 250000, max: 550000 }
    ],
    'Phí liên lạc': [
        { name: 'Hóa đơn Cáp quang Internet Viettel 300Mbps', min: 275000, max: 275000 },
        { name: 'Nạp tiền điện thoại gói 4G Viettel V150N', min: 150000, max: 150000 }
    ],
    'Tiền nhà': [
        { name: 'Tiền thuê nhà trọ / chung cư cao cấp hàng tháng', min: 2500000, max: 6000000 },
        { name: 'Phí quản lý tòa nhà & Gửi xe máy tầng hầm', min: 180000, max: 380000 }
    ],
    'Mục tiêu tiết kiệm': [
        { name: 'Trích nạp tự động Quỹ Mua Xe Máy Mới Honda SH', min: 2000000, max: 5000000 },
        { name: 'Trích nạp Quỹ Dự Phòng Khẩn Cấp 6 tháng chi phí', min: 1500000, max: 3000000 }
    ],
    'Tiền lương': [
        { name: 'Chuyển khoản Lương định kỳ - Công ty Công nghệ TechVN', min: 9500000, max: 32000000 },
        { name: 'Phụ cấp ăn trưa & Trợ cấp đi lại hàng tháng', min: 1200000, max: 2200000 }
    ],
    'Tiền thưởng': [
        { name: 'Thưởng hiệu suất KPI công việc xuất sắc Quý', min: 3500000, max: 9000000 },
        { name: 'Hoàn tiền Cashback ưu đãi thẻ tín dụng hoàn tiền', min: 180000, max: 550000 }
    ],
    'Hoàn tiền tiết kiệm': [
        { name: 'Rút một phần Quỹ Dự Phòng Khẩn Cấp sửa xe', min: 1000000, max: 3000000 },
        { name: 'Tạm rút tiền từ quỹ tiết kiệm chi tiêu đột xuất', min: 2000000, max: 4000000 }
    ],
    'Trả nợ nhóm': [
        { name: 'Thanh toán tiền ăn lẩu nướng chia đều nhóm', min: 160000, max: 380000 },
        { name: 'Thanh toán tiền villa homestay du lịch nhóm', min: 550000, max: 1300000 }
    ],
    'Nhận tiền nhóm': [
        { name: 'Nhận tiền nhóm bạn B hoàn trả tiền cà phê', min: 85000, max: 195000 },
        { name: 'Nhận tiền nhóm thanh toán vé xem phim CGV', min: 130000, max: 260000 }
    ],
    'Xóa nợ nhóm': [
        { name: 'Quyết toán đối soát xóa nợ nhóm chuyến đi chơi', min: 220000, max: 450000 },
        { name: 'Cân bằng tài khoản xóa sạch công nợ nhóm', min: 120000, max: 320000 }
    ],
    'Cho nhóm mượn': [
        { name: 'Chi ứng trước toàn bộ tiền ăn tối cho nhóm', min: 450000, max: 1100000 },
        { name: 'Thanh toán trước hóa đơn tiệc Karaoke nhóm', min: 650000, max: 1600000 }
    ]
};

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED V8 (COMPLETE PAYMENT ORDERS, ENTITY DATA & AUDIT LOGS)
-- Payment Orders Integration: Full VNPay transaction audit history (BUDGET & DEBT)
-- Clean Budget Names (No repetitive "Ngân sách " prefix: e.g. "Tiền nhà T8/2026")
-- Full Entity Data (Payee Bank details, Due dates, External Loans, Group splits)
-- Complete Realtime Notifications (Z-Score Anomaly, Budget Warnings, Debt Reminders, Cash Settlements)
-- Nguyễn Văn A: 2 FULL YEARS (2025-01-01 to 2026-12-31 = 24 Months)
-- Other 4 Users: 1 FULL YEAR (2026-01-01 to 2026-12-31 = 12 Months)
-- ============================================================================

DO $$ 
DECLARE 
    tbl text;
    tbls text[] := ARRAY[
        'payment_orders', 'transaction_tags', 'transaction_splits', 'payments', 'expense_splits', 
        'expenses', 'group_members', 'notifications', 'budgets', 'savings_goals', 
        'external_loans', 'transactions', 'tags', 'payees', 'categories', 
        'wallets', 'groups', 'users'
    ];
BEGIN 
    FOREACH tbl IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl);
        END IF;
    END LOOP;
END $$;

-- 1. USERS
INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES
`;

const userValues = users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', '970422', '109${i}8888999', '${u.startYear}-01-01 08:00:00')`);
sql += userValues.join(',\n') + ';\n\n';

const state = {
    wallets: [], categories: [], payees: [], tags: [], loans: [], savings: [],
    budgets: [], notifs: [], groups: [], groupMembers: [], expenses: [],
    expenseSplits: [], payments: [], txs: [], txTags: [], txSplits: [],
    paymentOrders: []
};

// Global Groups
const groupTripId = uuid();
const groupDinnerId = uuid();

state.groups.push(`('${groupTripId}', 'Nhóm Du Lịch Xô Xát 2026', 'Quỹ du lịch Đà Lạt & Phú Quốc', '${users[2].id}', '2026-01-01 08:00:00')`);
state.groups.push(`('${groupDinnerId}', 'Nhà trọ & Hội Ăn Uống', 'Quỹ tiền phòng và ăn uống chung', '${users[0].id}', '2025-01-01 08:00:00')`);

users.forEach(u => {
    state.groupMembers.push(`('${uuid()}', '${groupTripId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '${u.startYear}-01-01 08:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${groupDinnerId}', '${u.id}', '${u.id === users[0].id ? 'owner' : 'member'}', '${u.startYear}-01-01 08:00:00')`);
});

users.forEach((u, uIdx) => {
    const wMain = uuid();     // Ví Điện Tử MBBank
    const wSavings = uuid();  // Ví Tiết Kiệm Vietcombank
    const wCredit = uuid();   // Thẻ Tín Dụng VPBank
    const createdAt = `${u.startYear}-01-01 08:00:00`;

    // 1. Categories (19 categories)
    const defaultCategories = [
        { name: 'Ăn uống', type: 'EXPENSE', icon: '🍽️' },
        { name: 'Chi tiêu hàng ngày', type: 'EXPENSE', icon: '🧴' },
        { name: 'Quần áo', type: 'EXPENSE', icon: '👕' },
        { name: 'Mỹ phẩm', type: 'EXPENSE', icon: '💄' },
        { name: 'Phí giao lưu', type: 'EXPENSE', icon: '🥂' },
        { name: 'Y tế', type: 'EXPENSE', icon: '💊' },
        { name: 'Giáo dục', type: 'EXPENSE', icon: '📚' },
        { name: 'Tiền điện', type: 'EXPENSE', icon: '💡' },
        { name: 'Đi lại', type: 'EXPENSE', icon: '🚆' },
        { name: 'Phí liên lạc', type: 'EXPENSE', icon: '📱' },
        { name: 'Tiền nhà', type: 'EXPENSE', icon: '🏠' },
        { name: 'Trả nợ nhóm', type: 'TRANSFER', icon: '💸' },
        { name: 'Nhận tiền nhóm', type: 'TRANSFER', icon: '⬅️' },
        { name: 'Xóa nợ nhóm', type: 'TRANSFER', icon: '✅' },
        { name: 'Cho nhóm mượn', type: 'TRANSFER', icon: '➡️' },
        { name: 'Tiền lương', type: 'INCOME', icon: '💰' },
        { name: 'Tiền thưởng', type: 'INCOME', icon: '🎁' },
        { name: 'Hoàn tiền tiết kiệm', type: 'INCOME', icon: '🏦' },
        { name: 'Mục tiêu tiết kiệm', type: 'EXPENSE', icon: '🎯' }
    ];

    const categoryMap = {};
    defaultCategories.forEach(cat => {
        const cId = uuid();
        state.categories.push(`('${cId}', '${u.id}', '${cat.name}', '${cat.type}', '${cat.icon}')`);
        categoryMap[cat.name] = cId;
    });

    // Payees
    const payeesList = [
        'Highlands Coffee', 'WinMart+', 'CoopMart', 'Grab Việt Nam',
        'Công ty Cổ phần Công nghệ TechVN', 'Shopee Việt Nam', 'Điện lực EVN HCMC',
        'Viettel Telecom', 'Petrolimex', 'Hệ thống Cơm tấm Tám Giang'
    ];
    const pArr = [];
    payeesList.forEach(pName => {
        const pId = uuid();
        state.payees.push(`('${pId}', '${u.id}', '${pName}')`);
        pArr.push(pId);
    });

    // Tags
    const tagsList = ['Gia đình', 'Cá nhân', 'Du lịch', 'Công việc', 'Tiết kiệm', 'Thiết yếu'];
    const tArr = [];
    tagsList.forEach(tName => {
        const tId = uuid();
        state.tags.push(`('${tId}', '${u.id}', '${tName}')`);
        tArr.push(tId);
    });

    // External Loans
    if (u.persona === 'DEBTOR') {
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng VIB', 25000000, 6.5, '2026-01-10', '2026-12-31', 'Vay trả góp mua máy tính MacBook', false, '2026-01-10 09:00:00')`);
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Trần Thị B', 3000000, 0, '2026-04-15', '2026-09-01', 'Mượn tạm đóng tiền phòng trọ', false, '2026-04-15 10:00:00')`);
    } else {
        state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Đồng nghiệp công ty', 4000000, 0, '${u.startYear}-03-01', '${u.startYear}-09-01', 'Cho mượn tiền mua điện thoại', false, '${u.startYear}-03-01 10:00:00')`);
        state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Bạn học đại học', 2500000, 0, '${u.startYear}-05-10', '${u.startYear}-11-10', 'Cho mượn đóng học phí cao học', false, '${u.startYear}-05-10 14:00:00')`);
    }

    // Savings Goals
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Mua Xe Máy Mới', 50000000, ${u.sAmt1}, '2027-06-30', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Dự Phòng Khẩn Cấp', 30000000, ${u.sAmt2}, '2026-12-31', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);

    // Comprehensive Realistic Notifications
    state.notifs.push(`('${uuid()}', '${u.id}', '⚠️ Cảnh báo ngân sách: Bạn đã tiêu 85% hạn mức Ăn uống tháng 08/2026.', 'BUDGET_WARNING', false, '2026-08-05 14:30:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '🔴 Cảnh báo vượt hạn mức: Khoản Tiền nhà tháng 08/2026 đã vượt 122% hạn mức cho phép!', 'BUDGET_OVER', false, '2026-08-04 20:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '⚡ Phát hiện bất thường (Z-Score): Khoản chi "Tiệc lẩu nướng Haidilao" (5.800.000 ₫) tăng đột biến so với mức trung bình!', 'Z_SCORE_ANOMALY', false, '2026-08-04 19:35:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '🔔 Nhắc nợ nhóm: Lê Thị C đã soạn tin nhắc khéo khoản nợ 1.000.000 ₫ trong nhóm "Nhà trọ & Hội Ăn Uống".', 'DEBT_REMINDER', false, '2026-08-06 09:15:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '💵 Báo đã thanh toán: Trần Thị B báo đã chuyển khoản 1.000.000 ₫ tiền mặt cho bạn (Chờ duyệt).', 'DEBT_PAYMENT_NOTIFIED', false, '2026-08-07 10:20:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '✅ Thanh toán thành công: Bạn đã nhận được 1.000.000 ₫ từ Phạm Văn D qua VietQR.', 'DEBT_SETTLED', true, '2026-08-07 11:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '💸 Hóa đơn nhóm mới: Nguyễn Văn A vừa thêm hóa đơn "Tiền phòng trọ tháng 8" (3.000.000 ₫) chia 3 người.', 'EXPENSE_CREATED', true, '2026-08-01 08:30:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '🎯 Cột mốc tiết kiệm: Quỹ "Quỹ Mua Xe Máy Mới" của bạn đã đạt 70% tiến độ mục tiêu!', 'SAVINGS_MILESTONE', true, '2026-07-28 15:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', '💰 Thu nhập mới: Lương tháng 08/2026 (+32.000.000 ₫) đã được cộng vào Ví Điện Tử MBBank.', 'SALARY_RECEIVED', true, '2026-08-05 09:00:00')`);

    // Clean Budget configs per month without repetitive "Ngân sách "
    const budgetMultiplier = (u.persona === 'SPENDER') ? 0.7 : 1.0;
    const budgetConfigs = [
        { name: 'Ăn uống', limit: Math.round(5500000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false, dueDay: 25, bin: '970422', acc: '10928888999', accName: 'NHA HANG AN UONG' },
        { name: 'Chi tiêu hàng ngày', limit: Math.round(2500000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false, dueDay: 20, bin: '970422', acc: '10928888998', accName: 'SIEU THI WINMART' },
        { name: 'Tiền điện', limit: 2000000, type: 'BILL', mandatory: true, dueDay: 15, bin: '970422', acc: '10928888997', accName: 'CONG TY DIEN LUC EVN' },
        { name: 'Phí liên lạc', limit: 500000, type: 'BILL', mandatory: true, dueDay: 10, bin: '970422', acc: '10928888996', accName: 'VIETTEL TELECOM' },
        { name: 'Phí giao lưu', limit: Math.round(2000000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false, dueDay: 28, bin: '970422', acc: '10928888995', accName: 'THE COFFEE HOUSE' },
        { name: 'Mỹ phẩm', limit: 1200000, type: 'FLEXIBLE', mandatory: false, dueDay: 18, bin: '970422', acc: '10928888994', accName: 'HASAKI BEAUTY' },
        { name: 'Tiền nhà', limit: u.rentAmt, type: 'BILL', mandatory: true, dueDay: 5, bin: '970422', acc: '10928888993', accName: 'CHU NHA TRO' },
        { name: 'Quần áo', limit: 2000000, type: 'FLEXIBLE', mandatory: false, dueDay: 22, bin: '970422', acc: '10928888992', accName: 'UNIQLO VIETNAM' },
        { name: 'Đi lại', limit: 1500000, type: 'FLEXIBLE', mandatory: false, dueDay: 12, bin: '970422', acc: '10928888991', accName: 'PETROLIMEX' },
        { name: 'Y tế', limit: 1000000, type: 'FLEXIBLE', mandatory: false, dueDay: 14, bin: '970422', acc: '10928888990', accName: 'NHA THUOC LONG CHAU' }
    ];

    let netMainBalance = 0;

    // Loop target years (nguyenvana: 2025 & 2026; others: 2026)
    u.years.forEach(year => {
        for (let m = 1; m <= 12; m++) {
            const mStr = m.toString().padStart(2, '0');
            const budgetIdMap = {};

            // Budgets for expense categories (Clean naming: e.g. "Ăn uống T8/2026")
            budgetConfigs.forEach(bConfig => {
                const catId = categoryMap[bConfig.name];
                if (catId) {
                    const bId = uuid();
                    budgetIdMap[bConfig.name] = bId;
                    const cleanBudgetName = `${bConfig.name} T${m}/${year}`;
                    state.budgets.push(`('${bId}', '${u.id}', '${catId}', '${cleanBudgetName}', ${bConfig.limit}, ${m}, ${year}, '${bConfig.type}', true, ${bConfig.mandatory}, ${bConfig.dueDay}, '${bConfig.bin}', '${bConfig.acc}', '${bConfig.accName}', '${year}-${mStr}-01 08:00:00')`);
                }
            });

            // GUARANTEE: EVERY CATEGORY GETS AT LEAST 2 TRANSACTIONS PER MONTH!
            Object.keys(categoryItemsMap).forEach(catName => {
                const catId = categoryMap[catName];
                if (!catId) return;
                const items = categoryItemsMap[catName];
                const catType = defaultCategories.find(c => c.name === catName).type;

                // Pick 2 distinct days in month for the 2 transactions
                const daysInMonth = (m === 2) ? 28 : (m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 28);
                const day1 = randomInt(1, Math.floor(daysInMonth / 2));
                const day2 = randomInt(Math.floor(daysInMonth / 2) + 1, daysInMonth);

                [day1, day2].forEach((day, idx) => {
                    const item = items[(idx + randomInt(0, items.length - 1)) % items.length];
                    const txId = uuid();
                    let amt = randomInt(item.min, item.max);
                    
                    // Special override for Base Salary on 1st tx of 'Tiền lương'
                    if (catName === 'Tiền lương' && idx === 0) {
                        amt = u.baseSalary;
                    }

                    const hour = catType === 'INCOME' ? 9 : randomInt(7, 21);
                    const minute = randomInt(0, 59);
                    const txDate = formatDate(year, m, day, hour, minute);
                    const payeeId = pArr[randomInt(0, pArr.length - 1)];

                    // Check if this is a Bill / Mandatory payment that was settled via VNPay
                    const linkedBudgetId = budgetIdMap[catName] || null;
                    const isVNPayBill = (catName === 'Tiền điện' || catName === 'Phí liên lạc' || catName === 'Tiền nhà') && (m < 8 || (m === 8 && day <= 10));

                    let txNote = item.name;

                    if (isVNPayBill && linkedBudgetId) {
                        const txnRef = generateTxnRef(year, m, day, hour, minute);
                        const vnpTxNo = `14${randomInt(10000000, 99999999)}`;
                        const vnpPayDate = formatVnpDate(year, m, day, hour, minute);
                        const createdAtDate = formatDate(year, m, day, hour, Math.max(0, minute - 2));
                        const expiredAtDate = formatDate(year, m, day, hour, Math.min(59, minute + 13));

                        state.paymentOrders.push(`('${uuid()}', '${txnRef}', '${u.id}', 'BUDGET', ${amt}, '${wMain}', '${catId}', '${linkedBudgetId}', NULL, NULL, 'SUCCESS', '${vnpTxNo}', 'NCB', 'ATM', '${vnpPayDate}', '00', 'Thanh toan ngan sach ${txnRef}', '${createdAtDate}', '${expiredAtDate}', '${txDate}')`);
                        txNote = `Thanh toán hoá đơn VNPay (Mã ĐH: ${txnRef})`;
                    }

                    const linkedBudgetIdSql = linkedBudgetId ? `'${linkedBudgetId}'` : 'NULL';
                    state.txs.push(`('${txId}', '${wMain}', ${amt}, '${catType}', '${catId}', ${linkedBudgetIdSql}, '${payeeId}', '${txDate}', '${txNote}', false, false, false, '${txDate}')`);
                    
                    // Track balance
                    if (catType === 'INCOME') {
                        netMainBalance += amt;
                    } else if (catType === 'EXPENSE') {
                        netMainBalance -= amt;
                    }
                });
            });

            // Extra daily food & beverage & transport transactions for realistic density
            const daysInMonth = (m === 2) ? 28 : (m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 28);
            for (let d = 1; d <= daysInMonth; d++) {
                if (Math.random() > 0.3) {
                    const foodItem = randomElement(categoryItemsMap['Ăn uống']);
                    const foodTxId = uuid();
                    const foodAmt = randomInt(foodItem.min, foodItem.max);
                    const foodDate = formatDate(year, m, d, randomInt(11, 14), randomInt(0, 59));
                    state.txs.push(`('${foodTxId}', '${wMain}', ${foodAmt}, 'EXPENSE', '${categoryMap['Ăn uống']}', NULL, '${pArr[9]}', '${foodDate}', '${foodItem.name}', false, false, false, '${foodDate}')`);
                    netMainBalance -= foodAmt;
                }
            }

            // Group Expenses Simulation & VNPay Settlement for DEBT
            if (u.id === users[2].id) {
                const expId = uuid();
                const expDate = `${year}-${mStr}-18 19:30:00`;
                const totalGroupAmt = 4000000;
                const perUserAmt = 800000;
                state.expenses.push(`('${expId}', '${groupDinnerId}', '${u.id}', 'Ăn tiệc lẩu nướng Gogi T${mStr}/${year}', ${totalGroupAmt}, 'Ăn uống', '${expDate}')`);
                
                users.forEach(gUser => {
                    const isPaid = gUser.id === u.id || (m < 8 && Math.random() > 0.2);
                    state.expenseSplits.push(`('${uuid()}', '${expId}', '${gUser.id}', ${perUserAmt}, ${isPaid})`);
                    if (gUser.id !== u.id && isPaid) {
                        const payDate = `${year}-${mStr}-19 10:00:00`;
                        state.payments.push(`('${uuid()}', '${groupDinnerId}', '${gUser.id}', '${u.id}', ${perUserAmt}, 'completed', '${payDate}')`);

                        // Create VNPay PaymentOrder for Debt settlement
                        const debtTxnRef = generateTxnRef(year, m, 19, 10, 0);
                        const debtVnpTxNo = `14${randomInt(10000000, 99999999)}`;
                        const debtVnpPayDate = formatVnpDate(year, m, 19, 10, 0);
                        state.paymentOrders.push(`('${uuid()}', '${debtTxnRef}', '${gUser.id}', 'DEBT', ${perUserAmt}, NULL, NULL, NULL, '${groupDinnerId}', '${u.id}', 'SUCCESS', '${debtVnpTxNo}', 'NCB', 'ATM', '${debtVnpPayDate}', '00', 'Thanh toan no nhom ${debtTxnRef}', '${year}-${mStr}-19 09:58:00', '${year}-${mStr}-19 10:13:00', '${payDate}')`);
                    }
                });
            }

            // Inject Over-limit & Approaching-limit transactions for Current Month (8/2026) to display warning card on Dashboard
            if (year === 2026 && m === 8) {
                // 1. Over limit: Tiền nhà (Limit 6.0M -> spent 7.34M = OVER LIMIT)
                const overRentId = uuid();
                const overRentDate = `2026-08-04 18:30:00`;
                state.txs.push(`('${overRentId}', '${wMain}', 7341756, 'EXPENSE', '${categoryMap['Tiền nhà']}', NULL, '${pArr[0]}', '${overRentDate}', 'Tiền phòng trọ và phụ phí quản lý T8', false, false, false, '${overRentDate}')`);
                netMainBalance -= 7341756;

                // 2. Over limit: Ăn uống (Limit 5.5M -> spent 5.8M = OVER LIMIT)
                const overTxId = uuid();
                const overDate = `2026-08-04 19:30:00`;
                state.txs.push(`('${overTxId}', '${wMain}', 5800000, 'EXPENSE', '${categoryMap['Ăn uống']}', NULL, '${pArr[0]}', '${overDate}', 'Tiệc lẩu nướng Haidilao mừng sinh nhật', false, false, false, '${overDate}')`);
                netMainBalance -= 5800000;

                // 3. Approaching limit: Phí giao lưu (Limit 2.0M -> spent 1.75M = 87.5% APPROACHING)
                const appTxId = uuid();
                const appDate = `2026-08-05 14:00:00`;
                state.txs.push(`('${appTxId}', '${wMain}', 1750000, 'EXPENSE', '${categoryMap['Phí giao lưu']}', NULL, '${pArr[1]}', '${appDate}', 'Mừng đám cưới đồng nghiệp phòng IT', false, false, false, '${appDate}')`);
                netMainBalance -= 1750000;

                // 4. Inject Mock PENDING and CANCELLED payment orders for User A in current month (8/2026)
                if (u.id === users[0].id) {
                    const pendingTxnRef = generateTxnRef(2026, 8, 14, 8, 30);
                    state.paymentOrders.push(`('${uuid()}', '${pendingTxnRef}', '${u.id}', 'BUDGET', 75000, '${wMain}', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, NULL, 'Thanh toan ngan sach ${pendingTxnRef}', '2026-08-14 08:30:00', '2026-08-14 08:45:00', NULL)`);

                    const cancelledTxnRef = generateTxnRef(2026, 8, 13, 15, 10);
                    state.paymentOrders.push(`('${uuid()}', '${cancelledTxnRef}', '${u.id}', 'BUDGET', 500000, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'CANCELLED', NULL, 'NCB', 'ATM', NULL, '24', 'Thanh toan ngan sach ${cancelledTxnRef}', '2026-08-13 15:10:00', '2026-08-13 15:25:00', NULL)`);
                }
            }
        }
    });

    // Ensure netMainBalance stays positive and realistic
    const finalMainBalance = Math.max(15000000, netMainBalance);
    const finalSavingsBalance = u.sAmt1 + u.sAmt2; // e.g. 60,000,000đ for User A!
    const finalCreditBalance = -4500000;

    state.wallets.push(`('${wMain}', '${u.id}', 'Ví Điện Tử (MBBank)', ${finalMainBalance}, 'VND', false, '${createdAt}')`);
    state.wallets.push(`('${wSavings}', '${u.id}', 'Ví Tiết Kiệm (Vietcombank)', ${finalSavingsBalance}, 'VND', false, '${createdAt}')`);
    state.wallets.push(`('${wCredit}', '${u.id}', 'Thẻ Tín Dụng VPBank', ${finalCreditBalance}, 'VND', true, '${createdAt}')`);
});

function append(header, arr) {
    if (arr.length === 0) return '';
    return header + arr.join(',\n') + ';\n\n';
}

sql += append('INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES\n', state.wallets);
sql += append('INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n', state.categories);
sql += append('INSERT INTO payees (id, user_id, name) VALUES\n', state.payees);
sql += append('INSERT INTO tags (id, user_id, name) VALUES\n', state.tags);
sql += append('INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled, created_at) VALUES\n', state.loans);
sql += append('INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at) VALUES\n', state.savings);
sql += append('INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, is_mandatory, due_day_of_month, payee_bank_bin, payee_bank_account, payee_account_name, created_at) VALUES\n', state.budgets);
sql += append('INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES\n', state.notifs);
sql += append('INSERT INTO groups (id, name, description, owner_id, created_at) VALUES\n', state.groups);
sql += append('INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES\n', state.groupMembers);
sql += append('INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES\n', state.expenses);
sql += append('INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n', state.expenseSplits);
sql += append('INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES\n', state.payments);
sql += '-- ========================= TRANSACTIONS =========================\n';
sql += append('INSERT INTO transactions (id, wallet_id, amount, type, category_id, linked_budget_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated, created_at) VALUES\n', state.txs);
sql += '-- ========================= PAYMENT ORDERS (VNPAY) =========================\n';
sql += append('INSERT INTO payment_orders (id, txn_ref, user_id, type, amount, wallet_id, category_id, budget_id, group_id, creditor_id, status, vnp_transaction_no, vnp_bank_code, vnp_card_type, vnp_pay_date, vnp_response_code, vnp_order_info, created_at, expired_at, paid_at) VALUES\n', state.paymentOrders);

fs.writeFileSync('seed_v8.sql', sql, 'utf8');
console.log('Successfully generated seed_v8.sql with complete VNPay payment orders, clean budget names, full entity data and audit notifications!');
