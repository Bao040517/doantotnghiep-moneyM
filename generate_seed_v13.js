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

// 5 User Personas with modern cartoon/robot avatars and realistic salary/balances
const users = [
    { id: '1a111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn A (Thông Thái)', email: 'nguyenvana@gmail.com', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', baseSalary: 18000000, rentAmt: 1800000, persona: 'SAVER', years: [2025, 2026], startYear: 2025, sAmt1: 3500000, sAmt2: 1500000, bankBin: '970422', bankAcc: '10908888999' },
    { id: '1b111111-1111-4111-a111-111111111111', name: 'Trần Thị B (Tiêu Lố)', email: 'tranthib@gmail.com', avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', baseSalary: 13000000, rentAmt: 1500000, persona: 'SPENDER', years: [2026], startYear: 2026, sAmt1: 2000000, sAmt2: 500000, bankBin: '970436', bankAcc: '10918888999' },
    { id: '1c111111-1111-4111-a111-111111111111', name: 'Lê Thị C (Trùm Nhóm)', email: 'lethic@gmail.com', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Leo', baseSalary: 15000000, rentAmt: 1600000, persona: 'GROUP_LEADER', years: [2026], startYear: 2026, sAmt1: 2500000, sAmt2: 1000000, bankBin: '970407', bankAcc: '10928888999' },
    { id: '1d111111-1111-4111-a111-111111111111', name: 'Phạm Văn D (Con Nợ)', email: 'phamvand@gmail.com', avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Sam', baseSalary: 9500000, rentAmt: 1400000, persona: 'DEBTOR', years: [2026], startYear: 2026, sAmt1: 1000000, sAmt2: 500000, bankBin: '970418', bankAcc: '10938888999' },
    { id: '1e111111-1111-4111-a111-111111111111', name: 'Hoàng Thị E (Newbie GenZ)', email: 'hoangthie@gmail.com', avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Max', baseSalary: 7500000, rentAmt: 1200000, persona: 'NEWBIE', years: [2026], startYear: 2026, sAmt1: 800000, sAmt2: 200000, bankBin: '970423', bankAcc: '10948888999' }
];

const categoryItemsMap = {
    'Ăn uống': [
        { name: 'Phở Thìn Lò Đúc - Bát tái nạm', min: 45000, max: 65000 },
        { name: 'Cơm tấm Sườn Bì Chả - Nguyễn Trãi', min: 35000, max: 55000 },
        { name: 'Bún chả Hương Liên - Suất thường', min: 40000, max: 55000 },
        { name: 'Bánh mì Huỳnh Hoa - Ổ giòn đặc biệt', min: 35000, max: 50000 },
        { name: 'Cơm trưa văn phòng Giao Tận Nơi', min: 35000, max: 45000 },
        { name: 'Lẩu nướng Haidilao - Set ăn trưa mini', min: 180000, max: 280000 },
        { name: 'KFC Vietnam - Combo 1 người', min: 69000, max: 99000 },
        { name: 'Bún bò Huế Đông Ba - Tô bắp bò', min: 40000, max: 55000 },
        { name: 'Highlands Coffee - Phin Sữa Đá Vừa', min: 29000, max: 39000 },
        { name: 'Starbucks Coffee - Americano Tall', min: 55000, max: 75000 },
        { name: 'Trà sữa Phúc Long - Trà đào sữa', min: 45000, max: 60000 },
        { name: 'Cà phê muối Chú Long - 1 ly mang về', min: 18000, max: 25000 }
    ],
    'Chi tiêu hàng ngày': [
        { name: 'WinMart+ - Mua rau củ & trứng gà', min: 65000, max: 145000 },
        { name: 'CoopMart - Nhu yếu phẩm & nước rửa chén', min: 85000, max: 180000 },
        { name: 'Bách Hóa Xanh - Thực phẩm tươi sống', min: 55000, max: 125000 },
        { name: 'Pharmacity - Dầu gội & khăn giấy', min: 45000, max: 95000 }
    ],
    'Quần áo': [
        { name: 'Shopee Mall - Áo thun cotton basic', min: 120000, max: 220000 },
        { name: 'Uniqlo Vincom - Áo chống nắng AIRism', min: 280000, max: 450000 },
        { name: 'Shopee - Set vớ nam nữ 5 đôi', min: 45000, max: 79000 }
    ],
    'Mỹ phẩm': [
        { name: 'Hasaki Beauty - Kem chống nắng mini', min: 120000, max: 220000 },
        { name: 'Watsons - Sữa rửa mặt Simple dịu nhẹ', min: 85000, max: 145000 },
        { name: 'Guardian - Son dưỡng môi DHC', min: 95000, max: 145000 }
    ],
    'Phí giao lưu': [
        { name: 'Cà phê gặp bạn bè - The Coffee House', min: 55000, max: 110000 },
        { name: 'Tiệc liên hoan nhỏ cuối tuần', min: 150000, max: 280000 },
        { name: 'Tiền thuê sân cầu lông giao lưu', min: 60000, max: 100000 },
        { name: 'Xem phim CGV Cinema - Vé 2D & bắp', min: 110000, max: 160000 }
    ],
    'Y tế': [
        { name: 'Nhà thuốc Long Châu - Thuốc cảm & C sủi', min: 45000, max: 85000 },
        { name: 'Pharmacity - Khẩu trang y tế & nước súc miệng', min: 35000, max: 65000 },
        { name: 'Khám kiểm tra sức khỏe nhẹ', min: 150000, max: 300000 }
    ],
    'Giáo dục': [
        { name: 'Sách Tiki - Sách quản lý tài chính cá nhân', min: 85000, max: 165000 },
        { name: 'Khóa học online ngắn hạn Udemy flash-sale', min: 199000, max: 299000 },
        { name: 'Nhà sách Fahasa - Vở ghi chép & bút', min: 45000, max: 85000 }
    ],
    'Tiền điện': [
        { name: 'Hóa đơn Tiền điện sinh hoạt EVN HCMC', min: 380000, max: 680000 },
        { name: 'Thanh toán Tiền nước sinh hoạt', min: 65000, max: 125000 }
    ],
    'Đi lại': [
        { name: 'GrabBike - Đi làm vào giờ cao điểm', min: 18000, max: 32000 },
        { name: 'GrabCar - Đi công việc trời mưa', min: 55000, max: 95000 },
        { name: 'Đổ xăng xe máy A95', min: 60000, max: 90000 },
        { name: 'Nạp thẻ xe buýt / vé metro tháng', min: 100000, max: 150000 }
    ],
    'Phí liên lạc': [
        { name: 'Gói cước 4G Viettel tháng', min: 70000, max: 120000 },
        { name: 'Cước Internet chia phòng', min: 80000, max: 120000 }
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

const defaultPayeeTemplates = [
    { name: 'Chủ nhà trọ Nguyễn Văn Bính', bankBin: '970422', bankName: 'MBBank', bankAccount: '10908888999', accountName: 'NGUYEN VAN BINH', phone: '0901888999' },
    { name: 'Công ty Điện lực EVN HCMC', bankBin: '970436', bankName: 'VCB', bankAccount: '1012345678', accountName: 'EVN HCMC', phone: '1900545454' },
    { name: 'Tập đoàn Viễn thông Viettel', bankBin: '970407', bankName: 'Techcombank', bankAccount: '19033338888', accountName: 'VIETTEL TELECOM', phone: '18008098' },
    { name: 'WinMart Vincom Mega', bankBin: '970418', bankName: 'BIDV', bankAccount: '21510001234567', accountName: 'WINCOMMERCE JSC', phone: '02471066866' },
    { name: 'Công ty Cổ Phần Phần Mềm VNG', bankBin: '970423', bankName: 'TPBank', bankAccount: '00001928374', accountName: 'VNG CORPORATION', phone: '02839623888' },
    { name: 'Shopee Mall Official', bankBin: '970432', bankName: 'VPBank', bankAccount: '999888777666', accountName: 'SHOPEE VIETNAM', phone: '19001221' }
];

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED SCRIPT - VERSION 13 (SEED_V13.SQL)
-- Dữ liệu khổng lồ 20 tháng (01/2025 -> 20/08/2026), Mốc thời gian thực tế cắt tại 20/08/2026
-- Tuyệt đối không sinh dữ liệu tương lai, Giới hạn ngân sách <= 2Tr, Số dư ví <= 25Tr
-- Đầy đủ 18 bảng Entity, Avatar DiceBear, Avatar nhóm chi tiêu, Đa Cổng Thanh Toán (PayOS / VNPay)
-- ============================================================================

-- ============================================================================
-- 0. SCHEMA DEFINITIONS (CREATE TABLE IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(50),
    bank_bin VARCHAR(20),
    bank_account_no VARCHAR(50),
    bank_qr_url TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    is_liability BOOLEAN NOT NULL DEFAULT FALSE,
    bank_bin VARCHAR(20),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    icon_name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS payees (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bank_bin VARCHAR(20),
    bank_name VARCHAR(255),
    bank_account VARCHAR(50),
    account_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(19, 4) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    due_day_of_month INT,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    payee_id UUID,
    payee_bank_bin VARCHAR(20),
    payee_bank_account VARCHAR(50),
    payee_account_name VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(19, 4) NOT NULL,
    current_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    deadline_date DATE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS external_loans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    principal_amount NUMERIC(19, 4) NOT NULL,
    interest_rate NUMERIC(5, 2),
    start_date DATE,
    due_date DATE,
    description TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(19, 4) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,
    type VARCHAR(50) NOT NULL,
    note TEXT,
    transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    linked_expense_id UUID,
    linked_budget_id UUID,
    payee_id UUID,
    is_split BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_from_budget BOOLEAN DEFAULT FALSE,
    is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_splits (
    id UUID PRIMARY KEY,
    parent_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY,
    txn_ref VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    wallet_id UUID,
    category_id UUID,
    budget_id UUID,
    group_id UUID,
    creditor_id UUID,
    status VARCHAR(50) NOT NULL,
    vnp_transaction_no VARCHAR(100),
    vnp_bank_code VARCHAR(50),
    vnp_card_type VARCHAR(50),
    vnp_pay_date VARCHAR(50),
    vnp_response_code VARCHAR(50),
    vnp_order_info TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expired_at TIMESTAMP WITHOUT TIME ZONE,
    paid_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dọn dẹp dữ liệu cũ an toàn
DO $$ 
DECLARE 
    tbl text;
    tbls text[] := ARRAY['refresh_tokens', 'payment_orders', 'transaction_splits', 'transactions', 'expense_splits', 'expenses', 'payments', 'group_members', 'groups', 'external_loans', 'savings_goals', 'budgets', 'categories', 'payees', 'tags', 'notifications', 'wallets', 'users'];
BEGIN 
    FOREACH tbl IN ARRAY tbls LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl);
        END IF;
    END LOOP;
END $$;\n\n`;

// Insert Users
sql += `-- ========================= USERS =========================\n`;
sql += `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES\n`;
sql += users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', '${u.bankBin}', '${u.bankAcc}', '2025-01-01 08:00:00')`).join(',\n') + ';\n\n';

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

// Groups with avatar_url
const groupTripId = uuid();
const groupDinnerId = uuid();

state.groups.push(`('${groupTripId}', 'Chuyến Du Lịch Đà Lạt 2026', 'Quỹ ăn chơi nhóm bạn thân', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', '${users[2].id}', '2026-01-10 09:00:00')`);
state.groups.push(`('${groupDinnerId}', 'Ăn Trưa Đồng Nghiệp IT', 'Nhóm chia tiền ăn trưa văn phòng', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80', '${users[2].id}', '2026-01-05 12:00:00')`);

users.forEach(u => {
    state.groupMembers.push(`('${uuid()}', '${groupTripId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-10 09:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${groupDinnerId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-05 12:00:00')`);
});

// Periodic group activities across months up to 20/08/2026
const groupActivityMonths = [
    { year: 2026, month: 2, day: 18, title: 'Ăn trưa đầu năm đồng nghiệp', amount: 750000 },
    { year: 2026, month: 4, day: 22, title: 'Buffet lẩu nướng nhóm IT', amount: 900000 },
    { year: 2026, month: 6, day: 15, title: 'Tổng kết dự án Quý 2', amount: 800000 },
    { year: 2026, month: 7, day: 20, title: 'Cà phê & bánh ngọt cuối tuần', amount: 450000 },
    { year: 2026, month: 8, day: 18, title: 'Ăn tối liên hoan dự án tháng 8', amount: 850000 }
];

groupActivityMonths.forEach(act => {
    const expId = uuid();
    const mStr = act.month.toString().padStart(2, '0');
    const dStr = act.day.toString().padStart(2, '0');
    const expDate = `${act.year}-${mStr}-${dStr} 19:30:00`;
    const perPerson = act.amount / users.length;

    state.expenses.push(`('${expId}', '${groupDinnerId}', '${users[2].id}', '${act.title}', ${act.amount}, 'Ăn uống', '${expDate}')`);

    users.forEach(mem => {
        const isPayer = mem.id === users[2].id;
        state.expenseSplits.push(`('${uuid()}', '${expId}', '${mem.id}', ${perPerson}, ${isPayer})`);

        if (!isPayer) {
            const payDay = Math.min(20, act.day + 1);
            const payDStr = payDay.toString().padStart(2, '0');
            const payDate = `${act.year}-${mStr}-${payDStr} 10:15:00`;
            state.payments.push(`('${uuid()}', '${groupDinnerId}', '${mem.id}', '${users[2].id}', ${perPerson}, 'COMPLETED', '${payDate}')`);
        }
    });
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

    const payeeMap = {};
    const pArr = [];
    defaultPayeeTemplates.forEach(p => {
        const pId = uuid();
        pArr.push(pId);
        payeeMap[p.name] = { id: pId, ...p };
        state.payees.push(`('${pId}', '${u.id}', '${p.name}', '${p.bankBin}', '${p.bankName}', '${p.bankAccount}', '${p.accountName}', '${p.phone}', '${createdAt}')`);
    });

    ['#an_uong', '#mua_sam', '#cong_viec', '#du_lich'].forEach(tag => {
        state.tags.push(`('${uuid()}', '${u.id}', '${tag}')`);
    });

    // External Loans
    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng Quân Đội (MBBank)', 15000000, 7.5, '${u.startYear}-01-15', '${u.startYear + 2}-01-15', 'Vay mua laptop trả góp', false, '${createdAt}', '${createdAt}')`);
    state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Trần Văn Hưng (Đồng nghiệp)', 3000000, 0.0, '${u.startYear}-03-10', '${u.startYear + 1}-03-10', 'Cho bạn mượn tiền đóng học', false, '${createdAt}', '${createdAt}')`);

    // Savings Goals
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Khẩn Cấp 3 Tháng Chi Tiêu', 15000000, ${u.sAmt1}, '2026-12-31', 'IN_PROGRESS', '${createdAt}', '${createdAt}')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Đổi Điện Thoại Mới', 10000000, ${u.sAmt2}, '2026-11-30', 'IN_PROGRESS', '${createdAt}', '${createdAt}')`);

    // Notifications
    state.notifs.push(`('${uuid()}', '${u.id}', 'Chào mừng bạn đến với ShareMoney! Hãy thiết lập ngân sách đầu tiên.', 'SYSTEM', true, '${createdAt}')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Ngân sách Ăn uống tháng 08/2026 của bạn đã chi tiêu đạt 107.5% hạn mức. Đề xuất tái cân bằng!', 'BUDGET_WARNING', false, '2026-08-14 10:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Giao dịch thanh toán PayOS thành công: 350.000 ₫ (Mã ĐH: POS17867291)', 'PAYMENT_SUCCESS', false, '2026-08-15 14:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Lời khuyên tài chính: Bạn đã hoàn thành 70% mục tiêu quỹ khẩn cấp ngày 20/08/2026.', 'SYSTEM', false, '2026-08-20 09:00:00')`);

    let netMainBalance = 0;

    u.years.forEach(year => {
        const startM = (year === 2025) ? 1 : 1;
        const endM = (year === 2026) ? 8 : 12;

        for (let m = startM; m <= endM; m++) {
            const mStr = m.toString().padStart(2, '0');
            const salaryDate = `${year}-${mStr}-05 08:30:00`;
            const bonusDate = `${year}-${mStr}-25 17:00:00`;

            // 1. Income: Salary (every month on day 5)
            state.txs.push(`('${uuid()}', '${wMain}', ${u.baseSalary}, 'INCOME', '${categoryMap['Tiền lương']}', NULL, '${pArr[4]}', '${salaryDate}', 'Nhận lương tháng ${mStr}/${year}', false, false, false, '${salaryDate}')`);
            netMainBalance += u.baseSalary;

            // 2. Income: Bonus (past months T3, T6; not T8 because day 25 > 20)
            if (m % 3 === 0 && (year < 2026 || m < 8)) {
                const bonusAmt = 1500000;
                state.txs.push(`('${uuid()}', '${wMain}', ${bonusAmt}, 'INCOME', '${categoryMap['Thưởng']}', NULL, '${pArr[4]}', '${bonusDate}', 'Thưởng chuyên cần Quý ${m/3}', false, false, false, '${bonusDate}')`);
                netMainBalance += bonusAmt;
            }

            // 3. Budgets for this month - STRICTLY ALL <= 2,000,000 VND
            const budgetIdMap = {};
            const bConfigs = [
                { name: 'Ăn uống', limit: 2000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                { name: 'Tiền nhà', limit: Math.min(2000000, u.rentAmt), due: 5, payee: payeeMap['Chủ nhà trọ Nguyễn Văn Bính'], type: 'BILL', mand: true },
                { name: 'Chi tiêu hàng ngày', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                { name: 'Phí giao lưu', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                { name: 'Quần áo', limit: 1000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                { name: 'Đi lại', limit: 800000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                { name: 'Tiền điện', limit: 750000, due: 15, payee: payeeMap['Công ty Điện lực EVN HCMC'], type: 'BILL', mand: true },
                { name: 'Phí liên lạc', limit: 200000, due: 20, payee: payeeMap['Tập đoàn Viễn thông Viettel'], type: 'BILL', mand: true }
            ];

            bConfigs.forEach(bc => {
                const bId = uuid();
                budgetIdMap[bc.name] = bId;
                const pObj = bc.payee;
                const pIdVal = pObj ? `'${pObj.id}'` : 'NULL';
                const binVal = pObj ? `'${pObj.bankBin}'` : 'NULL';
                const accVal = pObj ? `'${pObj.bankAccount}'` : 'NULL';
                const nameVal = pObj ? `'${pObj.accountName}'` : 'NULL';
                const dueVal = bc.due ? bc.due : 'NULL';
                state.budgets.push(`('${bId}', '${bc.name}', '${u.id}', '${categoryMap[bc.name]}', ${bc.limit}, ${m}, ${year}, '${bc.type}', true, ${dueVal}, ${bc.mand}, ${binVal}, ${accVal}, ${nameVal}, ${pIdVal}, '${year}-${mStr}-01 08:00:00')`);
            });

            // 4. Fixed Monthly Expenses (Rent, Elec, Telecom)
            if (year < 2026 || m <= 7) {
                // Past months (T1 -> T7/2026 & full 2025)
                const rentDate = `${year}-${mStr}-05 10:00:00`;
                state.txs.push(`('${uuid()}', '${wMain}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentDate}', 'Thanh toán tiền nhà tháng ${mStr}/${year}', false, false, false, '${rentDate}')`);
                netMainBalance -= u.rentAmt;

                const elecDate = `${year}-${mStr}-15 14:00:00`;
                const elecAmt = randomInt(350000, 650000);
                state.txs.push(`('${uuid()}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[1]}', '${elecDate}', 'Thanh toán tiền điện EVN T${mStr}', false, false, false, '${elecDate}')`);
                netMainBalance -= elecAmt;

                const phoneDate = `${year}-${mStr}-20 09:30:00`;
                const phoneAmt = 90000;
                state.txs.push(`('${uuid()}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', '${pArr[2]}', '${phoneDate}', 'Nạp tiền 4G Viettel tháng ${mStr}', false, false, false, '${phoneDate}')`);
                netMainBalance -= phoneAmt;

                // Rich Flexible Daily Expenses for past months (20-28 transactions/month)
                const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Y tế', 'Giáo dục', 'Đi lại'];
                const txCount = randomInt(20, 26);

                for (let i = 0; i < txCount; i++) {
                    const day = randomInt(1, 28);
                    const hour = randomInt(7, 21);
                    const minute = randomInt(0, 59);
                    const txDate = formatDate(year, m, day, hour, minute);

                    const catName = randomElement(expenseCategories);
                    const catId = categoryMap[catName];
                    const items = categoryItemsMap[catName] || [{ name: `Chi phí ${catName}`, min: 30000, max: 90000 }];
                    const chosenItem = randomElement(items);
                    const rawAmt = randomInt(chosenItem.min, chosenItem.max);
                    const amt = Math.round(rawAmt / 1000) * 1000;

                    const chosenPayee = randomElement(pArr);
                    const linkedBId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';

                    state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${catId}', ${linkedBId}, '${chosenPayee}', '${txDate}', '${chosenItem.name}', false, false, false, '${txDate}')`);
                    netMainBalance -= amt;
                }
            } else if (year === 2026 && m === 8) {
                // ══════════════════════════════════════════════════════════════════
                // CURRENT MONTH (AUGUST 2026) - RICH DATA UP TO 20/08/2026 FOR ALL USERS
                // ══════════════════════════════════════════════════════════════════

                // Rent (day 4 or 5 <= 20)
                const rentTxDate = `2026-08-04 10:00:00`;
                const actualRent = (u.id === users[0].id) ? 1850000 : u.rentAmt; // User A has 50k overspend for rebalance test
                state.txs.push(`('${uuid()}', '${wMain}', ${actualRent}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentTxDate}', 'Tiền phòng trọ và phụ phí quản lý T8', false, false, false, '${rentTxDate}')`);
                netMainBalance -= actualRent;

                // Electricity (day 10 <= 20)
                const elecDate = `2026-08-10 14:00:00`;
                const elecAmt = randomInt(420000, 620000);
                state.txs.push(`('${uuid()}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[1]}', '${elecDate}', 'Thanh toán tiền điện EVN T8', false, false, false, '${elecDate}')`);
                netMainBalance -= elecAmt;

                // Telecom (day 11 <= 20)
                const phoneDate = `2026-08-11 09:30:00`;
                const phoneAmt = 90000;
                state.txs.push(`('${uuid()}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', '${pArr[2]}', '${phoneDate}', 'Nạp gói cước 4G Viettel tháng 8', false, false, false, '${phoneDate}')`);
                netMainBalance -= phoneAmt;

                if (u.id === users[0].id) {
                    // USER A SPECIFIC REBALANCE SCENARIO (Strictly on days <= 20)
                    // Food: Overspent 150k
                    state.txs.push(`('${uuid()}', '${wMain}', 650000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[3]}', '2026-08-02 12:30:00', 'Đi siêu thị mua đồ ăn tuần 1', false, false, false, '2026-08-02 12:30:00')`);
                    state.txs.push(`('${uuid()}', '${wMain}', 1500000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[3]}', '2026-08-08 19:30:00', 'Tiệc buffet lẩu nướng sinh nhật', false, false, false, '2026-08-08 19:30:00')`);
                    netMainBalance -= 2150000;

                    // Clothes: 300k
                    state.txs.push(`('${uuid()}', '${wMain}', 300000, 'EXPENSE', '${categoryMap['Quần áo']}', '${budgetIdMap['Quần áo']}', '${pArr[5]}', '2026-08-03 15:00:00', 'Mua áo thun cotton Uniqlo', false, false, false, '2026-08-03 15:00:00')`);
                    netMainBalance -= 300000;

                    // Daily Goods: 1.48tr
                    state.txs.push(`('${uuid()}', '${wMain}', 1480000, 'EXPENSE', '${categoryMap['Chi tiêu hàng ngày']}', '${budgetIdMap['Chi tiêu hàng ngày']}', '${pArr[3]}', '2026-08-06 18:00:00', 'Mua đồ gia dụng và nhu yếu phẩm tháng 8', false, false, false, '2026-08-06 18:00:00')`);
                    netMainBalance -= 1480000;

                    // Social: 1.28tr
                    state.txs.push(`('${uuid()}', '${wMain}', 1280000, 'EXPENSE', '${categoryMap['Phí giao lưu']}', '${budgetIdMap['Phí giao lưu']}', '${pArr[1]}', '2026-08-07 14:00:00', 'Mừng tân gia đồng nghiệp phòng IT', false, false, false, '2026-08-07 14:00:00')`);
                    netMainBalance -= 1280000;

                    // Transport: 780k
                    state.txs.push(`('${uuid()}', '${wMain}', 780000, 'EXPENSE', '${categoryMap['Đi lại']}', '${budgetIdMap['Đi lại']}', '${pArr[0]}', '2026-08-09 08:00:00', 'Nạp thẻ giao thông & Grab đi làm đầu tháng', false, false, false, '2026-08-09 08:00:00')`);
                    netMainBalance -= 780000;

                    // Coffee today (20/08/2026)
                    state.txs.push(`('${uuid()}', '${wMain}', 35000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[3]}', '2026-08-20 08:15:00', 'Cà phê muối sáng ngày 20/08', false, false, false, '2026-08-20 08:15:00')`);
                    netMainBalance -= 35000;

                    // Payment Orders in August 2026 (<= 20/08)
                    const payosPendingRef = generateTxnRef(2026, 8, 15, 14, 45, 0, 'POS');
                    state.paymentOrders.push(`('${uuid()}', '${payosPendingRef}', '${u.id}', 'BUDGET', 350000, '${wMain}', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', NULL, NULL, 'PENDING', NULL, 'PAYOS_VIETQR', 'VIETQR_NAPAS247', NULL, NULL, 'Thanh toan PayOS ${payosPendingRef}', '2026-08-15 14:45:00', '2026-08-15 15:00:00', NULL)`);

                    const vnpPendingRef = generateTxnRef(2026, 8, 15, 13, 30, 0, 'SM');
                    state.paymentOrders.push(`('${uuid()}', '${vnpPendingRef}', '${u.id}', 'BUDGET', 75000, '${wMain}', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, NULL, 'Thanh toan ngan sach ${vnpPendingRef}', '2026-08-15 13:30:00', '2026-08-15 13:45:00', NULL)`);

                    const cancelledTxnRef = generateTxnRef(2026, 8, 13, 15, 10, 0, 'SM');
                    state.paymentOrders.push(`('${uuid()}', '${cancelledTxnRef}', '${u.id}', 'BUDGET', 200000, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'CANCELLED', NULL, 'NCB', 'ATM', NULL, '24', 'Thanh toan ngan sach ${cancelledTxnRef}', '2026-08-13 15:10:00', '2026-08-13 15:25:00', NULL)`);
                } else {
                    // USERS B, C, D, E: 12-16 REALISTIC TRANSACTIONS DISTRIBUTED ACROSS DAYS 1 TO 20 IN AUGUST 2026
                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Y tế', 'Giáo dục', 'Đi lại'];
                    const augTxCount = randomInt(12, 16);

                    for (let i = 0; i < augTxCount; i++) {
                        const day = randomInt(1, 20); // STRICTLY DAYS 1 TO 20
                        const hour = (day === 20) ? randomInt(7, 10) : randomInt(7, 21); // Today (Aug 20): only morning hours
                        const minute = randomInt(0, 59);
                        const txDate = formatDate(2026, 8, day, hour, minute);

                        const catName = randomElement(expenseCategories);
                        const catId = categoryMap[catName];
                        const items = categoryItemsMap[catName] || [{ name: `Chi phí ${catName}`, min: 30000, max: 90000 }];
                        const chosenItem = randomElement(items);
                        const rawAmt = randomInt(chosenItem.min, chosenItem.max);
                        const amt = Math.round(rawAmt / 1000) * 1000;

                        const chosenPayee = randomElement(pArr);
                        const linkedBId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';

                        state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${catId}', ${linkedBId}, '${chosenPayee}', '${txDate}', '${chosenItem.name}', false, false, false, '${txDate}')`);
                        netMainBalance -= amt;
                    }
                }
            }
        }
    });

    // Enforce wallet balances strictly <= 25,000,000 VND
    let calculatedMain = netMainBalance;
    if (calculatedMain > 15500000) calculatedMain = 15500000;
    if (calculatedMain < 4500000) calculatedMain = 4500000;

    const finalMainBalance = calculatedMain;
    const finalSavingsBalance = u.sAmt1 + u.sAmt2;
    const finalCreditBalance = -2500000;

    state.wallets.push(`('${wMain}', '${u.id}', 'Ví Điện Tử (MBBank)', ${finalMainBalance}, 'VND', false, '${createdAt}', '970422', '${u.bankAcc}', '${u.name.toUpperCase()}')`);
    state.wallets.push(`('${wSavings}', '${u.id}', 'Ví Tiết Kiệm (Vietcombank)', ${finalSavingsBalance}, 'VND', false, '${createdAt}', '970436', '0011004123456', '${u.name.toUpperCase()}')`);
    state.wallets.push(`('${wCredit}', '${u.id}', 'Thẻ Tín Dụng VPBank', ${finalCreditBalance}, 'VND', true, '${createdAt}', '970432', '5200888899991111', '${u.name.toUpperCase()}')`);
});

function append(header, arr) {
    if (arr.length === 0) return '';
    return header + arr.join(',\n') + ';\n\n';
}

sql += append('INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at, bank_bin, bank_account_no, bank_account_name) VALUES\n', state.wallets);
sql += append('INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n', state.categories);
sql += append('INSERT INTO payees (id, user_id, name, bank_bin, bank_name, bank_account, account_name, phone, created_at) VALUES\n', state.payees);
sql += append('INSERT INTO tags (id, user_id, name) VALUES\n', state.tags);
sql += append('INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled, created_at, updated_at) VALUES\n', state.loans);
sql += append('INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at, updated_at) VALUES\n', state.savings);
sql += append('INSERT INTO budgets (id, name, user_id, category_id, limit_amount, month, year, type, is_recurring, due_day_of_month, is_mandatory, payee_bank_bin, payee_bank_account, payee_account_name, payee_id, created_at) VALUES\n', state.budgets);
sql += append('INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES\n', state.notifs);
sql += append('INSERT INTO groups (id, name, description, avatar_url, owner_id, created_at) VALUES\n', state.groups);
sql += append('INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES\n', state.groupMembers);
sql += append('INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES\n', state.expenses);
sql += append('INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n', state.expenseSplits);
sql += append('INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES\n', state.payments);
sql += '-- ========================= TRANSACTIONS =========================\n';
sql += append('INSERT INTO transactions (id, wallet_id, amount, type, category_id, linked_budget_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated, created_at) VALUES\n', state.txs);
sql += '-- ========================= PAYMENT ORDERS (PAYOS / VNPAY) =========================\n';
sql += append('INSERT INTO payment_orders (id, txn_ref, user_id, type, amount, wallet_id, category_id, budget_id, group_id, creditor_id, status, vnp_transaction_no, vnp_bank_code, vnp_card_type, vnp_pay_date, vnp_response_code, vnp_order_info, created_at, expired_at, paid_at) VALUES\n', state.paymentOrders);

fs.writeFileSync('seed_v13.sql', sql, 'utf8');
console.log(`Successfully generated seed_v13.sql: ${state.txs.length} transactions, ${state.expenses.length} group expenses, ${state.budgets.length} budgets strictly bounded up to 20/08/2026!`);
