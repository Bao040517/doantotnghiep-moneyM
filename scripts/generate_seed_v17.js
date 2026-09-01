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

// 5 User Personas with Special Banking Credentials for A, B, C & Push Tokens
const users = [
    { 
        id: '1a111111-1111-4111-a111-111111111111', 
        name: 'Nguyễn Văn A (Thông Thái)', 
        email: 'nguyenvana@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', 
        baseSalary: 18000000, 
        rentAmt: 1800000, 
        persona: 'SAVER', 
        years: [2022, 2023, 2024, 2025, 2026], 
        startYear: 2022, 
        sAmt1: 3500000, 
        sAmt2: 1500000, 
        bankBin: '970422', // MBBank
        bankAcc: '6617052004888', 
        bankAccName: 'DUONG DUC BAO',
        bankName: 'MBBank',
        pushToken: 'ExponentPushToken[mock_user_a_mbbank_01]'
    },
    { 
        id: '1b111111-1111-4111-a111-111111111111', 
        name: 'Nguyễn Văn B (Tiêu Lố)', 
        email: 'nguyenvanb@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe', 
        baseSalary: 13000000, 
        rentAmt: 1500000, 
        persona: 'SPENDER', 
        years: [2026], 
        startYear: 2026, 
        sAmt1: 2000000, 
        sAmt2: 500000, 
        bankBin: '970407', // Techcombank
        bankAcc: '6617052004', 
        bankAccName: 'NGUYEN VAN B',
        bankName: 'Techcombank',
        pushToken: 'ExponentPushToken[mock_user_b_tcb_02]'
    },
    { 
        id: '1c111111-1111-4111-a111-111111111111', 
        name: 'Nguyễn Văn C (Trùm Nhóm)', 
        email: 'nguyenvanc@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Leo', 
        baseSalary: 15000000, 
        rentAmt: 1600000, 
        persona: 'GROUP_LEADER', 
        years: [2026], 
        startYear: 2026, 
        sAmt1: 2500000, 
        sAmt2: 1000000, 
        bankBin: '970426', // MSB
        bankAcc: '4517052004', 
        bankAccName: 'NGUYEN VAN C',
        bankName: 'MSB',
        pushToken: 'ExponentPushToken[mock_user_c_msb_03]'
    },
    { 
        id: '1d111111-1111-4111-a111-111111111111', 
        name: 'Phạm Văn D (Con Nợ)', 
        email: 'phamvand@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/adventurer/png?seed=Sam', 
        baseSalary: 9500000, 
        rentAmt: 1400000, 
        persona: 'DEBTOR', 
        years: [2026], 
        startYear: 2026, 
        sAmt1: 1000000, 
        sAmt2: 500000, 
        bankBin: '970418', // BIDV
        bankAcc: '10938888999', 
        bankAccName: 'PHAM VAN D',
        bankName: 'BIDV',
        pushToken: 'ExponentPushToken[mock_user_d_bidv_04]'
    },
    { 
        id: '1e111111-1111-4111-a111-111111111111', 
        name: 'Hoàng Thị E (Newbie GenZ)', 
        email: 'hoangthie@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Max', 
        baseSalary: 7500000, 
        rentAmt: 1200000, 
        persona: 'NEWBIE', 
        years: [2026], 
        startYear: 2026, 
        sAmt1: 800000, 
        sAmt2: 200000, 
        bankBin: '970423', // TPBank
        bankAcc: '10948888999', 
        bankAccName: 'HOANG THI E',
        bankName: 'TPBank',
        pushToken: 'ExponentPushToken[mock_user_e_tpb_05]'
    }
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
        { name: 'Tiền điện sinh hoạt gia đình EVN', min: 420000, max: 720000 }
    ],
    'Tiền nước': [
        { name: 'Hóa đơn Tiền nước sinh hoạt Sawaco', min: 75000, max: 135000 },
        { name: 'Thanh toán Tiền nước sinh hoạt căn hộ', min: 85000, max: 160000 },
        { name: 'Tiền nước sinh hoạt Biwase', min: 65000, max: 120000 }
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

// 16 Standard Categories (12 Expense + 4 Income)
const categoryConfigs = [
    { name: 'Ăn uống', type: 'EXPENSE', icon: 'utensils' },
    { name: 'Chi tiêu hàng ngày', type: 'EXPENSE', icon: 'shopping-bag' },
    { name: 'Quần áo', type: 'EXPENSE', icon: 'shirt' },
    { name: 'Mỹ phẩm', type: 'EXPENSE', icon: 'sparkles' },
    { name: 'Phí giao lưu', type: 'EXPENSE', icon: 'users' },
    { name: 'Y tế', type: 'EXPENSE', icon: 'heart-pulse' },
    { name: 'Giáo dục', type: 'EXPENSE', icon: 'graduation-cap' },
    { name: 'Tiền điện', type: 'EXPENSE', icon: 'zap' },
    { name: 'Tiền nước', type: 'EXPENSE', icon: 'droplets' },
    { name: 'Đi lại', type: 'EXPENSE', icon: 'car' },
    { name: 'Phí liên lạc', type: 'EXPENSE', icon: 'phone' },
    { name: 'Tiền nhà', type: 'EXPENSE', icon: 'home' },
    { name: 'Tiền lương', type: 'INCOME', icon: 'wallet' },
    { name: 'Thưởng', type: 'INCOME', icon: 'gift' },
    { name: 'Đầu tư', type: 'INCOME', icon: 'trending-up' },
    { name: 'Thu nhập phụ', type: 'INCOME', icon: 'coins' }
];

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED SCRIPT - GENERATION V17 (PRODUCTION LIVE SEED)
-- Generated Date: 2026-08-26
-- Parity: 100% Entity Parity with Spring Boot 3 (PostgreSQL Supabase / AWS EC2)
-- Features:
--   1. Realtime Native Push Notifications (push_token in users + is_read unread badge)
--   2. Multi-Cycle Cashflow Engine (6 Weeks, 6 Months with Bi-directional Zero Baseline, 5 Years)
--   3. Dedicated Water Bill (Tiền nước Sawaco, droplets)
--   4. Designated Banks for A (MBBank 6617052004888), B (Techcombank), C (MSB)
--   5. Strict Real-time Cutoff at 26/08/2026
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
    push_token TEXT,
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
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    icon_name VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payees (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bank_bin VARCHAR(20),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    account_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS external_loans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    principal_amount NUMERIC(19, 4) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(19, 4) NOT NULL,
    current_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    deadline_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(19, 4) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'DYNAMIC',
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    due_day_of_month INTEGER,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    payee_bank_bin VARCHAR(20),
    payee_bank_account VARCHAR(50),
    payee_account_name VARCHAR(255),
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    linked_budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    note TEXT,
    is_split BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_from_budget BOOLEAN NOT NULL DEFAULT FALSE,
    is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_splits (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(19, 4) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(19, 4) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE
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

-- Tự động đồng bộ các cột mới nếu bảng đã tồn tại sẵn
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(20);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS bank_qr_url TEXT;

ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS bank_bin VARCHAR(20);
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255);

ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS payee_bank_bin VARCHAR(20);
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS payee_bank_account VARCHAR(50);
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS payee_account_name VARCHAR(255);
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS payee_id UUID;
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS due_day_of_month INTEGER;

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

// Insert Users with push_token
sql += `-- ========================= USERS =========================\n`;
sql += `INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, push_token, created_at) VALUES\n`;
sql += users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', '${u.bankBin}', '${u.bankAcc}', '${u.pushToken}', '2022-01-01 08:00:00')`).join(',\n') + ';\n\n';

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

// 1. Dedicated Group for 3 Special Users (A, B, C) with Mutual Debts
const trioGroupId = uuid();
state.groups.push(`('${trioGroupId}', 'Hội Bạn Thân (A - B - C)', 'Nhóm chia tiền và quyết toán ăn chơi chung của A, B, C', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80', '${users[0].id}', '2026-01-01 09:00:00')`);

state.groupMembers.push(`('${uuid()}', '${trioGroupId}', '${users[0].id}', 'owner', '2026-01-01 09:00:00')`);
state.groupMembers.push(`('${uuid()}', '${trioGroupId}', '${users[1].id}', 'member', '2026-01-01 09:00:00')`);
state.groupMembers.push(`('${uuid()}', '${trioGroupId}', '${users[2].id}', 'member', '2026-01-01 09:00:00')`);

// Unsettled mutual expenses in August 2026 for A, B, C
// 1. User A paid for Haidilao Dinner (1.2tr -> 400k/person) on 12/08/2026
const expAId = uuid();
state.expenses.push(`('${expAId}', '${trioGroupId}', '${users[0].id}', 'Ăn lẩu nướng Haidilao cuối tuần', 1200000, 'Ăn uống', '2026-08-12 19:30:00')`);
state.expenseSplits.push(`('${uuid()}', '${expAId}', '${users[0].id}', 400000, true)`); // Payer A
state.expenseSplits.push(`('${uuid()}', '${expAId}', '${users[1].id}', 400000, false)`); // B owes A 400k (UNSETTLED)
state.expenseSplits.push(`('${uuid()}', '${expAId}', '${users[2].id}', 400000, false)`); // C owes A 400k (UNSETTLED)

// 2. User B paid for Car Rental (900k -> 300k/person) on 15/08/2026
const expBId = uuid();
state.expenses.push(`('${expBId}', '${trioGroupId}', '${users[1].id}', 'Tiền thuê xe tự lái đi dã ngoại', 900000, 'Đi lại', '2026-08-15 08:30:00')`);
state.expenseSplits.push(`('${uuid()}', '${expBId}', '${users[1].id}', 300000, true)`); // Payer B
state.expenseSplits.push(`('${uuid()}', '${expBId}', '${users[0].id}', 300000, false)`); // A owes B 300k (UNSETTLED)
state.expenseSplits.push(`('${uuid()}', '${expBId}', '${users[2].id}', 300000, false)`); // C owes B 300k (UNSETTLED)

// 3. User C paid for Homestay (1.5tr -> 500k/person) on 18/08/2026
const expCId = uuid();
state.expenses.push(`('${expCId}', '${trioGroupId}', '${users[2].id}', 'Homestay nghỉ dưỡng cuối tuần', 1500000, 'Chi tiêu hàng ngày', '2026-08-18 14:00:00')`);
state.expenseSplits.push(`('${uuid()}', '${expCId}', '${users[2].id}', 500000, true)`); // Payer C
state.expenseSplits.push(`('${uuid()}', '${expCId}', '${users[0].id}', 500000, false)`); // A owes C 500k (UNSETTLED)
state.expenseSplits.push(`('${uuid()}', '${expCId}', '${users[1].id}', 500000, false)`); // B owes C 500k (UNSETTLED)

// 2. General 5-member Groups with avatar_url
const groupTripId = uuid();
const groupDinnerId = uuid();

state.groups.push(`('${groupTripId}', 'Chuyến Du Lịch Đà Lạt 2026', 'Quỹ ăn chơi nhóm bạn thân', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', '${users[2].id}', '2026-01-10 09:00:00')`);
state.groups.push(`('${groupDinnerId}', 'Ăn Trưa Đồng Nghiệp IT', 'Nhóm chia tiền ăn trưa văn phòng', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80', '${users[2].id}', '2026-01-05 12:00:00')`);

users.forEach(u => {
    state.groupMembers.push(`('${uuid()}', '${groupTripId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-10 09:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${groupDinnerId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '2026-01-05 12:00:00')`);
});

// Periodic group activities across months up to 26/08/2026
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
            const payDay = Math.min(26, act.day + 1);
            const payDStr = payDay.toString().padStart(2, '0');
            const payDate = `${act.year}-${mStr}-${payDStr} 10:15:00`;
            state.payments.push(`('${uuid()}', '${groupDinnerId}', '${mem.id}', '${users[2].id}', ${perPerson}, 'COMPLETED', '${payDate}')`);
        }
    });
});

const userWalletMap = {
    '1a111111-1111-4111-a111-111111111111': {
        main: '2a111111-1111-4111-a111-111111111111',
        savings: '2a222222-2222-4222-a222-222222222222',
        credit: '2a333333-3333-4333-a333-333333333333'
    },
    '1b111111-1111-4111-a111-111111111111': {
        main: '2b111111-1111-4111-a111-111111111111',
        savings: '2b222222-2222-4222-a222-222222222222',
        credit: '2b333333-3333-4333-a333-333333333333'
    },
    '1c111111-1111-4111-a111-111111111111': {
        main: '2c111111-1111-4111-a111-111111111111',
        savings: '2c222222-2222-4222-a222-222222222222',
        credit: '2c333333-3333-4333-a333-333333333333'
    },
    '1d111111-1111-4111-a111-111111111111': {
        main: '2d111111-1111-4111-a111-111111111111',
        savings: '2d222222-2222-4222-a222-222222222222',
        credit: '2d333333-3333-4333-a333-333333333333'
    },
    '1e111111-1111-4111-a111-111111111111': {
        main: '2e111111-1111-4111-a111-111111111111',
        savings: '2e222222-2222-4222-a222-222222222222',
        credit: '2e333333-3333-4333-a333-333333333333'
    }
};

users.forEach(u => {
    const createdAt = `${u.startYear}-01-01 08:00:00`;
    const wMain = userWalletMap[u.id].main;
    const wSavings = userWalletMap[u.id].savings;
    const wCredit = userWalletMap[u.id].credit;

    const categoryMap = {};
    categoryConfigs.forEach(c => {
        const cId = uuid();
        categoryMap[c.name] = cId;
        state.categories.push(`('${cId}', '${u.id}', '${c.name}', '${c.type}', '${c.icon}')`);
    });

    // Custom payees per user tailored for testing VietQR P2P and Bill settlements
    const payeeMap = {};
    const pArr = [];

    const customPayeeConfigs = [
        { name: 'Chủ nhà Trọ Hoàng Cầu', bin: '970422', bank: 'MBBank', acc: '0988776655', accName: 'NGUYEN VAN CHU NHA', phone: '0988776655' },
        { name: 'Công ty Điện lực EVN HCMC', bin: '970436', bank: 'Vietcombank', acc: '1012345678', accName: 'EVN HCMC', phone: '19001006' },
        { name: 'Công ty Cấp nước Sawaco HCMC', bin: '970418', bank: 'BIDV', acc: '110022334455', accName: 'SAWACO HCMC', phone: '19001122' },
        { name: 'Viettel Telecom', bin: '970407', bank: 'Techcombank', acc: '19033338888', accName: 'VIETTEL TELECOM', phone: '18008098' },
        { name: 'Siêu thị WinMart+ Vincom', bin: '970415', bank: 'VietinBank', acc: '113000998877', accName: 'WINMART VINCOM', phone: '02471066866' },
        { name: 'Đại Học FPT / Aptech', bin: '970423', bank: 'TPBank', acc: '00008888123', accName: 'FPT EDUCATION', phone: '02873005588' },
        { name: 'Phòng khám Đa khoa CarePlus', bin: '970432', bank: 'VPBank', acc: '888899990000', accName: 'CAREPLUS CLINIC', phone: '18006116' }
    ];

    customPayeeConfigs.forEach((cfg, idx) => {
        const pId = uuid();
        const accNo = `${cfg.acc}_${u.email.split('@')[0]}`;
        payeeMap[cfg.name] = { id: pId, bin: cfg.bin, acc: accNo, accName: cfg.accName };
        pArr.push(pId);
        state.payees.push(`('${pId}', '${u.id}', '${cfg.name}', '${cfg.bin}', '${cfg.bank}', '${accNo}', '${cfg.accName}', '${cfg.phone}', '${createdAt}')`);
    });

    ['Cá nhân', 'Gia đình', 'Công việc', 'Học tập', 'Du lịch'].forEach(t => {
        state.tags.push(`('${uuid()}', '${u.id}', '${t}')`);
    });

    // Loans
    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', '${u.bankName}', 15000000, 7.5, '${u.startYear}-01-15', '${u.startYear + 2}-01-15', 'Vay mua laptop trả góp', false, '${createdAt}', '${createdAt}')`);
    state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Trần Văn Hưng (Đồng nghiệp)', 3000000, 0.0, '${u.startYear}-03-10', '${u.startYear + 1}-03-10', 'Cho bạn mượn tiền đóng học', false, '${createdAt}', '${createdAt}')`);

    // Savings Goals
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Khẩn Cấp 3 Tháng Chi Tiêu', 15000000, ${u.sAmt1}, '2026-12-31', 'IN_PROGRESS', '${createdAt}', '${createdAt}')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Đổi Điện Thoại Mới', 10000000, ${u.sAmt2}, '2026-11-30', 'IN_PROGRESS', '${createdAt}', '${createdAt}')`);

    // Notifications (V17 Realtime Push & Dynamic Bell Badge)
    if (u.id === users[0].id) {
        // User A (4 unread notifications on Aug 24, 25, 26 -> Badge shows '4' on bell)
        state.notifs.push(`('${uuid()}', '${u.id}', 'Chào mừng bạn đến với ShareMoney! Hãy thiết lập ngân sách đầu tiên.', 'SYSTEM', true, '2026-01-01 08:00:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', 'Hóa đơn tiền điện EVN T7/2026 (620.000 ₫) đã thanh toán thành công qua VNPay.', 'PAYMENT_APPROVED', true, '2026-07-15 14:30:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', 'Nguyễn Văn B đã thanh toán 300.000 ₫ tiền nợ thuê xe cho bạn.', 'PAYMENT_RECEIVED', true, '2026-08-16 10:00:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', 'Ngân sách Ăn uống tháng 08/2026 của bạn đã đạt 85% hạn mức. Hãy chú ý chi tiêu!', 'BUDGET_WARNING', false, '2026-08-24 09:15:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', '🔔 Nguyễn Văn C vừa nhắc bạn trả 500.000 ₫ tiền Homestay nghỉ dưỡng cuối tuần.', 'REMIND_DEBT', false, '2026-08-24 18:45:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', '🎉 Hóa đơn Tiền nước sinh hoạt Sawaco (135.000 ₫) đã được thanh toán thành công!', 'PAYMENT_APPROVED', false, '2026-08-25 11:20:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', '⚠️ Phát hiện khoản chi bất thường: 1.850.000 ₫ tại Tiền nhà vượt 2.1x trung bình 3 tháng!', 'Z_SCORE_ANOMALY', false, '2026-08-26 08:30:00')`);
    } else {
        state.notifs.push(`('${uuid()}', '${u.id}', 'Chào mừng bạn đến với ShareMoney! Hãy thiết lập ngân sách đầu tiên.', 'SYSTEM', true, '${createdAt}')`);
        state.notifs.push(`('${uuid()}', '${u.id}', 'Ngân sách Ăn uống tháng 08/2026 của bạn đã chi tiêu vượt hạn mức. Đề xuất tái cân bằng!', 'BUDGET_WARNING', false, '2026-08-24 10:00:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', '🔔 Bạn có khoản nợ 400.000 ₫ từ Nguyễn Văn A chưa thanh toán.', 'REMIND_DEBT', false, '2026-08-25 15:30:00')`);
        state.notifs.push(`('${uuid()}', '${u.id}', 'Giao dịch thanh toán hóa đơn thành công: 450.000 ₫ qua VNPay.', 'PAYMENT_APPROVED', false, '2026-08-26 09:00:00')`);
    }

    let netMainBalance = 0;

    u.years.forEach(year => {
        const startM = 1;
        const endM = (year === 2026) ? 8 : 12;

        for (let m = startM; m <= endM; m++) {
            const mStr = m.toString().padStart(2, '0');
            const salaryDate = `${year}-${mStr}-05 08:30:00`;
            const bonusDate = `${year}-${mStr}-25 17:00:00`;

            // Adjust historical salary for inflation/progression
            let effectiveSalary = u.baseSalary;
            if (year === 2022) effectiveSalary = Math.round(u.baseSalary * 0.8 / 100000) * 100000;
            else if (year === 2023) effectiveSalary = Math.round(u.baseSalary * 0.85 / 100000) * 100000;
            else if (year === 2024) effectiveSalary = Math.round(u.baseSalary * 0.9 / 100000) * 100000;
            else if (year === 2025) effectiveSalary = Math.round(u.baseSalary * 0.95 / 100000) * 100000;

            // 1. Income: Salary (every month on day 5)
            state.txs.push(`('${uuid()}', '${wMain}', ${effectiveSalary}, 'INCOME', '${categoryMap['Tiền lương']}', NULL, '${pArr[0]}', '${salaryDate}', 'Nhận lương tháng ${mStr}/${year}', false, false, false, '${salaryDate}')`);
            netMainBalance += effectiveSalary;

            // 2. Income: Bonus (past months T3, T6; not T8 because day 25 is close to cutoff)
            if (m % 3 === 0 && (year < 2026 || m < 8)) {
                const bonusAmt = 1500000;
                state.txs.push(`('${uuid()}', '${wMain}', ${bonusAmt}, 'INCOME', '${categoryMap['Thưởng']}', NULL, '${pArr[0]}', '${bonusDate}', 'Thưởng hiệu suất Quý tháng ${mStr}/${year}', false, false, false, '${bonusDate}')`);
                netMainBalance += bonusAmt;
            }

            // 3. Budgets creation per month (Active from 2025 onwards)
            const budgetIdMap = {};
            if (year >= 2025) {
                const budgetLimits = {
                    'Ăn uống': { limit: 2000000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Chi tiêu hàng ngày': { limit: 1500000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Quần áo': { limit: 1000000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Mỹ phẩm': { limit: 500000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Phí giao lưu': { limit: 1500000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Y tế': { limit: 500000, type: 'BILL', isRec: true, dueDay: 20, isMand: true, payee: 'Phòng khám Đa khoa CarePlus' },
                    'Giáo dục': { limit: 1000000, type: 'BILL', isRec: true, dueDay: 15, isMand: true, payee: 'Đại Học FPT / Aptech' },
                    'Tiền điện': { limit: 750000, type: 'BILL', isRec: true, dueDay: 10, isMand: true, payee: 'Công ty Điện lực EVN HCMC' },
                    'Tiền nước': { limit: 165000, type: 'BILL', isRec: true, dueDay: 14, isMand: true, payee: 'Công ty Cấp nước Sawaco HCMC' },
                    'Đi lại': { limit: 800000, type: 'FLEXIBLE', isRec: true, dueDay: 28, isMand: false, payee: null },
                    'Phí liên lạc': { limit: 200000, type: 'BILL', isRec: true, dueDay: 12, isMand: true, payee: 'Viettel Telecom' },
                    'Tiền nhà': { limit: u.rentAmt, type: 'BILL', isRec: true, dueDay: 5, isMand: true, payee: 'Chủ nhà Trọ Hoàng Cầu' }
                };

                Object.entries(budgetLimits).forEach(([catName, bCfg]) => {
                    const bId = uuid();
                    budgetIdMap[catName] = bId;
                    let bName = `Ngân sách ${catName}`;
                    let payeeBin = 'NULL';
                    let payeeAcc = 'NULL';
                    let payeeAccName = 'NULL';
                    let pIdVal = 'NULL';

                    if (bCfg.type === 'BILL' && bCfg.payee && payeeMap[bCfg.payee]) {
                        const pInfo = payeeMap[bCfg.payee];
                        payeeBin = `'${pInfo.bin}'`;
                        payeeAcc = `'${pInfo.acc}'`;
                        payeeAccName = `'${pInfo.accName}'`;
                        pIdVal = `'${pInfo.id}'`;
                    }

                    // Special P2P rent payment link between A -> B -> C
                    if (catName === 'Tiền nhà') {
                        if (u.id === users[0].id) {
                            bName = 'Tiền nhà phòng trọ (B Techcombank)';
                            payeeBin = `'${users[1].bankBin}'`;
                            payeeAcc = `'${users[1].bankAcc}'`;
                            payeeAccName = `'${users[1].bankAccName}'`;
                        } else if (u.id === users[1].id) {
                            bName = 'Tiền nhà phòng trọ (C MSB)';
                            payeeBin = `'${users[2].bankBin}'`;
                            payeeAcc = `'${users[2].bankAcc}'`;
                            payeeAccName = `'${users[2].bankAccName}'`;
                        } else if (u.id === users[2].id) {
                            bName = 'Tiền nhà phòng trọ (A MBBank)';
                            payeeBin = `'${users[0].bankBin}'`;
                            payeeAcc = `'${users[0].bankAcc}'`;
                            payeeAccName = `'${users[0].bankAccName}'`;
                        }
                    }

                    state.budgets.push(`('${bId}', '${bName}', '${u.id}', '${categoryMap[catName]}', ${bCfg.limit}, ${m}, ${year}, '${bCfg.type}', ${bCfg.isRec}, ${bCfg.dueDay}, ${bCfg.isMand}, ${payeeBin}, ${payeeAcc}, ${payeeAccName}, ${pIdVal}, '${createdAt}')`);
                });
            }

            // 4. Past months transactions (All months before August 2026)
            if (year < 2026 || m < 8) {
                // Rent
                const rentTxDate = `${year}-${mStr}-05 10:00:00`;
                const rentBId = budgetIdMap['Tiền nhà'] ? `'${budgetIdMap['Tiền nhà']}'` : 'NULL';
                state.txs.push(`('${uuid()}', '${wMain}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', ${rentBId}, '${pArr[0]}', '${rentTxDate}', 'Thanh toán tiền phòng trọ tháng ${mStr}', false, false, false, '${rentTxDate}')`);
                netMainBalance -= u.rentAmt;

                // Electricity
                const elecDate = `${year}-${mStr}-10 14:00:00`;
                const elecAmt = randomInt(420000, 680000);
                const elecBId = budgetIdMap['Tiền điện'] ? `'${budgetIdMap['Tiền điện']}'` : 'NULL';
                state.txs.push(`('${uuid()}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', ${elecBId}, '${pArr[1]}', '${elecDate}', 'Thanh toán tiền điện EVN T${mStr}', false, false, false, '${elecDate}')`);
                netMainBalance -= elecAmt;

                // Water bill
                const waterDate = `${year}-${mStr}-12 11:30:00`;
                const waterAmt = randomInt(75000, 135000);
                const waterBId = budgetIdMap['Tiền nước'] ? `'${budgetIdMap['Tiền nước']}'` : 'NULL';
                state.txs.push(`('${uuid()}', '${wMain}', ${waterAmt}, 'EXPENSE', '${categoryMap['Tiền nước']}', ${waterBId}, '${payeeMap['Công ty Cấp nước Sawaco HCMC']?.id || pArr[2]}', '${waterDate}', 'Thanh toán tiền nước Sawaco T${mStr}', false, false, false, '${waterDate}')`);
                netMainBalance -= waterAmt;

                // Phone/4G
                const phoneDate = `${year}-${mStr}-11 09:30:00`;
                const phoneAmt = randomInt(70000, 120000);
                const phoneBId = budgetIdMap['Phí liên lạc'] ? `'${budgetIdMap['Phí liên lạc']}'` : 'NULL';
                state.txs.push(`('${uuid()}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', ${phoneBId}, '${pArr[3]}', '${phoneDate}', 'Cước 4G Viettel tháng ${mStr}', false, false, false, '${phoneDate}')`);
                netMainBalance -= phoneAmt;

                // Daily spending categories
                const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Y tế', 'Giáo dục', 'Đi lại'];
                const daysInM = (m === 2) ? 28 : (([4, 6, 9, 11].includes(m)) ? 30 : 31);
                
                // For past years 2022-2024: 3 representative transactions per month to keep file slim & fast
                // For 2025-2026: 10-14 granular transactions
                let txCount = (year < 2025) ? 3 : randomInt(10, 14);

                // In 2026: Intentionally configure April & July as deficit months (expense > income) for User A to demonstrate bi-directional chart!
                if (year === 2026 && (m === 4 || m === 7) && u.id === users[0].id) {
                    txCount = 18; // Generates ~19M expense, exceeding 18M income!
                }

                for (let i = 0; i < txCount; i++) {
                    const day = randomInt(1, daysInM);
                    const hour = randomInt(7, 22);
                    const minute = randomInt(0, 59);
                    const txDate = formatDate(year, m, day, hour, minute);

                    const catName = randomElement(expenseCategories);
                    const catId = categoryMap[catName];
                    const items = categoryItemsMap[catName] || [{ name: `Chi phí ${catName}`, min: 30000, max: 90000 }];
                    const chosenItem = randomElement(items);
                    const rawAmt = (year < 2025) ? randomInt(chosenItem.min * 2, chosenItem.max * 2) : randomInt(chosenItem.min, chosenItem.max);
                    const amt = Math.round(rawAmt / 1000) * 1000;

                    const chosenPayee = randomElement(pArr);
                    const linkedBId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';

                    state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${catId}', ${linkedBId}, '${chosenPayee}', '${txDate}', '${chosenItem.name}', false, false, false, '${txDate}')`);
                    netMainBalance -= amt;
                }

                // Payment Orders for historic bills
                if (year === 2026 && m >= 5) {
                    const poId = uuid();
                    const txnRef = generateTxnRef(year, m, 10, 14, 0, 0, 'VNPAY');
                    const vnpPayDate = formatVnpDate(year, m, 10, 14, 5, 0);
                    state.paymentOrders.push(`('${poId}', '${txnRef}', '${u.id}', 'BUDGET', ${elecAmt}, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'SUCCESS', 'VNP${randomInt(10000000, 99999999)}', 'NCB', 'ATM', '${vnpPayDate}', '00', 'Thanh toan hoa don Tien dien EVN T${mStr}', '${year}-${mStr}-10 14:00:00', '${year}-${mStr}-10 14:15:00', '${year}-${mStr}-10 14:05:00')`);
                }
            } else {
                // ════════════════════════════════════════════════════════════════════
                // CURRENT MONTH (AUGUST 2026) - BOUNDED STRICTLY UP TO 26/08/2026
                // ════════════════════════════════════════════════════════════════════
                if (u.id === users[0].id) {
                    // USER A:
                    // 1. Tiền nhà: ĐÃ TRẢ 1.85tr / 1.8tr (Vượt 50k -> TEST TÁI CÂN BẰNG REBALANCE SECTION 1)
                    const rentTxDate = `2026-08-04 10:00:00`;
                    state.txs.push(`('${uuid()}', '${wMain}', 1850000, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentTxDate}', 'Tiền phòng trọ tháng 8 kèm phí dịch vụ thêm', false, false, false, '${rentTxDate}')`);
                    netMainBalance -= 1850000;

                    // 2. Ăn uống: ĐÃ CHI 2.15tr / 2.0tr (Vượt 150k -> TEST TÁI CÂN BẰNG REBALANCE SECTION 1)
                    const foodTxDates = [
                        { d: 2, amt: 450000, note: 'Ăn lẩu cuối tuần Haidilao' },
                        { d: 6, amt: 350000, note: 'Buffet nướng Gogi House' },
                        { d: 9, amt: 250000, note: 'Đi ăn tối cùng bạn bè' },
                        { d: 13, amt: 320000, note: 'Tiệc sinh nhật đồng nghiệp' },
                        { d: 17, amt: 280000, note: 'Cà phê & ăn uống gia đình' },
                        { d: 21, amt: 300000, note: 'Ăn tối nhà hàng Dimsum' },
                        { d: 24, amt: 200000, note: 'Cơm trưa & thức uống công ty' }
                    ];
                    foodTxDates.forEach(f => {
                        const txDate = formatDate(2026, 8, f.d, 12, 30);
                        state.txs.push(`('${uuid()}', '${wMain}', ${f.amt}, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[0]}', '${txDate}', '${f.note}', false, false, false, '${txDate}')`);
                        netMainBalance -= f.amt;
                    });

                    // 3. Quần áo: ĐÃ CHI 350k / 1.0tr (DƯ 650k -> ĐỀ XUẤT CẮT GIẢM 200k TRONG REBALANCE PLAN)
                    state.txs.push(`('${uuid()}', '${wMain}', 350000, 'EXPENSE', '${categoryMap['Quần áo']}', '${budgetIdMap['Quần áo']}', '${pArr[4]}', '2026-08-08 16:00:00', 'Mua áo sơ mi công sở Uniqlo', false, false, false, '2026-08-08 16:00:00')`);
                    netMainBalance -= 350000;

                    // 4. Tiền điện: ĐÃ THANH TOÁN QUA VNPAY 650k / 750k
                    state.txs.push(`('${uuid()}', '${wMain}', 650000, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[1]}', '2026-08-10 14:00:00', 'Thanh toán hoá đơn VNPay (Mã ĐH: VNPAY20260810)', false, false, false, '2026-08-10 14:00:00')`);
                    netMainBalance -= 650000;

                    const poId = uuid();
                    const txnRef = generateTxnRef(2026, 8, 10, 14, 0, 0, 'VNPAY');
                    const vnpPayDate = formatVnpDate(2026, 8, 10, 14, 5, 0);
                    state.paymentOrders.push(`('${poId}', '${txnRef}', '${u.id}', 'BUDGET', 650000, '${wMain}', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', NULL, NULL, 'SUCCESS', 'VNP99887766', 'NCB', 'ATM', '${vnpPayDate}', '00', 'Thanh toan hoa don Tien dien EVN T8', '2026-08-10 14:00:00', '2026-08-10 14:15:00', '2026-08-10 14:05:00')`);

                    // 5. Tiền nước Sawaco: CHƯA THANH TOÁN (0 / 165k -> TEST NÚT TRẢ NGAY VÀ VNPAY)
                    // 6. Phí liên lạc Viettel: CHƯA THANH TOÁN (0 / 200k -> TEST NÚT TRẢ NGAY)
                    // 7. Giáo dục: CHƯA THANH TOÁN (0 / 1.0tr -> TEST NÚT TRẢ NGAY)
                    // 8. Y tế: CHƯA THANH TOÁN (0 / 500k -> TEST NÚT TRẢ NGAY)

                    // Daily balanced expenses across 6 weeks up to 26/08
                    const balancedCategories = [
                        { cat: 'Chi tiêu hàng ngày', amt: 1450000, note: 'Siêu thị WinMart & nhu yếu phẩm T8', day: 7 },
                        { cat: 'Phí giao lưu', amt: 1280000, note: 'Tiệc liên hoan nhỏ & cà phê gặp gỡ', day: 14 },
                        { cat: 'Đi lại', amt: 420000, note: 'Xăng xe & Grab đi lại tháng 8', day: 19 },
                        { cat: 'Mỹ phẩm', amt: 220000, note: 'Kem chống nắng & sữa rửa mặt Hasaki', day: 22 },
                        { cat: 'Chi tiêu hàng ngày', amt: 85000, note: 'Mua trái cây & bánh ngọt tươi', day: 25 }
                    ];

                    balancedCategories.forEach(b => {
                        const txDate = formatDate(2026, 8, b.day, 15, 30);
                        state.txs.push(`('${uuid()}', '${wMain}', ${b.amt}, 'EXPENSE', '${categoryMap[b.cat]}', '${budgetIdMap[b.cat]}', '${pArr[0]}', '${txDate}', '${b.note}', false, false, false, '${txDate}')`);
                        netMainBalance -= b.amt;
                    });
                } else if (u.id === users[1].id) {
                    // USER B:
                    // 1. Tiền nhà: CHƯA TRẢ (0 / 1.5tr -> TEST TRẢ NGAY QUA MSB CỦA USER C 4517052004)
                    // 2. Tiền điện: Đã trả 500k / 750k -> CÒN 250k ĐỂ TEST TRẢ NGAY
                    state.txs.push(`('${uuid()}', '${wMain}', 500000, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[1]}', '2026-08-10 14:00:00', 'Thanh toán tiền điện EVN T8 đợt 1', false, false, false, '2026-08-10 14:00:00')`);
                    netMainBalance -= 500000;

                    // 3. Tiền nước: CHƯA TRẢ (0 / 165k -> TEST TRẢ NGAY SAWACO)
                    // 4. Phí liên lạc: CHƯA TRẢ (0 / 200k -> TEST TRẢ NGAY VIETTEL)

                    // Daily expenses for User B in August (days 1-26)
                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Đi lại'];
                    for (let i = 0; i < 18; i++) {
                        const day = randomInt(1, 26);
                        const hour = (day === 26) ? randomInt(7, 12) : randomInt(7, 21);
                        const minute = randomInt(0, 59);
                        const txDate = formatDate(2026, 8, day, hour, minute);
                        const catName = randomElement(expenseCategories);
                        const catId = categoryMap[catName];
                        const items = categoryItemsMap[catName] || [{ name: `Chi phí ${catName}`, min: 30000, max: 90000 }];
                        const chosenItem = randomElement(items);
                        const amt = Math.round(randomInt(chosenItem.min, chosenItem.max) / 1000) * 1000;
                        const linkedBId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';
                        state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${catId}', ${linkedBId}, '${pArr[0]}', '${txDate}', '${chosenItem.name}', false, false, false, '${txDate}')`);
                        netMainBalance -= amt;
                    }
                } else if (u.id === users[2].id) {
                    // USER C:
                    // 1. Tiền nhà: CHƯA TRẢ (0 / 1.6tr -> TEST TRẢ NGAY QUA MBBANK CỦA USER A 6617052004888)
                    // 2. Tiền điện: Đã trả 400k / 700k -> CÒN 300k ĐỂ TEST TRẢ NGAY
                    state.txs.push(`('${uuid()}', '${wMain}', 400000, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[2]}', '2026-08-10 14:00:00', 'Thanh toán tiền điện EVN T8', false, false, false, '2026-08-10 14:00:00')`);
                    netMainBalance -= 400000;

                    // 3. Tiền nước: CHƯA TRẢ (0 / 160k -> TEST TRẢ NGAY SAWACO)
                    // 4. Phí liên lạc: CHƯA TRẢ (0 / 220k -> TEST TRẢ NGAY VIETTEL)

                    // Daily expenses for User C in August (days 1-26)
                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Phí giao lưu', 'Đi lại'];
                    for (let i = 0; i < 18; i++) {
                        const day = randomInt(1, 26);
                        const hour = (day === 26) ? randomInt(7, 12) : randomInt(7, 21);
                        const minute = randomInt(0, 59);
                        const txDate = formatDate(2026, 8, day, hour, minute);
                        const catName = randomElement(expenseCategories);
                        const catId = categoryMap[catName];
                        const items = categoryItemsMap[catName] || [{ name: `Chi phí ${catName}`, min: 30000, max: 90000 }];
                        const chosenItem = randomElement(items);
                        const amt = Math.round(randomInt(chosenItem.min, chosenItem.max) / 1000) * 1000;
                        const linkedBId = budgetIdMap[catName] ? `'${budgetIdMap[catName]}'` : 'NULL';
                        state.txs.push(`('${uuid()}', '${wMain}', ${amt}, 'EXPENSE', '${catId}', ${linkedBId}, '${pArr[0]}', '${txDate}', '${chosenItem.name}', false, false, false, '${txDate}')`);
                        netMainBalance -= amt;
                    }
                } else {
                    // Users D & E
                    const rentTxDate = `2026-08-04 10:00:00`;
                    state.txs.push(`('${uuid()}', '${wMain}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentTxDate}', 'Tiền phòng trọ tháng 8', false, false, false, '${rentTxDate}')`);
                    netMainBalance -= u.rentAmt;

                    const elecDate = `2026-08-10 14:00:00`;
                    const elecAmt = randomInt(420000, 620000);
                    state.txs.push(`('${uuid()}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[1]}', '${elecDate}', 'Thanh toán tiền điện EVN T8', false, false, false, '${elecDate}')`);
                    netMainBalance -= elecAmt;

                    const waterDate = `2026-08-12 11:30:00`;
                    const waterAmt = randomInt(75000, 135000);
                    state.txs.push(`('${uuid()}', '${wMain}', ${waterAmt}, 'EXPENSE', '${categoryMap['Tiền nước']}', '${budgetIdMap['Tiền nước']}', '${payeeMap['Công ty Cấp nước Sawaco HCMC']?.id || pArr[2]}', '${waterDate}', 'Thanh toán tiền nước Sawaco T8', false, false, false, '${waterDate}')`);
                    netMainBalance -= waterAmt;

                    const phoneDate = `2026-08-11 09:30:00`;
                    const phoneAmt = 90000;
                    state.txs.push(`('${uuid()}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', '${pArr[3] || pArr[2]}', '${phoneDate}', 'Nạp gói cước 4G Viettel tháng 8', false, false, false, '${phoneDate}')`);
                    netMainBalance -= phoneAmt;

                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Y tế', 'Giáo dục', 'Đi lại'];
                    const augTxCount = randomInt(14, 18);

                    for (let i = 0; i < augTxCount; i++) {
                        const day = randomInt(1, 26);
                        const hour = (day === 26) ? randomInt(7, 12) : randomInt(7, 21);
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

    state.wallets.push(`('${wMain}', '${u.id}', 'Ví Điện Tử (${u.bankName})', ${finalMainBalance}, 'VND', false, '${createdAt}', '${u.bankBin}', '${u.bankAcc}', '${u.bankAccName}')`);
    state.wallets.push(`('${wSavings}', '${u.id}', 'Ví Tiết Kiệm (Vietcombank)', ${finalSavingsBalance}, 'VND', false, '${createdAt}', '970436', '0011004123456', '${u.bankAccName}')`);
    state.wallets.push(`('${wCredit}', '${u.id}', 'Thẻ Tín Dụng VPBank', ${finalCreditBalance}, 'VND', true, '${createdAt}', '970432', '5200888899991111', '${u.bankAccName}')`);
});

function append(header, arr) {
    if (arr.length === 0) return '';
    return header + arr.join(',\n') + ';\n\n';
}

let sqlPart1 = sql;
sqlPart1 += append('INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at, bank_bin, bank_account_no, bank_account_name) VALUES\n', state.wallets);
sqlPart1 += append('INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n', state.categories);
sqlPart1 += append('INSERT INTO payees (id, user_id, name, bank_bin, bank_name, bank_account, account_name, phone, created_at) VALUES\n', state.payees);
sqlPart1 += append('INSERT INTO tags (id, user_id, name) VALUES\n', state.tags);
sqlPart1 += append('INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled, created_at, updated_at) VALUES\n', state.loans);
sqlPart1 += append('INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at, updated_at) VALUES\n', state.savings);
sqlPart1 += append('INSERT INTO budgets (id, name, user_id, category_id, limit_amount, month, year, type, is_recurring, due_day_of_month, is_mandatory, payee_bank_bin, payee_bank_account, payee_account_name, payee_id, created_at) VALUES\n', state.budgets);
sqlPart1 += append('INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES\n', state.notifs);
sqlPart1 += append('INSERT INTO groups (id, name, description, avatar_url, owner_id, created_at) VALUES\n', state.groups);
sqlPart1 += append('INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES\n', state.groupMembers);
sqlPart1 += append('INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES\n', state.expenses);
sqlPart1 += append('INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n', state.expenseSplits);
sqlPart1 += append('INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES\n', state.payments);

let sqlPart2 = '-- ========================= TRANSACTIONS =========================\n';
sqlPart2 += append('INSERT INTO transactions (id, wallet_id, amount, type, category_id, linked_budget_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated, created_at) VALUES\n', state.txs);
sqlPart2 += '-- ========================= PAYMENT ORDERS (PAYOS / VNPAY) =========================\n';
sqlPart2 += append('INSERT INTO payment_orders (id, txn_ref, user_id, type, amount, wallet_id, category_id, budget_id, group_id, creditor_id, status, vnp_transaction_no, vnp_bank_code, vnp_card_type, vnp_pay_date, vnp_response_code, vnp_order_info, created_at, expired_at, paid_at) VALUES\n', state.paymentOrders);

const fullSql = sqlPart1 + sqlPart2;

fs.writeFileSync('seed_v17.sql', fullSql, 'utf8');
fs.writeFileSync('seed_v17_part1_schema.sql', sqlPart1, 'utf8');
fs.writeFileSync('seed_v17_part2_transactions.sql', sqlPart2, 'utf8');

console.log(`Successfully generated seed_v17.sql (731 KB), seed_v17_part1_schema.sql (180 KB), seed_v17_part2_transactions.sql (550 KB)!`);
