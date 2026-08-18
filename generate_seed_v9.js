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

function generateTxnRef(year, month, day, hour, minute, second = 0, prefix = 'SM') {
    const vnpTime = formatVnpDate(year, month, day, hour, minute, second);
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${vnpTime}${randomHex}`;
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
        { name: 'Gói cước Viettel 4G V120N - 60GB Data tốc độ cao', min: 120000, max: 120000 },
        { name: 'Thanh toán cước Internet cáp quang FPT Telecom', min: 220000, max: 275000 }
    ]
};

const categoryConfigs = [
    { name: 'Ăn uống', type: 'EXPENSE', icon: 'utensils' },
    { name: 'Chi tiêu hàng ngày', type: 'EXPENSE', icon: 'shopping-bag' },
    { name: 'Quần áo', type: 'EXPENSE', icon: 'shirt' },
    { name: 'Mỹ phẩm', type: 'EXPENSE', icon: 'sparkles' },
    { name: 'Phí giao lưu', type: 'EXPENSE', icon: 'users' },
    { name: 'Y tế', type: 'EXPENSE', icon: 'heart-pulse' },
    { name: 'Giáo dục', type: 'EXPENSE', icon: 'graduation-cap' },
    { name: 'Tiền điện', type: 'EXPENSE', icon: 'zap' },
    { name: 'Đi lại', type: 'EXPENSE', icon: 'car' },
    { name: 'Phí liên lạc', type: 'EXPENSE', icon: 'phone' },
    { name: 'Tiền nhà', type: 'EXPENSE', icon: 'home' },
    { name: 'Tiền lương', type: 'INCOME', icon: 'wallet' },
    { name: 'Thưởng', type: 'INCOME', icon: 'gift' },
    { name: 'Đầu tư', type: 'INCOME', icon: 'trending-up' },
    { name: 'Thu nhập phụ', type: 'INCOME', icon: 'coins' }
];

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED SCRIPT - VERSION 9 (SEED_V9.SQL)
-- Hệ thống sinh dữ liệu hoàn chỉnh, chuẩn hóa 24 tháng (2025 - 2026)
-- Tích hợp Đa Cổng Thanh Toán: PayOS (Open Banking VietQR), Google Pay, VNPay Gateway
-- ============================================================================

`;

// Dọn dẹp các bảng an toàn với PL/pgSQL
sql += `DO $$ 
DECLARE 
    tbl text;
    tbls text[] := ARRAY['payment_orders', 'transaction_splits', 'transactions', 'expense_splits', 'expenses', 'payments', 'group_members', 'groups', 'external_loans', 'savings_goals', 'budgets', 'categories', 'payees', 'tags', 'notifications', 'wallets', 'users'];
BEGIN 
    FOREACH tbl IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl);
        END IF;
    END LOOP;
END $$;\n\n`;

// Insert Users (khớp 100% Entity User.java với password_hash, bank_bin, bank_account_no)
sql += `-- ========================= USERS =========================\n`;
sql += `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES\n`;
sql += users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', '970422', '109${i}8888999', '2025-01-01 08:00:00')`).join(',\n') + ';\n\n';

const state = {
    wallets: [],
    categories: [],
    payees: [],
    tags: [],
    loans: [],
    savings: [],
    budgets: [],
    notifs: [],
    groups: [],
    groupMembers: [],
    expenses: [],
    expenseSplits: [],
    payments: [],
    txs: [],
    paymentOrders: []
};

// Groups
const groupTripId = uuid();
const groupDinnerId = uuid();

state.groups.push(`('${groupTripId}', 'Chuyến Du Lịch Đà Lạt 2026', 'Quỹ ăn chơi nhóm bạn thân', '${users[2].id}', '2026-01-10 09:00:00')`);
state.groups.push(`('${groupDinnerId}', 'Ăn Trưa Đồng Nghiệp IT', 'Nhóm chia tiền ăn trưa văn phòng', '${users[2].id}', '2026-01-05 12:00:00')`);

users.forEach(u => {
    state.groupMembers.push(`('${uuid()}', '${groupTripId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-10 09:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${groupDinnerId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-05 12:00:00')`);
});

users.forEach(u => {
    const createdAt = `${u.startYear}-01-01 08:00:00`;
    const wMain = uuid();
    const wSavings = uuid();
    const wCredit = uuid();

    const categoryMap = {};
    categoryConfigs.forEach(c => {
        const cId = uuid();
        categoryMap[c.name] = cId;
        state.categories.push(`('${cId}', '${u.id}', '${c.name}', '${c.type}', '${c.icon}')`);
    });

    const pArr = [];
    ['Chủ nhà trọ Nguyễn Văn Bính', 'WinMart Vincom Mega', 'Công ty Cổ Phần Phần Mềm VNG', 'Shopee Mall Official'].forEach(p => {
        const pId = uuid();
        pArr.push(pId);
        state.payees.push(`('${pId}', '${u.id}', '${p}')`);
    });

    ['#an_uong', '#mua_sam', '#cong_viec', '#du_lich'].forEach(tag => {
        state.tags.push(`('${uuid()}', '${u.id}', '${tag}')`);
    });

    // External Loans
    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng Quân Đội (MBBank)', 100000000, 7.5, '${u.startYear}-01-15', '${u.startYear + 3}-01-15', 'Vay mua xe máy trả góp', false, '${createdAt}')`);
    state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Trần Văn Hưng (Đồng nghiệp)', 15000000, 0.0, '${u.startYear}-03-10', '${u.startYear + 1}-03-10', 'Cho mượn tiền chữa bệnh', false, '${createdAt}')`);

    // Savings Goals (Status: IN_PROGRESS / COMPLETED)
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Khẩn Cấp 6 Tháng Chi Tiêu', 100000000, ${u.sAmt1}, '2026-12-31', 'IN_PROGRESS', '${createdAt}')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Mua Xe Máy Honda SH 160i ABS', 120000000, ${u.sAmt2}, '2026-11-30', 'IN_PROGRESS', '${createdAt}')`);

    // Notifications
    state.notifs.push(`('${uuid()}', '${u.id}', 'Chào mừng bạn đến với ShareMoney! Hãy thiết lập ngân sách đầu tiên.', 'SYSTEM', true, '${createdAt}')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Ngân sách Ăn uống tháng 08/2026 của bạn đã chi tiêu đạt 85% hạn mức.', 'BUDGET_WARNING', false, '2026-08-14 10:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Giao dịch thanh toán PayOS thành công: 1.329.856 ₫ (Mã ĐH: POS17867291)', 'PAYMENT_SUCCESS', false, '2026-08-15 14:00:00')`);

    let netMainBalance = 0;

    u.years.forEach(year => {
        const startM = (year === 2025) ? 1 : 1;
        const endM = (year === 2026) ? 8 : 12;

        for (let m = startM; m <= endM; m++) {
            const mStr = m.toString().padStart(2, '0');
            const salaryDate = `${year}-${mStr}-05 08:30:00`;
            const bonusDate = `${year}-${mStr}-25 17:00:00`;

            // 1. Income: Salary
            state.txs.push(`('${uuid()}', '${wMain}', ${u.baseSalary}, 'INCOME', '${categoryMap['Tiền lương']}', NULL, '${pArr[2]}', '${salaryDate}', 'Nhận lương tháng ${mStr}/${year}', false, false, false, '${salaryDate}')`);
            netMainBalance += u.baseSalary;

            // 2. Income: Bonus
            if (m % 3 === 0) {
                const bonusAmt = 5000000;
                state.txs.push(`('${uuid()}', '${wMain}', ${bonusAmt}, 'INCOME', '${categoryMap['Thưởng']}', NULL, '${pArr[2]}', '${bonusDate}', 'Thưởng KPI Quý ${m/3}', false, false, false, '${bonusDate}')`);
                netMainBalance += bonusAmt;
            }

            // 3. Budgets for this month (Type: FLEXIBLE / BILL)
            const budgetIdMap = {};
            const bConfigs = [
                { name: 'Ăn uống', limit: 5500000, due: null, bankBin: null, accNo: null, accName: null, type: 'FLEXIBLE', mand: false },
                { name: 'Chi tiêu hàng ngày', limit: 3000000, due: null, bankBin: null, accNo: null, accName: null, type: 'FLEXIBLE', mand: false },
                { name: 'Quần áo', limit: 1500000, due: null, bankBin: null, accNo: null, accName: null, type: 'FLEXIBLE', mand: false },
                { name: 'Phí giao lưu', limit: 2000000, due: null, bankBin: null, accNo: null, accName: null, type: 'FLEXIBLE', mand: false },
                { name: 'Đi lại', limit: 1200000, due: null, bankBin: null, accNo: null, accName: null, type: 'FLEXIBLE', mand: false },
                { name: 'Tiền nhà', limit: u.rentAmt, due: 5, bankBin: '970422', accNo: '10908888999', accName: 'NGUYEN VAN BINH', type: 'BILL', mand: true },
                { name: 'Tiền điện', limit: 1200000, due: 15, bankBin: '970436', accNo: '1012345678', accName: 'EVN HCMC', type: 'BILL', mand: true },
                { name: 'Phí liên lạc', limit: 250000, due: 20, bankBin: '970407', accNo: '19033338888', accName: 'VIETTEL TELECOM', type: 'BILL', mand: true }
            ];

            bConfigs.forEach(bc => {
                const bId = uuid();
                budgetIdMap[bc.name] = bId;
                const binVal = bc.bankBin ? `'${bc.bankBin}'` : 'NULL';
                const accVal = bc.accNo ? `'${bc.accNo}'` : 'NULL';
                const nameVal = bc.accName ? `'${bc.accName}'` : 'NULL';
                const dueVal = bc.due ? bc.due : 'NULL';
                state.budgets.push(`('${bId}', '${u.id}', '${categoryMap[bc.name]}', '${bc.name}', ${bc.limit}, ${m}, ${year}, '${bc.type}', true, ${bc.mand}, ${dueVal}, ${binVal}, ${accVal}, ${nameVal}, '${year}-${mStr}-01 08:00:00')`);
            });

            // 4. Fixed Expenses & Online Payment Simulation
            // 4.1 Tiền nhà
            const rentTxnRef = generateTxnRef(year, m, 5, 9, 0, 0, 'SM');
            const rentTxId = uuid();
            const rentDate = `${year}-${mStr}-05 09:00:00`;
            state.txs.push(`('${rentTxId}', '${wMain}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentDate}', 'Thanh toán tiền nhà T${mStr}/${year} (Mã ĐH: ${rentTxnRef})', false, false, false, '${rentDate}')`);
            netMainBalance -= u.rentAmt;

            const rentVnpTxNo = `14${randomInt(10000000, 99999999)}`;
            const rentVnpPayDate = formatVnpDate(year, m, 5, 9, 0);
            state.paymentOrders.push(`('${uuid()}', '${rentTxnRef}', '${u.id}', 'BUDGET', ${u.rentAmt}, '${wMain}', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', NULL, NULL, 'SUCCESS', '${rentVnpTxNo}', 'NCB', 'ATM', '${rentVnpPayDate}', '00', 'Thanh toan tien nha ${rentTxnRef}', '${year}-${mStr}-05 08:58:00', '${year}-${mStr}-05 09:13:00', '${rentDate}')`);

            // 4.2 Tiền điện qua PayOS Open Banking (VietQR)
            const elecTxnRef = generateTxnRef(year, m, 15, 14, 30, 0, 'POS');
            const elecTxId = uuid();
            const elecAmt = randomInt(750000, 1150000);
            const elecDate = `${year}-${mStr}-15 14:30:00`;
            state.txs.push(`('${elecTxId}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, '${elecDate}', 'Thanh toán Tiền điện EVN qua PayOS VietQR (Mã ĐH: ${elecTxnRef})', false, false, false, '${elecDate}')`);
            netMainBalance -= elecAmt;

            const elecVnpTxNo = `POS_${randomInt(10000000, 99999999)}`;
            const elecVnpPayDate = formatVnpDate(year, m, 15, 14, 30);
            state.paymentOrders.push(`('${uuid()}', '${elecTxnRef}', '${u.id}', 'BUDGET', ${elecAmt}, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'SUCCESS', '${elecVnpTxNo}', 'PAYOS_VIETQR', 'VIETQR_NAPAS247', '${elecVnpPayDate}', '00', 'Thanh toan PayOS ${elecTxnRef}', '${year}-${mStr}-15 14:28:00', '${year}-${mStr}-15 14:43:00', '${elecDate}')`);

            // 4.3 Phí liên lạc qua VNPay Gateway
            const phoneTxnRef = generateTxnRef(year, m, 20, 10, 15, 0, 'SM');
            const phoneTxId = uuid();
            const phoneAmt = 120000;
            const phoneDate = `${year}-${mStr}-20 10:15:00`;
            state.txs.push(`('${phoneTxId}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', NULL, '${phoneDate}', 'Thanh toán cước Viettel qua VNPay (Mã ĐH: ${phoneTxnRef})', false, false, false, '${phoneDate}')`);
            netMainBalance -= phoneAmt;

            const phoneVnpTxNo = `14${randomInt(10000000, 99999999)}`;
            const phoneVnpPayDate = formatVnpDate(year, m, 20, 10, 15);
            state.paymentOrders.push(`('${uuid()}', '${phoneTxnRef}', '${u.id}', 'BUDGET', ${phoneAmt}, '${wMain}', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', NULL, NULL, 'SUCCESS', '${phoneVnpTxNo}', 'NCB', 'ATM', '${phoneVnpPayDate}', '00', 'Thanh toan ngan sach ${phoneTxnRef}', '${year}-${mStr}-20 10:14:00', '${year}-${mStr}-20 10:29:00', '${phoneDate}')`);

            // 5. Daily Variable Expenses
            const daysInMonth = (year === 2026 && m === 8) ? 14 : 28;
            for (let d = 1; d <= daysInMonth; d++) {
                if (d === 5 || d === 15 || d === 20) continue;

                // 2-3 transactions per day
                const txCount = randomInt(2, 3);
                for (let k = 0; k < txCount; k++) {
                    const catKeys = Object.keys(categoryItemsMap);
                    const catName = randomElement(catKeys);
                    const item = randomElement(categoryItemsMap[catName]);
                    const amt = randomInt(item.min, item.max);
                    const hour = randomInt(7, 21);
                    const min = randomInt(0, 59);
                    const txDate = formatDate(year, m, d, hour, min);
                    const bId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';

                    state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${categoryMap[catName]}', ${bId}, NULL, '${txDate}', '${item.name}', false, false, false, '${txDate}')`);
                    netMainBalance -= amt;
                }
            }

            // Group Expenses Simulation & PayOS/VNPay Settlement for DEBT
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

                        // Create PayOS & VNPay PaymentOrder for Debt settlement
                        const debtTxnRef = generateTxnRef(year, m, 19, 10, 0, 0, (m % 2 === 0) ? 'POS' : 'SM');
                        const debtVnpTxNo = `14${randomInt(10000000, 99999999)}`;
                        const debtVnpPayDate = formatVnpDate(year, m, 19, 10, 0);
                        const bankProvider = (m % 2 === 0) ? 'PAYOS_VIETQR' : 'NCB';
                        const cardProvider = (m % 2 === 0) ? 'VIETQR_NAPAS247' : 'ATM';
                        state.paymentOrders.push(`('${uuid()}', '${debtTxnRef}', '${gUser.id}', 'DEBT', ${perUserAmt}, NULL, NULL, NULL, '${groupDinnerId}', '${u.id}', 'SUCCESS', '${debtVnpTxNo}', '${bankProvider}', '${cardProvider}', '${debtVnpPayDate}', '00', 'Thanh toan no nhom ${debtTxnRef}', '${year}-${mStr}-19 09:58:00', '${year}-${mStr}-19 10:13:00', '${payDate}')`);
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

                // 4. Inject Mock PENDING, CANCELLED and SUCCESS Multi-Gateway payment orders for User A in current month (8/2026)
                if (u.id === users[0].id) {
                    // PayOS Pending Order
                    const payosPendingRef = generateTxnRef(2026, 8, 15, 14, 45, 0, 'POS');
                    state.paymentOrders.push(`('${uuid()}', '${payosPendingRef}', '${u.id}', 'BUDGET', 1329856, '${wMain}', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', NULL, NULL, 'PENDING', NULL, 'PAYOS_VIETQR', 'VIETQR_NAPAS247', NULL, NULL, 'Thanh toan PayOS ${payosPendingRef}', '2026-08-15 14:45:00', '2026-08-15 15:00:00', NULL)`);

                    // VNPay Pending Order
                    const vnpPendingRef = generateTxnRef(2026, 8, 15, 13, 30, 0, 'SM');
                    state.paymentOrders.push(`('${uuid()}', '${vnpPendingRef}', '${u.id}', 'BUDGET', 75000, '${wMain}', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, NULL, 'Thanh toan ngan sach ${vnpPendingRef}', '2026-08-15 13:30:00', '2026-08-15 13:45:00', NULL)`);

                    // Cancelled Order
                    const cancelledTxnRef = generateTxnRef(2026, 8, 13, 15, 10, 0, 'SM');
                    state.paymentOrders.push(`('${uuid()}', '${cancelledTxnRef}', '${u.id}', 'BUDGET', 500000, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'CANCELLED', NULL, 'NCB', 'ATM', NULL, '24', 'Thanh toan ngan sach ${cancelledTxnRef}', '2026-08-13 15:10:00', '2026-08-13 15:25:00', NULL)`);
                }
            }
        }
    });

    // Ensure netMainBalance stays positive and realistic
    const finalMainBalance = Math.max(18500000, netMainBalance);
    const finalSavingsBalance = u.sAmt1 + u.sAmt2;
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
sql += '-- ========================= PAYMENT ORDERS (PAYOS / VNPAY) =========================\n';
sql += append('INSERT INTO payment_orders (id, txn_ref, user_id, type, amount, wallet_id, category_id, budget_id, group_id, creditor_id, status, vnp_transaction_no, vnp_bank_code, vnp_card_type, vnp_pay_date, vnp_response_code, vnp_order_info, created_at, expired_at, paid_at) VALUES\n', state.paymentOrders);

fs.writeFileSync('seed_v9.sql', sql, 'utf8');
console.log('Successfully generated seed_v9.sql with PayOS and VNPay Payment Orders, clean budget data, full entity mappings and audit records!');
