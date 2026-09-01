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

// 5 User Personas with Special Banking Credentials for A, B, C
const users = [
    { 
        id: '1a111111-1111-4111-a111-111111111111', 
        name: 'Nguyễn Văn A (Thông Thái)', 
        email: 'nguyenvana@gmail.com', 
        avatar: 'https://api.dicebear.com/7.x/bottts/png?seed=Felix', 
        baseSalary: 18000000, 
        rentAmt: 1800000, 
        persona: 'SAVER', 
        years: [2025, 2026], 
        startYear: 2025, 
        sAmt1: 3500000, 
        sAmt2: 1500000, 
        bankBin: '970422', // MBBank
        bankAcc: '6617052004888', 
        bankAccName: 'DUONG DUC BAO',
        bankName: 'MBBank'
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
        bankName: 'Techcombank'
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
        bankName: 'MSB'
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
        bankName: 'BIDV'
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
        bankName: 'TPBank'
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
-- SHAREMONEY DATABASE SEED SCRIPT - VERSION 16 (SEED_V16.SQL)
-- Dữ liệu 20 tháng (01/2025 -> 20/08/2026), Mốc thời gian thực tế cắt tại 20/08/2026
-- ĐẶC BIỆT THẾ HỆ V16:
--   1. Chuẩn hóa toàn bộ hệ thống danh mục có đầy đủ "Tiền nước" (droplets, 🚿)
--   2. Cung cấp Payee Cấp nước Sawaco HCMC và ngân sách BILL Tiền nước riêng biệt
--   3. 3 User Đặc Biệt:
--      - nguyenvana@gmail.com -> MBBank (970422) - STK: 6617052004888 - DUONG DUC BAO
--      - nguyenvanb@gmail.com -> Techcombank (970407) - STK: 6617052004 - NGUYEN VAN B
--      - nguyenvanc@gmail.com -> MSB (970426) - STK: 4517052004 - NGUYEN VAN C
--   4. Đầy đủ ngân sách BILL (Tiền nhà, Tiền điện, Tiền nước, Internet 4G, Học phí, Bảo hiểm)
--      kèm thông tin STK thụ hưởng phục vụ test trọn vẹn luồng Trả ngay VietQR P2P & PayOS
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

    // Custom payees per user tailored for testing VietQR P2P and Bill settlements
    // Strictly UNIQUE bank_account per user_id
    const userPayeeList = [];
    if (u.id === users[0].id) {
        // User A's Payees (Include User B Techcombank, User C MSB, EVN, Sawaco Water, Viettel, FPT, Bảo Việt)
        userPayeeList.push(
            { name: 'Nguyễn Văn B (Chủ nhà / Bạn thân)', bankBin: '970407', bankName: 'Techcombank', bankAccount: '6617052004', accountName: 'NGUYEN VAN B', phone: '0901234567' },
            { name: 'Nguyễn Văn C (Trưởng nhóm)', bankBin: '970426', bankName: 'MSB', bankAccount: '4517052004', accountName: 'NGUYEN VAN C', phone: '0902234567' },
            { name: 'Công ty Điện lực EVN HCMC', bankBin: '970436', bankName: 'VCB', bankAccount: '1012345678', accountName: 'EVN HCMC', phone: '1900545454' },
            { name: 'Công ty Cấp nước Sawaco HCMC', bankBin: '970418', bankName: 'BIDV', bankAccount: '110022334455', accountName: 'SAWACO HCMC', phone: '19001589' },
            { name: 'Tập đoàn Viễn thông Viettel', bankBin: '970407', bankName: 'Techcombank', bankAccount: '19033338888', accountName: 'VIETTEL TELECOM', phone: '18008098' },
            { name: 'Trường Đại Học FPT (Học phí)', bankBin: '970423', bankName: 'TPBank', bankAccount: '00001928374', accountName: 'DAI HOC FPT', phone: '02873005588' },
            { name: 'Bảo Hiểm Y Tế Bảo Việt', bankBin: '970418', bankName: 'BIDV', bankAccount: '21510001234567', accountName: 'BAO VIET INSURANCE', phone: '1900558899' }
        );
    } else if (u.id === users[1].id) {
        // User B's Payees (Include User A MBBank, User C MSB, EVN, Sawaco Water, Viettel, FPT Telecom, Hoàn Mỹ)
        userPayeeList.push(
            { name: 'Nguyễn Văn A (Chủ phòng)', bankBin: '970422', bankName: 'MBBank', bankAccount: '6617052004888', accountName: 'DUONG DUC BAO', phone: '0900123456' },
            { name: 'Nguyễn Văn C (Chủ nhà trọ)', bankBin: '970426', bankName: 'MSB', bankAccount: '4517052004', accountName: 'NGUYEN VAN C', phone: '0902234567' },
            { name: 'Công ty Điện lực EVN HCMC', bankBin: '970436', bankName: 'VCB', bankAccount: '1012345678', accountName: 'EVN HCMC', phone: '1900545454' },
            { name: 'Công ty Cấp nước Sawaco HCMC', bankBin: '970418', bankName: 'BIDV', bankAccount: '110022334455', accountName: 'SAWACO HCMC', phone: '19001589' },
            { name: 'Tập đoàn Viễn thông Viettel', bankBin: '970407', bankName: 'Techcombank', bankAccount: '19033338888', accountName: 'VIETTEL TELECOM', phone: '18008098' },
            { name: 'Dịch vụ Internet FPT Telecom', bankBin: '970423', bankName: 'TPBank', bankAccount: '00001928374', accountName: 'FPT TELECOM', phone: '19006600' },
            { name: 'Bệnh Viện Đa Khoa Hoàn Mỹ', bankBin: '970418', bankName: 'BIDV', bankAccount: '21510001234567', accountName: 'BENH VIEN HOAN MY', phone: '02839902468' }
        );
    } else if (u.id === users[2].id) {
        // User C's Payees (Include User A MBBank, User B Techcombank, EVN, Sawaco Water, Viettel, VUS, CarePlus)
        userPayeeList.push(
            { name: 'Nguyễn Văn A (Nhận tiền thuê nhà)', bankBin: '970422', bankName: 'MBBank', bankAccount: '6617052004888', accountName: 'DUONG DUC BAO', phone: '0900123456' },
            { name: 'Nguyễn Văn B (Thủ quỹ nhóm)', bankBin: '970407', bankName: 'Techcombank', bankAccount: '6617052004', accountName: 'NGUYEN VAN B', phone: '0901234567' },
            { name: 'Công ty Điện lực EVN HCMC', bankBin: '970436', bankName: 'VCB', bankAccount: '1012345678', accountName: 'EVN HCMC', phone: '1900545454' },
            { name: 'Công ty Cấp nước Sawaco HCMC', bankBin: '970418', bankName: 'BIDV', bankAccount: '110022334455', accountName: 'SAWACO HCMC', phone: '19001589' },
            { name: 'Tập đoàn Viễn thông Viettel', bankBin: '970407', bankName: 'Techcombank', bankAccount: '19033338888', accountName: 'VIETTEL TELECOM', phone: '18008098' },
            { name: 'Trung Tâm Anh Ngữ VUS (Học phí)', bankBin: '970423', bankName: 'TPBank', bankAccount: '00001928374', accountName: 'ANH VAN HOI VIET MY', phone: '02873083333' },
            { name: 'Phòng Khám Đa Khoa CarePlus', bankBin: '970418', bankName: 'BIDV', bankAccount: '21510001234567', accountName: 'CAREPLUS CLINIC', phone: '18006116' }
        );
    } else {
        // Default templates for D and E
        userPayeeList.push(
            { name: 'Chủ nhà trọ Nguyễn Văn Bính', bankBin: '970422', bankName: 'MBBank', bankAccount: '6617052004888', accountName: 'DUONG DUC BAO', phone: '0901888999' },
            { name: 'Công ty Điện lực EVN HCMC', bankBin: '970436', bankName: 'VCB', bankAccount: '1012345678', accountName: 'EVN HCMC', phone: '1900545454' },
            { name: 'Công ty Cấp nước Sawaco HCMC', bankBin: '970418', bankName: 'BIDV', bankAccount: '110022334455', accountName: 'SAWACO HCMC', phone: '19001589' },
            { name: 'Tập đoàn Viễn thông Viettel', bankBin: '970407', bankName: 'Techcombank', bankAccount: '19033338888', accountName: 'VIETTEL TELECOM', phone: '18008098' },
            { name: 'WinMart Vincom Mega', bankBin: '970418', bankName: 'BIDV', bankAccount: '21510001234567', accountName: 'WINCOMMERCE JSC', phone: '02471066866' }
        );
    }

    const payeeMap = {};
    const pArr = [];
    userPayeeList.forEach(p => {
        const pId = uuid();
        pArr.push(pId);
        payeeMap[p.name] = { id: pId, ...p };
        state.payees.push(`('${pId}', '${u.id}', '${p.name}', '${p.bankBin}', '${p.bankName}', '${p.bankAccount}', '${p.accountName}', '${p.phone}', '${createdAt}')`);
    });

    ['#an_uong', '#mua_sam', '#cong_viec', '#du_lich'].forEach(tag => {
        state.tags.push(`('${uuid()}', '${u.id}', '${tag}')`);
    });

    // External Loans
    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', '${u.bankName}', 15000000, 7.5, '${u.startYear}-01-15', '${u.startYear + 2}-01-15', 'Vay mua laptop trả góp', false, '${createdAt}', '${createdAt}')`);
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
            state.txs.push(`('${uuid()}', '${wMain}', ${u.baseSalary}, 'INCOME', '${categoryMap['Tiền lương']}', NULL, '${pArr[0]}', '${salaryDate}', 'Nhận lương tháng ${mStr}/${year}', false, false, false, '${salaryDate}')`);
            netMainBalance += u.baseSalary;

            // 2. Income: Bonus (past months T3, T6; not T8 because day 25 > 20)
            if (m % 3 === 0 && (year < 2026 || m < 8)) {
                const bonusAmt = 1500000;
                state.txs.push(`('${uuid()}', '${wMain}', ${bonusAmt}, 'INCOME', '${categoryMap['Thưởng']}', NULL, '${pArr[0]}', '${bonusDate}', 'Thưởng chuyên cần Quý ${m/3}', false, false, false, '${bonusDate}')`);
                netMainBalance += bonusAmt;
            }

            // 3. Budgets for this month - BILL BUDGETS WITH DEDICATED WATER BILL (TIỀN NƯỚC)
            const budgetIdMap = {};
            const bConfigs = [];

            if (u.id === users[0].id) {
                // USER A: BILL BUDGETS (Tiền nhà -> B Techcombank, Tiền điện -> EVN, Tiền nước -> Sawaco, Phí liên lạc -> Viettel, Học phí -> FPT, Y tế -> Bảo Việt)
                bConfigs.push(
                    { name: 'Tiền nhà', limit: 1800000, due: 5, payee: payeeMap['Nguyễn Văn B (Chủ nhà / Bạn thân)'], type: 'BILL', mand: true },
                    { name: 'Tiền điện', limit: 750000, due: 10, payee: payeeMap['Công ty Điện lực EVN HCMC'], type: 'BILL', mand: true },
                    { name: 'Tiền nước', limit: 180000, due: 12, payee: payeeMap['Công ty Cấp nước Sawaco HCMC'], type: 'BILL', mand: true },
                    { name: 'Phí liên lạc', limit: 250000, due: 20, payee: payeeMap['Tập đoàn Viễn thông Viettel'], type: 'BILL', mand: true },
                    { name: 'Giáo dục', limit: 1200000, due: 25, payee: payeeMap['Trường Đại Học FPT (Học phí)'], type: 'BILL', mand: true },
                    { name: 'Y tế', limit: 500000, due: 15, payee: payeeMap['Bảo Hiểm Y Tế Bảo Việt'], type: 'BILL', mand: true },
                    { name: 'Ăn uống', limit: 2000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Chi tiêu hàng ngày', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Phí giao lưu', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Quần áo', limit: 1000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Đi lại', limit: 800000, due: null, payee: null, type: 'FLEXIBLE', mand: false }
                );
            } else if (u.id === users[1].id) {
                // USER B: BILL BUDGETS (Tiền nhà -> C MSB, Tiền điện -> EVN, Tiền nước -> Sawaco, Phí liên lạc -> Viettel, Học phí, Y tế)
                bConfigs.push(
                    { name: 'Tiền nhà', limit: 1500000, due: 5, payee: payeeMap['Nguyễn Văn C (Chủ nhà trọ)'], type: 'BILL', mand: true },
                    { name: 'Tiền điện', limit: 650000, due: 10, payee: payeeMap['Công ty Điện lực EVN HCMC'], type: 'BILL', mand: true },
                    { name: 'Tiền nước', limit: 150000, due: 12, payee: payeeMap['Công ty Cấp nước Sawaco HCMC'], type: 'BILL', mand: true },
                    { name: 'Phí liên lạc', limit: 200000, due: 20, payee: payeeMap['Tập đoàn Viễn thông Viettel'], type: 'BILL', mand: true },
                    { name: 'Giáo dục', limit: 800000, due: 25, payee: payeeMap['Dịch vụ Internet FPT Telecom'], type: 'BILL', mand: true },
                    { name: 'Y tế', limit: 400000, due: 15, payee: payeeMap['Bệnh Viện Đa Khoa Hoàn Mỹ'], type: 'BILL', mand: true },
                    { name: 'Ăn uống', limit: 2000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Chi tiêu hàng ngày', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Phí giao lưu', limit: 1200000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Quần áo', limit: 800000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Đi lại', limit: 700000, due: null, payee: null, type: 'FLEXIBLE', mand: false }
                );
            } else if (u.id === users[2].id) {
                // USER C: BILL BUDGETS (Tiền nhà -> A MBBank, Tiền điện -> EVN, Tiền nước -> Sawaco, Phí liên lạc -> Viettel, Học phí -> VUS, Y tế -> CarePlus)
                bConfigs.push(
                    { name: 'Tiền nhà', limit: 1600000, due: 5, payee: payeeMap['Nguyễn Văn A (Nhận tiền thuê nhà)'], type: 'BILL', mand: true },
                    { name: 'Tiền điện', limit: 700000, due: 10, payee: payeeMap['Công ty Điện lực EVN HCMC'], type: 'BILL', mand: true },
                    { name: 'Tiền nước', limit: 160000, due: 12, payee: payeeMap['Công ty Cấp nước Sawaco HCMC'], type: 'BILL', mand: true },
                    { name: 'Phí liên lạc', limit: 220000, due: 20, payee: payeeMap['Tập đoàn Viễn thông Viettel'], type: 'BILL', mand: true },
                    { name: 'Giáo dục', limit: 1000000, due: 25, payee: payeeMap['Trung Tâm Anh Ngữ VUS (Học phí)'], type: 'BILL', mand: true },
                    { name: 'Y tế', limit: 450000, due: 15, payee: payeeMap['Phòng Khám Đa Khoa CarePlus'], type: 'BILL', mand: true },
                    { name: 'Ăn uống', limit: 2000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Chi tiêu hàng ngày', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Phí giao lưu', limit: 1400000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Quần áo', limit: 900000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Đi lại', limit: 750000, due: null, payee: null, type: 'FLEXIBLE', mand: false }
                );
            } else {
                // Users D & E
                bConfigs.push(
                    { name: 'Ăn uống', limit: 2000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Tiền nhà', limit: Math.min(2000000, u.rentAmt), due: 5, payee: payeeMap['Chủ nhà trọ Nguyễn Văn Bính'], type: 'BILL', mand: true },
                    { name: 'Chi tiêu hàng ngày', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Phí giao lưu', limit: 1500000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Quần áo', limit: 1000000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Đi lại', limit: 800000, due: null, payee: null, type: 'FLEXIBLE', mand: false },
                    { name: 'Tiền điện', limit: 750000, due: 15, payee: payeeMap['Công ty Điện lực EVN HCMC'], type: 'BILL', mand: true },
                    { name: 'Tiền nước', limit: 150000, due: 18, payee: payeeMap['Công ty Cấp nước Sawaco HCMC'], type: 'BILL', mand: true },
                    { name: 'Phí liên lạc', limit: 200000, due: 20, payee: payeeMap['Tập đoàn Viễn thông Viettel'], type: 'BILL', mand: true }
                );
            }

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

            // 4. Fixed Monthly Expenses & Daily Expenses
            if (year < 2026 || m <= 7) {
                // Past months: settle all fixed bills
                // Rent
                const rentDate = `${year}-${mStr}-05 10:00:00`;
                state.txs.push(`('${uuid()}', '${wMain}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentDate}', 'Thanh toán tiền nhà tháng ${mStr}/${year}', false, false, false, '${rentDate}')`);
                netMainBalance -= u.rentAmt;

                // Electricity
                const elecDate = `${year}-${mStr}-10 14:00:00`;
                const elecAmt = randomInt(350000, 650000);
                state.txs.push(`('${uuid()}', '${wMain}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[2] || pArr[1]}', '${elecDate}', 'Thanh toán tiền điện EVN T${mStr}', false, false, false, '${elecDate}')`);
                netMainBalance -= elecAmt;

                // Water
                const waterDate = `${year}-${mStr}-12 11:30:00`;
                const waterAmt = randomInt(75000, 135000);
                state.txs.push(`('${uuid()}', '${wMain}', ${waterAmt}, 'EXPENSE', '${categoryMap['Tiền nước']}', '${budgetIdMap['Tiền nước']}', '${payeeMap['Công ty Cấp nước Sawaco HCMC']?.id || pArr[3]}', '${waterDate}', 'Thanh toán tiền nước sinh hoạt Sawaco T${mStr}', false, false, false, '${waterDate}')`);
                netMainBalance -= waterAmt;

                // Phone/Internet
                const phoneDate = `${year}-${mStr}-20 09:30:00`;
                const phoneAmt = 90000;
                state.txs.push(`('${uuid()}', '${wMain}', ${phoneAmt}, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${budgetIdMap['Phí liên lạc']}', '${payeeMap['Tập đoàn Viễn thông Viettel']?.id || pArr[4]}', '${phoneDate}', 'Nạp tiền 4G Viettel tháng ${mStr}', false, false, false, '${phoneDate}')`);
                netMainBalance -= phoneAmt;

                // Rich Flexible Daily Expenses for past months (20-26 transactions/month)
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
                // CURRENT MONTH (AUGUST 2026) - LEAVE BILL BUDGETS UNPAID OR PARTIALLY PAID
                // TO ALLOW TESTING "TRẢ NGAY" 1-TOUCH PAYMENT FLOWS!
                // ══════════════════════════════════════════════════════════════════

                if (u.id === users[0].id) {
                    // USER A:
                    // 1. Tiền nhà: Đã trả 1.85tr (Overspent 50k for rebalance test)
                    const rentTxDate = `2026-08-04 10:00:00`;
                    state.txs.push(`('${uuid()}', '${wMain}', 1850000, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${budgetIdMap['Tiền nhà']}', '${pArr[0]}', '${rentTxDate}', 'Tiền phòng trọ và phụ phí quản lý T8', false, false, false, '${rentTxDate}')`);
                    netMainBalance -= 1850000;

                    // 2. Tiền điện: Chưa trả hết (Đã thanh toán cọc 200k / Hạn mức 750k -> CÒN 550k ĐỂ TEST TRẢ NGAY)
                    state.txs.push(`('${uuid()}', '${wMain}', 200000, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[2]}', '2026-08-10 14:00:00', 'Tạm ứng tiền điện đợt 1 EVN', false, false, false, '2026-08-10 14:00:00')`);
                    netMainBalance -= 200000;

                    // 3. Tiền nước: CHƯA TRẢ (0 / 180k -> TEST TRẢ NGAY HÓA ĐƠN NƯỚC SAWACO)
                    // 4. Phí liên lạc: CHƯA TRẢ (0 / 250k -> TEST TRẢ NGAY 1-TOUCH CHO VIETTEL)
                    // 5. Giáo dục: CHƯA TRẢ (0 / 1.2tr -> TEST TRẢ NGAY HỌC PHÍ FPT)
                    // 6. Y tế: CHƯA TRẢ (0 / 500k -> TEST TRẢ NGAY BẢO HIỂM BẢO VIỆT)

                    // 7. Ăn uống: Overspent 150k (2.15tr / 2tr)
                    state.txs.push(`('${uuid()}', '${wMain}', 650000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[1]}', '2026-08-02 12:30:00', 'Đi siêu thị mua đồ ăn tuần 1', false, false, false, '2026-08-02 12:30:00')`);
                    state.txs.push(`('${uuid()}', '${wMain}', 1500000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[1]}', '2026-08-08 19:30:00', 'Tiệc buffet lẩu nướng sinh nhật', false, false, false, '2026-08-08 19:30:00')`);
                    netMainBalance -= 2150000;

                    // 8. Clothes: 300k
                    state.txs.push(`('${uuid()}', '${wMain}', 300000, 'EXPENSE', '${categoryMap['Quần áo']}', '${budgetIdMap['Quần áo']}', '${pArr[1]}', '2026-08-03 15:00:00', 'Mua áo thun cotton Uniqlo', false, false, false, '2026-08-03 15:00:00')`);
                    netMainBalance -= 300000;

                    // 9. Daily Goods: 1.48tr
                    state.txs.push(`('${uuid()}', '${wMain}', 1480000, 'EXPENSE', '${categoryMap['Chi tiêu hàng ngày']}', '${budgetIdMap['Chi tiêu hàng ngày']}', '${pArr[1]}', '2026-08-06 18:00:00', 'Mua đồ gia dụng và nhu yếu phẩm tháng 8', false, false, false, '2026-08-06 18:00:00')`);
                    netMainBalance -= 1480000;

                    // 10. Social: 1.28tr
                    state.txs.push(`('${uuid()}', '${wMain}', 1280000, 'EXPENSE', '${categoryMap['Phí giao lưu']}', '${budgetIdMap['Phí giao lưu']}', '${pArr[1]}', '2026-08-07 14:00:00', 'Mừng tân gia đồng nghiệp phòng IT', false, false, false, '2026-08-07 14:00:00')`);
                    netMainBalance -= 1280000;

                    // 11. Transport: 780k
                    state.txs.push(`('${uuid()}', '${wMain}', 780000, 'EXPENSE', '${categoryMap['Đi lại']}', '${budgetIdMap['Đi lại']}', '${pArr[0]}', '2026-08-09 08:00:00', 'Nạp thẻ giao thông & Grab đi làm đầu tháng', false, false, false, '2026-08-09 08:00:00')`);
                    netMainBalance -= 780000;

                    // Coffee today (20/08/2026)
                    state.txs.push(`('${uuid()}', '${wMain}', 35000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', '${pArr[1]}', '2026-08-20 08:15:00', 'Cà phê muối sáng ngày 20/08', false, false, false, '2026-08-20 08:15:00')`);
                    netMainBalance -= 35000;

                    // Payment Orders in August 2026
                    const payosPendingRef = generateTxnRef(2026, 8, 15, 14, 45, 0, 'POS');
                    state.paymentOrders.push(`('${uuid()}', '${payosPendingRef}', '${u.id}', 'BUDGET', 350000, '${wMain}', '${categoryMap['Ăn uống']}', '${budgetIdMap['Ăn uống']}', NULL, NULL, 'PENDING', NULL, 'PAYOS_VIETQR', 'VIETQR_NAPAS247', NULL, NULL, 'Thanh toan PayOS ${payosPendingRef}', '2026-08-15 14:45:00', '2026-08-15 15:00:00', NULL)`);

                } else if (u.id === users[1].id) {
                    // USER B:
                    // 1. Tiền nhà: CHƯA TRẢ (0 / 1.5tr -> TEST TRẢ NGAY QUA MSB CỦA USER C 4517052004)
                    // 2. Tiền điện: Đã trả 350k / 650k -> CÒN 300k ĐỂ TEST TRẢ NGAY
                    state.txs.push(`('${uuid()}', '${wMain}', 350000, 'EXPENSE', '${categoryMap['Tiền điện']}', '${budgetIdMap['Tiền điện']}', '${pArr[2]}', '2026-08-10 14:00:00', 'Thanh toán tiền điện EVN T8 đợt 1', false, false, false, '2026-08-10 14:00:00')`);
                    netMainBalance -= 350000;

                    // 3. Tiền nước: Đã trả cọc 50k / 150k -> CÒN 100k ĐỂ TEST TRẢ NGAY
                    state.txs.push(`('${uuid()}', '${wMain}', 50000, 'EXPENSE', '${categoryMap['Tiền nước']}', '${budgetIdMap['Tiền nước']}', '${payeeMap['Công ty Cấp nước Sawaco HCMC']?.id || pArr[3]}', '2026-08-11 10:00:00', 'Tạm ứng tiền nước Sawaco T8', false, false, false, '2026-08-11 10:00:00')`);
                    netMainBalance -= 50000;

                    // 4. Phí liên lạc: CHƯA TRẢ (0 / 200k -> TEST TRẢ NGAY VIETTEL)
                    // 5. Giáo dục: CHƯA TRẢ (0 / 800k -> TEST TRẢ NGAY FPT TELECOM)
                    // 6. Y tế: CHƯA TRẢ (0 / 400k -> TEST TRẢ NGAY HOÀN MỸ)

                    // Daily expenses for User B in August (days 1-20)
                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Mỹ phẩm', 'Phí giao lưu', 'Đi lại'];
                    for (let i = 0; i < 14; i++) {
                        const day = randomInt(1, 20);
                        const hour = (day === 20) ? randomInt(7, 10) : randomInt(7, 21);
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
                    // 5. Giáo dục: CHƯA TRẢ (0 / 1tr -> TEST TRẢ NGAY VUS)
                    // 6. Y tế: CHƯA TRẢ (0 / 450k -> TEST TRẢ NGAY CAREPLUS)

                    // Daily expenses for User C in August (days 1-20)
                    const expenseCategories = ['Ăn uống', 'Chi tiêu hàng ngày', 'Quần áo', 'Phí giao lưu', 'Đi lại'];
                    for (let i = 0; i < 14; i++) {
                        const day = randomInt(1, 20);
                        const hour = (day === 20) ? randomInt(7, 10) : randomInt(7, 21);
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
                    const augTxCount = randomInt(12, 16);

                    for (let i = 0; i < augTxCount; i++) {
                        const day = randomInt(1, 20);
                        const hour = (day === 20) ? randomInt(7, 10) : randomInt(7, 21);
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

fs.writeFileSync('seed_v16.sql', sql, 'utf8');
console.log(`Successfully generated seed_v16.sql: ${state.txs.length} transactions, ${state.expenses.length} group expenses, ${state.budgets.length} budgets with Tiền nước and 100% Entity parity bounded up to 20/08/2026!`);
