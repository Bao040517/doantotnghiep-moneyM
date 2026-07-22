-- ============================================================================
-- SHAREMONEY - COMPLETE DATABASE SEED (Schema + 3 Tháng Dữ Liệu Mẫu)
-- ============================================================================
-- Dùng cho database MỚI HOÀN TOÀN (share-money) trên pgAdmin.
-- Bước 1: Tạo database "share-money" trên pgAdmin (nếu chưa có).
-- Bước 2: Mở Query Tool trên database "share-money", paste toàn bộ file này và RUN.
-- Mật khẩu tất cả users: 123456
-- Dữ liệu 3 tháng: Tháng 4, 5, 6/2026 (+ 1 giao dịch bất thường để demo Z-Score)
-- ============================================================================

-- ===================== PHẦN 1: TẠO BẢNG (CREATE TABLES) =====================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20) UNIQUE,
    bank_bin VARCHAR(20),
    bank_account_no VARCHAR(50),
    bank_qr_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    is_liability BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    icon_name VARCHAR(50),
    UNIQUE(user_id, name, type)
);

-- 4. PAYEES
CREATE TABLE IF NOT EXISTS payees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    UNIQUE(user_id, name)
);

-- 5. TAGS
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    UNIQUE(user_id, name)
);

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount NUMERIC(15,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    transaction_date TIMESTAMP NOT NULL,
    note VARCHAR(500),
    linked_expense_id UUID,
    linked_budget_id UUID,
    payee_id UUID REFERENCES payees(id),
    is_split BOOLEAN NOT NULL DEFAULT FALSE,
    exclude_from_budget BOOLEAN DEFAULT FALSE,
    is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TRANSACTION SPLITS
CREATE TABLE IF NOT EXISTS transaction_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_transaction_id UUID NOT NULL REFERENCES transactions(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    amount NUMERIC(15,2) NOT NULL,
    note VARCHAR(500)
);

-- 8. TRANSACTION TAGS (Join table)
CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    tag_id UUID NOT NULL REFERENCES tags(id),
    PRIMARY KEY (transaction_id, tag_id)
);

-- 9. GROUPS
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. GROUP MEMBERS
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_group_members_group_user UNIQUE (group_id, user_id)
);

-- 11. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    paid_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. EXPENSE SPLITS
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount_owed NUMERIC(15,2) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE
);

-- 13. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id),
    payer_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(255),
    limit_amount NUMERIC(15,2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'FLEXIBLE',
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    due_day_of_month INT,
    is_mandatory BOOLEAN DEFAULT FALSE,
    payee_bank_bin VARCHAR(50),
    payee_bank_account VARCHAR(50),
    payee_account_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id, month, year, name)
);

-- 15. SAVINGS GOALS
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(15,2) NOT NULL,
    current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    deadline_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. EXTERNAL LOANS
CREATE TABLE IF NOT EXISTS external_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    counterparty_name VARCHAR(100) NOT NULL,
    principal_amount NUMERIC(15,2) NOT NULL,
    interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    start_date DATE,
    due_date DATE,
    description VARCHAR(500),
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ===================== PHẦN 2: DỮ LIỆU MẪU (SEED DATA) =====================

-- Xóa dữ liệu cũ nếu có (an toàn)
DELETE FROM transaction_tags;
DELETE FROM transaction_splits;
DELETE FROM payments;
DELETE FROM expense_splits;
DELETE FROM expenses;
DELETE FROM group_members;
DELETE FROM notifications;
DELETE FROM budgets;
DELETE FROM savings_goals;
DELETE FROM external_loans;
DELETE FROM transactions;
DELETE FROM tags;
DELETE FROM payees;
DELETE FROM categories;
DELETE FROM wallets;
DELETE FROM groups;
DELETE FROM users;

-- ========================= 1. USERS =========================
-- Mật khẩu tất cả: 123456 (BCrypt hash)
INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES
('1a111111-1111-4111-a111-111111111111', 'nguyenvana@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn A', '0901234567', 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff', '970422', '0901234567', '2026-03-01 08:00:00'),
('1a111111-1111-4111-a111-111111111112', 'tranthib@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Trần Thị B', '0902345678', 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff', NULL, NULL, '2026-03-01 08:00:00'),
('1a111111-1111-4111-a111-111111111113', 'lethic@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Lê Thị C', '0903456789', 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff', NULL, NULL, '2026-03-01 08:00:00'),
('1a111111-1111-4111-a111-111111111114', 'phamvand@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Phạm Văn D', '0904567890', 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff', NULL, NULL, '2026-03-01 08:00:00'),
('1a111111-1111-4111-a111-111111111115', 'hoangthie@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Hoàng Thị E', '0905678901', 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff', NULL, NULL, '2026-03-15 08:00:00');

-- ========================= 2. WALLETS =========================
-- Ví chính cho User A (Nguyễn Văn A) - đây là user demo chính
INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES
('3c333333-3333-4333-a333-333333333331', '1a111111-1111-4111-a111-111111111111', 'Tiền mặt', 2350000, 'VND', false, '2026-03-01 08:00:00'),
('3c333333-3333-4333-a333-333333333332', '1a111111-1111-4111-a111-111111111111', 'Techcombank', 15500000, 'VND', false, '2026-03-01 08:00:00');
-- Ví cho các user khác
INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES
('3c333333-3333-4333-a333-333333333341', '1a111111-1111-4111-a111-111111111112', 'Tiền mặt', 5000000, 'VND', false, '2026-03-01 08:00:00'),
('3c333333-3333-4333-a333-333333333342', '1a111111-1111-4111-a111-111111111113', 'Tiền mặt', 3000000, 'VND', false, '2026-03-01 08:00:00'),
('3c333333-3333-4333-a333-333333333343', '1a111111-1111-4111-a111-111111111114', 'Tiền mặt', 4000000, 'VND', false, '2026-03-01 08:00:00'),
('3c333333-3333-4333-a333-333333333344', '1a111111-1111-4111-a111-111111111115', 'Tiền mặt', 6000000, 'VND', false, '2026-03-01 08:00:00');

-- ========================= 3. CATEGORIES (User A) =========================
-- EXPENSE categories
INSERT INTO categories (id, user_id, name, type, icon_name) VALUES
('2b222222-2222-4222-a222-222222222221', '1a111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍽️'),
('2b222222-2222-4222-a222-222222222222', '1a111111-1111-4111-a111-111111111111', 'Đi lại', 'EXPENSE', '🚆'),
('2b222222-2222-4222-a222-222222222223', '1a111111-1111-4111-a111-111111111111', 'Tiền nhà', 'EXPENSE', '🏠'),
('2b222222-2222-4222-a222-222222222224', '1a111111-1111-4111-a111-111111111111', 'Tiền điện', 'EXPENSE', '💡'),
('2b222222-2222-4222-a222-222222222225', '1a111111-1111-4111-a111-111111111111', 'Chi tiêu hàng ngày', 'EXPENSE', '🧴'),
('2b222222-2222-4222-a222-222222222226', '1a111111-1111-4111-a111-111111111111', 'Y tế', 'EXPENSE', '💊'),
('2b222222-2222-4222-a222-222222222227', '1a111111-1111-4111-a111-111111111111', 'Phí giao lưu', 'EXPENSE', '🥂'),
('2b222222-2222-4222-a222-222222222231', '1a111111-1111-4111-a111-111111111111', 'Quần áo', 'EXPENSE', '👕'),
('2b222222-2222-4222-a222-222222222232', '1a111111-1111-4111-a111-111111111111', 'Mỹ phẩm', 'EXPENSE', '💄'),
('2b222222-2222-4222-a222-222222222233', '1a111111-1111-4111-a111-111111111111', 'Giáo dục', 'EXPENSE', '📚'),
('2b222222-2222-4222-a222-222222222234', '1a111111-1111-4111-a111-111111111111', 'Phí liên lạc', 'EXPENSE', '📱'),
('2b222222-2222-4222-a222-222222222240', '1a111111-1111-4111-a111-111111111111', 'Mục tiêu tiết kiệm', 'EXPENSE', '🎯');
-- INCOME categories
INSERT INTO categories (id, user_id, name, type, icon_name) VALUES
('2b222222-2222-4222-a222-222222222228', '1a111111-1111-4111-a111-111111111111', 'Tiền lương', 'INCOME', '💰'),
('2b222222-2222-4222-a222-222222222229', '1a111111-1111-4111-a111-111111111111', 'Tiền thưởng', 'INCOME', '🎁'),
('2b222222-2222-4222-a222-222222222230', '1a111111-1111-4111-a111-111111111111', 'Hoàn tiền tiết kiệm', 'INCOME', '🏦');
-- TRANSFER categories (dùng nội bộ cho PFM)
INSERT INTO categories (id, user_id, name, type, icon_name) VALUES
('2b222222-2222-4222-a222-222222222235', '1a111111-1111-4111-a111-111111111111', 'Trả nợ nhóm', 'TRANSFER', '💸'),
('2b222222-2222-4222-a222-222222222236', '1a111111-1111-4111-a111-111111111111', 'Nhận tiền nhóm', 'TRANSFER', '⬅️'),
('2b222222-2222-4222-a222-222222222237', '1a111111-1111-4111-a111-111111111111', 'Xóa nợ nhóm', 'TRANSFER', '✅'),
('2b222222-2222-4222-a222-222222222238', '1a111111-1111-4111-a111-111111111111', 'Cho nhóm mượn', 'TRANSFER', '➡️');

-- ========================= 4. PAYEES (User A) =========================
INSERT INTO payees (id, user_id, name) VALUES
('9b999999-9999-4999-a999-999999999991', '1a111111-1111-4111-a111-111111111111', 'VinMart'),
('9b999999-9999-4999-a999-999999999992', '1a111111-1111-4111-a111-111111111111', 'Bách Hóa Xanh'),
('9b999999-9999-4999-a999-999999999993', '1a111111-1111-4111-a111-111111111111', 'EVN Hà Nội'),
('9b999999-9999-4999-a999-999999999994', '1a111111-1111-4111-a111-111111111111', 'Highlands Coffee'),
('9b999999-9999-4999-a999-999999999995', '1a111111-1111-4111-a111-111111111111', 'Shopee'),
('9b999999-9999-4999-a999-999999999996', '1a111111-1111-4111-a111-111111111111', 'Grab'),
('9b999999-9999-4999-a999-999999999997', '1a111111-1111-4111-a111-111111111111', 'Baemin'),
('9b999999-9999-4999-a999-999999999998', '1a111111-1111-4111-a111-111111111111', 'Nhà Thuốc Long Châu'),
('9b999999-9999-4999-a999-999999999999', '1a111111-1111-4111-a111-111111111111', 'CGV Cinemas'),
('9b999999-9999-4999-a999-999999999900', '1a111111-1111-4111-a111-111111111111', 'Công ty TNHH ABC');

-- ========================= 5. TAGS (User A) =========================
INSERT INTO tags (id, user_id, name) VALUES
('11a11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', '#canthiet'),
('11a11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', '#tieusai'),
('11a11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', '#banbe'),
('11a11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', '#giadinh'),
('11a11111-1111-4111-a111-111111111115', '1a111111-1111-4111-a111-111111111111', '#dulich'),
('11a11111-1111-4111-a111-111111111116', '1a111111-1111-4111-a111-111111111111', '#anuong'),
('11a11111-1111-4111-a111-111111111117', '1a111111-1111-4111-a111-111111111111', '#suckhoe'),
('11a11111-1111-4111-a111-111111111118', '1a111111-1111-4111-a111-111111111111', '#congviec'),
('11a11111-1111-4111-a111-111111111119', '1a111111-1111-4111-a111-111111111111', '#luong'),
('11a11111-1111-4111-a111-111111111120', '1a111111-1111-4111-a111-111111111111', '#thuong');

-- ========================= 6. GROUPS =========================
INSERT INTO groups (id, name, description, owner_id, created_at) VALUES
('4d444444-4444-4444-a444-444444444441', 'Phòng Trọ 302', 'Tiền nhà hàng tháng', '1a111111-1111-4111-a111-111111111111', '2026-03-01 10:00:00'),
('4d444444-4444-4444-a444-444444444442', 'Du Lịch Đà Lạt', 'Chuyến đi tháng 5', '1a111111-1111-4111-a111-111111111112', '2026-04-15 10:00:00'),
('4d444444-4444-4444-a444-444444444443', 'Ăn Trưa Công Ty', 'Hội cơm hộp', '1a111111-1111-4111-a111-111111111113', '2026-03-10 10:00:00');

-- ========================= 7. GROUP MEMBERS =========================
INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES
-- Nhóm Phòng Trọ: A (owner) + B
('5e555555-5555-4555-a555-555555555551', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111111', 'owner', '2026-03-01 10:00:00'),
('5e555555-5555-4555-a555-555555555552', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111112', 'member', '2026-03-01 10:00:00'),
-- Nhóm Du Lịch: B (owner) + A + C + D
('5e555555-5555-4555-a555-555555555553', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111112', 'owner', '2026-04-15 10:00:00'),
('5e555555-5555-4555-a555-555555555554', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111111', 'member', '2026-04-15 10:00:00'),
('5e555555-5555-4555-a555-555555555555', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111113', 'member', '2026-04-15 10:00:00'),
('5e555555-5555-4555-a555-555555555556', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111114', 'member', '2026-04-15 10:00:00'),
-- Nhóm Ăn Trưa: C (owner) + A + D + E
('5e555555-5555-4555-a555-555555555557', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111113', 'owner', '2026-03-10 10:00:00'),
('5e555555-5555-4555-a555-555555555558', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111111', 'member', '2026-03-10 10:00:00'),
('5e555555-5555-4555-a555-555555555559', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111114', 'member', '2026-03-10 10:00:00'),
('5e555555-5555-4555-a555-555555555560', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111115', 'member', '2026-03-10 10:00:00');

-- ========================= 8. EXPENSES (Group) =========================
-- Nhóm Phòng Trọ 302: Tiền nhà 3 tháng
INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
('f389ae64-6b0f-4efd-b66e-420f5a0ed206', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111111', 'Tiền mạng và rác Tháng 4', 600000, 'Hóa đơn', '2026-04-05 09:00:00'),
('68cfeab4-e1d0-43bc-862f-f8a57ad05809', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111111', 'Tiền mạng và rác Tháng 5', 600000, 'Hóa đơn', '2026-05-05 09:00:00'),
('c33cc702-f43b-45d6-ace7-b7318432ad41', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111111', 'Tiền mạng và rác Tháng 6', 600000, 'Hóa đơn', '2026-06-05 09:00:00');

-- Nhóm Du Lịch Đà Lạt: Vé + khách sạn + ăn
INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
('e1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111111', 'Vé xe đi Đà Lạt', 2000000, 'Di chuyển', '2026-05-20 07:00:00'),
('e2222222-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111112', 'Khách sạn 2 đêm', 3600000, 'Lưu trú', '2026-05-20 15:00:00'),
('e3333333-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111113', 'Ăn tối lẩu bò', 1200000, 'Ăn uống', '2026-05-21 19:00:00'),
('e4444444-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444442', '1a111111-1111-4111-a111-111111111114', 'Thuê xe máy', 800000, 'Di chuyển', '2026-05-21 08:00:00');

-- Nhóm Ăn Trưa: Gom tiền ăn
INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES
('e5555555-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111113', 'Cơm trưa thứ 2', 400000, 'Ăn uống', '2026-06-02 12:00:00'),
('e6666666-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '4d444444-4444-4444-a444-444444444443', '1a111111-1111-4111-a111-111111111111', 'Cơm trưa thứ 4', 360000, 'Ăn uống', '2026-06-04 12:00:00');

-- ========================= 9. EXPENSE SPLITS =========================
-- Phòng Trọ 302 (chia 2 người)
INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
('cb93c8ad-3431-42b0-b0d4-fa682257febe', 'f389ae64-6b0f-4efd-b66e-420f5a0ed206', '1a111111-1111-4111-a111-111111111111', 300000, TRUE),
('e132cbec-0dad-4142-bd54-6687b61402a1', 'f389ae64-6b0f-4efd-b66e-420f5a0ed206', '1a111111-1111-4111-a111-111111111112', 300000, TRUE),
('63c1c27c-6119-4888-a371-e7cefdfe82d1', '68cfeab4-e1d0-43bc-862f-f8a57ad05809', '1a111111-1111-4111-a111-111111111111', 300000, TRUE),
('72569c72-7389-4279-9778-b47431380436', '68cfeab4-e1d0-43bc-862f-f8a57ad05809', '1a111111-1111-4111-a111-111111111112', 300000, TRUE),
('a39a75b0-dae9-4500-b3d2-fe75459b8363', 'c33cc702-f43b-45d6-ace7-b7318432ad41', '1a111111-1111-4111-a111-111111111111', 300000, FALSE),
('67061ba8-d7ae-4d44-a021-8075e8998d0b', 'c33cc702-f43b-45d6-ace7-b7318432ad41', '1a111111-1111-4111-a111-111111111112', 300000, FALSE);

-- Du Lịch Đà Lạt (chia 4 người)
INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
(gen_random_uuid(), 'e1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 500000, false),
(gen_random_uuid(), 'e1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111112', 500000, false),
(gen_random_uuid(), 'e1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 500000, false),
(gen_random_uuid(), 'e1111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 500000, false),
(gen_random_uuid(), 'e2222222-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 900000, false),
(gen_random_uuid(), 'e2222222-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111112', 900000, false),
(gen_random_uuid(), 'e2222222-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 900000, false),
(gen_random_uuid(), 'e2222222-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 900000, false),
(gen_random_uuid(), 'e3333333-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 300000, false),
(gen_random_uuid(), 'e3333333-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111112', 300000, false),
(gen_random_uuid(), 'e3333333-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 300000, false),
(gen_random_uuid(), 'e3333333-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 300000, false),
(gen_random_uuid(), 'e4444444-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 200000, false),
(gen_random_uuid(), 'e4444444-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111112', 200000, false),
(gen_random_uuid(), 'e4444444-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 200000, false),
(gen_random_uuid(), 'e4444444-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 200000, false);

-- Ăn Trưa Công Ty (chia 4 người)
INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
(gen_random_uuid(), 'e5555555-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 100000, false),
(gen_random_uuid(), 'e5555555-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 100000, false),
(gen_random_uuid(), 'e5555555-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 100000, false),
(gen_random_uuid(), 'e5555555-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111115', 100000, false),
(gen_random_uuid(), 'e6666666-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111111', 90000, false),
(gen_random_uuid(), 'e6666666-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111113', 90000, false),
(gen_random_uuid(), 'e6666666-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111114', 90000, false),
(gen_random_uuid(), 'e6666666-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '1a111111-1111-4111-a111-111111111115', 90000, false);

-- ========================= 10. PAYMENTS =========================
INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES
('121a2e92-93df-4f2f-99c5-dd5233aa6a36', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 300000, 'COMPLETED', '2026-04-10 15:00:00'),
('7ee77004-b29e-4bc8-8cbc-67e648881183', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 300000, 'COMPLETED', '2026-05-10 15:00:00');

-- ========================= 11. TRANSACTIONS (User A - 3 tháng) =========================
-- ============ THÁNG 4/2026 ============

-- Lương tháng 4
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('ff811176-6c50-471c-935c-9b30331a6c0b', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-04-05 09:00:00', 'Lương Tháng 4', FALSE, FALSE, FALSE);

-- Tiền nhà T4
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('21358305-d19d-4869-8567-0ca837955628', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-04-10 08:00:00', 'Đóng tiền nhà', FALSE, FALSE, FALSE);
-- Tiền điện T4
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('02861c6a-364a-4a33-a3e0-3a31426ef522', '3c333333-3333-4333-a333-333333333332', 750000, 'EXPENSE', '2b222222-2222-4222-a222-222222222224', '2026-04-12 10:00:00', 'Đóng tiền điện', FALSE, FALSE, FALSE);

-- Ăn uống hàng ngày T4 (~30 ngày, trung bình 70-120k/ngày, tổng ~3tr)
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('75895eeb-1abe-43bd-909b-c33fefe85c8f', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-01 12:00:00', 'Cơm trưa + cà phê', FALSE, FALSE, FALSE),
('9a307535-3ff5-452f-88cf-d2056ea6a0ff', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-02 12:30:00', 'Bún bò', FALSE, FALSE, FALSE),
('761f0657-acfc-4e9d-909a-2ff7d2b029c0', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-03 12:00:00', 'Phở + trà đá', FALSE, FALSE, FALSE),
('1b486563-8f33-404c-ba93-668de8a75cf5', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-04 12:30:00', 'Cơm trưa + tối', FALSE, FALSE, FALSE),
('e6df3877-7557-4a08-ae5b-ad6ae8e5548e', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-05 13:00:00', 'Mì xào', FALSE, FALSE, FALSE),
('2314fe5f-3098-42be-88fd-0534f89ce8cd', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-06 12:00:00', 'Lẩu Thái trưa', FALSE, FALSE, FALSE),
('8fafebac-b9e6-4d01-a30f-b99fffcf9a33', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-07 12:30:00', 'Bún chả', FALSE, FALSE, FALSE),
('cc8588c7-8605-49a3-b11b-c50797015dc1', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-08 12:00:00', 'Cơm rang + nước', FALSE, FALSE, FALSE),
('c9424a30-f9ce-420d-985f-b6c7818cb9c5', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-09 12:30:00', 'Cơm VP', FALSE, FALSE, FALSE),
('225ef9c2-8e49-49e5-9b71-f92cbe446bfe', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-10 12:00:00', 'Bún riêu', FALSE, FALSE, FALSE),
('4e64dfc3-19d9-4955-987b-dd02be9fa355', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-11 12:30:00', 'Phở gà', FALSE, FALSE, FALSE),
('dc1ce9b6-4f16-4db3-bf8f-d23646eb9dd4', '3c333333-3333-4333-a333-333333333331', 105000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-12 12:00:00', 'Cơm trưa + cafe chiều', FALSE, FALSE, FALSE),
('e323b348-e1d7-4ce8-ae85-be204af12dff', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-13 12:00:00', 'Bún đậu', FALSE, FALSE, FALSE),
('755899b6-97db-4c11-9e66-99b578056d10', '3c333333-3333-4333-a333-333333333331', 135000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-14 12:00:00', 'Ăn trưa tối', FALSE, FALSE, FALSE),
('b0690006-a226-4b8d-bade-be2b46419b8d', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-15 12:00:00', 'Cơm gà', FALSE, FALSE, FALSE),
('cfc5e2a9-e791-42ec-a028-5e180a621d9f', '3c333333-3333-4333-a333-333333333331', 115000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-16 12:00:00', 'Bánh mì + cơm tối', FALSE, FALSE, FALSE),
('a616772d-9102-4a9c-9fa1-d07c674cd655', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-17 12:30:00', 'Bún bò', FALSE, FALSE, FALSE),
('e63c7394-b7e3-4e4e-b0dd-c37fa5d5127c', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-18 12:00:00', 'Cơm VP + trà sữa', FALSE, FALSE, FALSE),
('65bc2349-9d76-41fd-a2fa-4db35df24d0c', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-19 12:30:00', 'Bánh cuốn', FALSE, FALSE, FALSE),
('ef4166f8-3717-4496-9cfd-de43402dc541', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-20 12:00:00', 'Cơm gà Hải Nam', FALSE, FALSE, FALSE),
('6c828668-1287-44e9-bbb8-258dd7ddea26', '3c333333-3333-4333-a333-333333333331', 45000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-21 12:30:00', 'Xôi sáng + phở tối', FALSE, FALSE, FALSE),
('eeb19311-24aa-4cac-ab2c-3157a182445b', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-22 12:00:00', 'Cơm bình dân', FALSE, FALSE, FALSE),
('800b343d-35ca-4d93-96f2-fecbbbbf57e3', '3c333333-3333-4333-a333-333333333331', 130000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-23 12:00:00', 'Buffet trưa', FALSE, FALSE, FALSE),
('cccb0ffd-3ac1-46b2-b21e-55ad6d3677c7', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-24 12:30:00', 'Mì quảng', FALSE, FALSE, FALSE),
('bc0eb199-aa89-4ffd-b61e-ebb8a474bf26', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-25 12:00:00', 'Cơm suất + nước ép', FALSE, FALSE, FALSE),
('a8ecea10-a060-4598-a8be-aeaef3b07aa7', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-26 12:00:00', 'Bún thịt nướng', FALSE, FALSE, FALSE),
('98fbb500-cc15-40c8-a91b-3f09b9ece110', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-27 12:30:00', 'Phở bò + cafe', FALSE, FALSE, FALSE),
('f753cd8f-a7b5-43f1-8b0d-0e7e88673e43', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-28 12:00:00', 'Cơm trưa tối', FALSE, FALSE, FALSE),
('42dbef2a-5c21-44b4-846b-44f15379b00a', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-29 12:00:00', 'Bún chả', FALSE, FALSE, FALSE),
('877feec6-ce8f-4399-8737-c41f81020695', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-04-30 12:30:00', 'Cơm rang dưa bò', FALSE, FALSE, FALSE);

-- Đi lại T4 (khoảng 8-10 lần, 20k-50k mỗi lần)
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('09485945-1d48-495e-80ca-67bb8dd5a3f8', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-03 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE),
('32c9d355-8d36-40a5-a6f5-8cc10c4f979d', '3c333333-3333-4333-a333-333333333331', 45000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-06 07:30:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('79788843-1194-404a-b4ef-831848a81f9d', '3c333333-3333-4333-a333-333333333331', 25000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-08 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE),
('728fb698-df5d-4200-929e-3e894b16968a', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-10 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE),
('48519d4e-b9a1-4ddd-93c2-4fff07fd0de0', '3c333333-3333-4333-a333-333333333331', 40000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-13 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('d6337542-db6e-402f-80e4-58c5b50979ab', '3c333333-3333-4333-a333-333333333331', 20000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-16 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE),
('5942adda-f1a9-4656-b447-0c39c8f320b2', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-19 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('67d2c5a2-23f4-499e-aaee-5efac7ca8a62', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-22 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE),
('5db9d9f0-b27b-42f9-ab9d-aa4c6d3c0f99', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-25 08:00:00', 'Grab', FALSE, FALSE, FALSE),
('ca8c3838-2557-41e1-9626-ed7cd4ba35be', '3c333333-3333-4333-a333-333333333331', 40000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-04-28 07:30:00', 'Đổ xăng', FALSE, FALSE, FALSE);

-- Phí giao lưu T4 (cuối tuần, 400k-900k)
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('ffb954a4-623d-486b-ae5d-594bd5f1db75', '3c333333-3333-4333-a333-333333333332', 650000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-04-06 20:00:00', 'Nhậu với bạn bè', FALSE, FALSE, FALSE),
('ee7672d5-dd1d-4595-a4b4-dc16739b3ce3', '3c333333-3333-4333-a333-333333333332', 500000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-04-13 20:00:00', 'Karaoke cuối tuần', FALSE, FALSE, FALSE),
('6b084fcd-fb3d-4b64-87c7-429122beace1', '3c333333-3333-4333-a333-333333333332', 750000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-04-20 20:00:00', 'Sinh nhật bạn', FALSE, FALSE, FALSE),
('daee8690-7fb7-4bea-b9f7-e6829a44a932', '3c333333-3333-4333-a333-333333333332', 400000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-04-27 20:00:00', 'Cafe cuối tuần', FALSE, FALSE, FALSE);

-- Chi tiêu hàng ngày T4 (shampoo, giặt, linh tinh)
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('a6c387c5-1682-4433-aeda-011193a44704', '3c333333-3333-4333-a333-333333333332', 250000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-04-08 18:00:00', 'Dầu gội, kem đánh răng', FALSE, FALSE, FALSE),
('70566832-f1fd-41ba-acae-3178f1c0f052', '3c333333-3333-4333-a333-333333333332', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-04-18 18:00:00', 'Giặt ủi + nước rửa', FALSE, FALSE, FALSE),
('a8ecea10-a060-4598-a8be-aeaef3b07aa8', '3c333333-3333-4333-a333-333333333332', 350000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-04-25 17:00:00', 'Đồ dùng cá nhân Shopee', FALSE, FALSE, FALSE);

-- Phí liên lạc T4
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('f753cd8f-a7b5-43f1-8b0d-0e7e88673e44', '3c333333-3333-4333-a333-333333333332', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222234', '2026-04-15 10:00:00', 'Nạp điện thoại', FALSE, FALSE, FALSE);

-- ============ THÁNG 5/2026 ============

-- Lương tháng 5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('0489542a-f56d-40cd-9e5c-813204b3a06b', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-05-05 09:00:00', 'Lương Tháng 5', FALSE, FALSE, FALSE);

-- Tiền nhà T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('3a211699-c5f8-4929-ba0a-91a58618534e', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-05-10 08:00:00', 'Đóng tiền nhà', FALSE, FALSE, FALSE);
-- Tiền điện T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('637afdb8-de71-421b-b8f4-80d72ae7ac67', '3c333333-3333-4333-a333-333333333332', 820000, 'EXPENSE', '2b222222-2222-4222-a222-222222222224', '2026-05-12 10:00:00', 'Đóng tiền điện', FALSE, FALSE, FALSE);

-- Ăn uống hàng ngày T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('06ab3fe2-a428-415d-9c5b-b53544a786f6', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-01 12:00:00', 'Phở bò', FALSE, FALSE, FALSE),
('21466d02-9740-446e-90fb-7633c8833d08', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-02 12:30:00', 'Cơm rang', FALSE, FALSE, FALSE),
('369c6e62-1795-4587-ba21-2d1c6694a61e', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-03 12:00:00', 'Bún chả + nước', FALSE, FALSE, FALSE),
('1ed2f691-00a6-4458-b97b-6eebff9d261a', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-04 12:00:00', 'Cơm bình dân', FALSE, FALSE, FALSE),
('a72dc178-be33-4960-b87a-de986dcaf04e', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-05 12:00:00', 'Trưa tối', FALSE, FALSE, FALSE),
('de1ddec0-1dd2-4e34-81e3-4bc58fe4e037', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-06 12:30:00', 'Bún riêu', FALSE, FALSE, FALSE),
('e9f1d42b-b10f-4b1b-9665-a68fcbccb183', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-07 12:00:00', 'Cơm + cafe', FALSE, FALSE, FALSE),
('7f19d3c6-0f17-4114-b6db-48d849d40c73', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-08 12:30:00', 'Phở gà', FALSE, FALSE, FALSE),
('86087296-c47c-481c-8779-daa3cd24af93', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-09 12:00:00', 'Bún đậu mắm tôm', FALSE, FALSE, FALSE),
('59a6f33b-e00c-4b43-a2b8-aa96b337cc37', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-10 12:00:00', 'Cơm rang + nước ép', FALSE, FALSE, FALSE),
('db174543-60b7-4755-89cb-1a7e0995b63d', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-11 12:30:00', 'Mì quảng', FALSE, FALSE, FALSE),
('7bcd3e52-7c70-407d-b7de-7e87310fb574', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-12 12:00:00', 'Cơm trưa tối', FALSE, FALSE, FALSE),
('840a389c-2b28-4d04-be2f-07d0acbea2f4', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-13 12:30:00', 'Bún bò', FALSE, FALSE, FALSE),
('57888be1-95c1-4346-ad90-8839103484a1', '3c333333-3333-4333-a333-333333333331', 115000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-14 12:00:00', 'Buffet trưa', FALSE, FALSE, FALSE),
('7568ff35-d0fe-46b7-a10a-99a0e316af7a', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-15 12:30:00', 'Phở + nước', FALSE, FALSE, FALSE),
('0288da1a-195c-47ba-9d0c-ccb83066afd5', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-16 12:00:00', 'Bún thịt nướng', FALSE, FALSE, FALSE),
('6c3eb4c2-5484-46fa-a2f2-65f64824d89e', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-17 12:30:00', 'Cơm suất', FALSE, FALSE, FALSE),
('1a5199a6-5440-4d77-93b2-25cd44095bda', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-18 12:00:00', 'Lẩu cá', FALSE, FALSE, FALSE),
('230c74d8-5286-4614-b8ce-035bb93be4d3', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-19 12:00:00', 'Bánh mì + phở', FALSE, FALSE, FALSE),
('54889cd1-c11b-4e15-b9e0-264e464da969', '3c333333-3333-4333-a333-333333333331', 105000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-20 12:30:00', 'Cơm trưa tối', FALSE, FALSE, FALSE),
('d5557d31-e204-4a73-9033-482a46963b2c', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-21 12:00:00', 'Bún ốc', FALSE, FALSE, FALSE),
('e0b1d61e-1844-4035-9ee3-c639bd0b9a0f', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-22 12:30:00', 'Phở bò', FALSE, FALSE, FALSE),
('193bae45-35fc-4cfd-932f-347cfb71f3f0', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-23 12:00:00', 'Cơm VP', FALSE, FALSE, FALSE),
('6e4a51f2-d26d-49db-8ff6-de1ca22e8197', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-24 12:30:00', 'Bánh cuốn', FALSE, FALSE, FALSE),
('ef7c283e-ea09-4709-90db-a1583c1392f8', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-25 12:00:00', 'Cơm + trà sữa', FALSE, FALSE, FALSE),
('f8563675-4e53-4f38-bdc2-415dbcb1a2c0', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-26 12:00:00', 'Bún chả', FALSE, FALSE, FALSE),
('2c5d52aa-90c5-44a2-a294-154e63b29708', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-27 12:30:00', 'Phở gà', FALSE, FALSE, FALSE),
('a4cd3773-7fc8-45b2-a5a5-205d30ef11d3', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-28 12:00:00', 'Cơm rang', FALSE, FALSE, FALSE),
('b5543b4f-7eeb-464b-abd2-6aa6f55f9015', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-29 12:00:00', 'Bún riêu cua', FALSE, FALSE, FALSE),
('01a98d75-b5d3-4218-a900-e06ae501e766', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-30 12:30:00', 'Cơm suất + cafe', FALSE, FALSE, FALSE),
('4d3e36b7-5e1d-4484-8cfb-384e2735ba18', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-31 12:00:00', 'Mì xào hải sản', FALSE, FALSE, FALSE);

-- ★★★ GIAO DỊCH BẤT THƯỜNG (ANOMALY) - Để demo Z-Score ★★★
-- Bình thường user A ăn khoảng 60k-120k/ngày. Đây là 1 giao dịch bất thường 5 triệu cho Ăn uống.
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('4324a85b-24ec-42d6-90d0-512b9b791c26', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-05-20 21:00:00', '🚨 Bao bạn bè nhậu sinh nhật (BẤT THƯỜNG)', FALSE, FALSE, FALSE);

-- Đi lại T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('1c2c37db-716a-49b3-8d28-5f2620ea804b', '3c333333-3333-4333-a333-333333333331', 25000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-02 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE),
('ca689acc-c4c9-4fe4-b2ec-6eff4e1e7cb0', '3c333333-3333-4333-a333-333333333331', 40000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-05 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('4efa2360-fd29-4f3f-92f4-5f42a25e4082', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-08 07:30:00', 'Grab', FALSE, FALSE, FALSE),
('eddc5427-d5d6-4958-bbbf-1c04916f9559', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-11 08:00:00', 'Xe ôm', FALSE, FALSE, FALSE),
('b747aa7f-be60-4c07-8c7f-17d748ef4eff', '3c333333-3333-4333-a333-333333333331', 45000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-14 07:30:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('f05e1d13-bbda-4e2f-9465-ada6f6068a66', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-17 08:00:00', 'Grab', FALSE, FALSE, FALSE),
('1311609f-64f8-414d-bee9-0f042fc3df3a', '3c333333-3333-4333-a333-333333333331', 20000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-20 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE),
('22547c21-c7bb-4ad9-9719-5b1b7bfd2f5d', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-23 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('302cfd93-7328-4eb4-aacc-f8c4a45a0596', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-26 07:30:00', 'Grab', FALSE, FALSE, FALSE),
('7034c926-6c39-47da-a480-d8ce466d2439', '3c333333-3333-4333-a333-333333333331', 25000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-05-29 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE);

-- Phí giao lưu T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('140e7b40-c45c-4c2f-a07c-2eb78409e080', '3c333333-3333-4333-a333-333333333332', 600000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-05-04 20:00:00', 'Nhậu cuối tuần', FALSE, FALSE, FALSE),
('ad07da5d-1c7c-4047-96ca-85f6e1ca3071', '3c333333-3333-4333-a333-333333333332', 850000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-05-11 20:00:00', 'Cafe + karaoke', FALSE, FALSE, FALSE),
('a17577ec-94c7-4a23-b1d1-9d639ba54d02', '3c333333-3333-4333-a333-333333333332', 500000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-05-18 20:00:00', 'Bar cuối tuần', FALSE, FALSE, FALSE),
('9473b9f6-ff7b-4ab1-9ce7-9683c5886bbf', '3c333333-3333-4333-a333-333333333332', 700000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-05-25 20:00:00', 'Nhậu sinh nhật', FALSE, FALSE, FALSE);

-- Chi tiêu hàng ngày T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('9ba35953-4b30-40d5-9cfb-f3c4902652ec', '3c333333-3333-4333-a333-333333333332', 320000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-05-07 18:00:00', 'Bột giặt, nước xả', FALSE, FALSE, FALSE),
('421bd684-5c79-4fc7-8296-d8f967091bda', '3c333333-3333-4333-a333-333333333332', 450000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-05-15 17:00:00', 'Đồ dùng nhà cửa', FALSE, FALSE, FALSE),
('6b1d7149-fb00-4135-bea8-8381f63c9aee', '3c333333-3333-4333-a333-333333333332', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-05-22 18:00:00', 'Khăn mặt, bàn chải', FALSE, FALSE, FALSE);

-- Phí liên lạc T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('dfa0b3d2-7e54-485e-83a5-281fe85c2e19', '3c333333-3333-4333-a333-333333333332', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222234', '2026-05-15 10:00:00', 'Nạp điện thoại', FALSE, FALSE, FALSE);

-- Y tế T5
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('c25aca50-7720-420a-9515-1811ab167ae6', '3c333333-3333-4333-a333-333333333332', 350000, 'EXPENSE', '2b222222-2222-4222-a222-222222222226', '2026-05-10 16:00:00', 'Mua thuốc cảm', FALSE, FALSE, FALSE);

-- ============ THÁNG 6/2026 ============

-- Lương tháng 6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('3b4d7b42-5a88-47ab-872a-8752e689a911', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-06-05 09:00:00', 'Lương Tháng 6', FALSE, FALSE, FALSE);
-- Thưởng tháng 6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('1a866976-3a56-4ada-8147-da4229b94c24', '3c333333-3333-4333-a333-333333333332', 5000000, 'INCOME', '2b222222-2222-4222-a222-222222222229', '2026-06-15 14:30:00', 'Thưởng quý 2', FALSE, FALSE, FALSE);

-- Tiền nhà T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('93bf2f0a-595e-4489-971e-ebbac7811d45', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-06-10 08:00:00', 'Đóng tiền nhà', FALSE, FALSE, FALSE);
-- Tiền điện T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('7688376b-8ea6-4213-ad56-467da4cfb991', '3c333333-3333-4333-a333-333333333332', 900000, 'EXPENSE', '2b222222-2222-4222-a222-222222222224', '2026-06-12 10:00:00', 'Đóng tiền điện (hè nóng)', FALSE, FALSE, FALSE);

-- Ăn uống hàng ngày T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('4d3e36b7-5e1d-4484-8cfb-384e2735ba17', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-01 12:00:00', 'Phở bò + cafe', FALSE, FALSE, FALSE),
('bffbd07e-7ac0-41e3-8905-b9d08a693cc1', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-02 12:30:00', 'Cơm rang', FALSE, FALSE, FALSE),
('fbc843ff-224f-4f89-99df-8260f6bac2e0', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-03 12:00:00', 'Bún chả + trà sữa', FALSE, FALSE, FALSE),
('cb7cc9ea-289b-42f3-9a39-dfbf38f862c1', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-04 12:30:00', 'Phở gà', FALSE, FALSE, FALSE),
('328b48d6-5395-45ad-a946-6638d7e981e7', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-05 12:00:00', 'Cơm VP', FALSE, FALSE, FALSE),
('659724fa-f724-43a8-899d-d6bb29355b03', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-06 12:30:00', 'Bún riêu', FALSE, FALSE, FALSE),
('7d46cd26-d3ab-41e8-a1d6-98691ab17c39', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-07 12:00:00', 'Cơm trưa + tối', FALSE, FALSE, FALSE),
('fff1f014-e564-4704-9eee-4ff21d78052b', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-08 12:30:00', 'Bánh mì', FALSE, FALSE, FALSE),
('0c52a0e7-a870-4132-ba3e-3a82a40be42d', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-09 12:00:00', 'Bún bò + nước', FALSE, FALSE, FALSE),
('fe318130-e4f2-4abb-9717-ba6712a0755e', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-10 12:30:00', 'Cơm gà', FALSE, FALSE, FALSE),
('1e7bd8b4-2e23-4076-a3b3-598cbdc5850f', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-11 12:00:00', 'Phở cuốn', FALSE, FALSE, FALSE),
('9c3679b9-cf90-4107-a01e-01274770edd5', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-12 12:00:00', 'Lẩu trưa', FALSE, FALSE, FALSE),
('9f6f3171-c0c5-48f6-8706-d5c5be61f4ae', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-13 12:30:00', 'Bún thịt nướng', FALSE, FALSE, FALSE),
('20791bfc-6354-4ee4-9c4b-faadbe78c0d8', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-14 12:00:00', 'Cơm + trà', FALSE, FALSE, FALSE),
('220b70cb-31bf-414a-aa62-cb771b622197', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-15 12:30:00', 'Bánh cuốn', FALSE, FALSE, FALSE),
('138399f8-72fd-4e97-ab15-1fe4183129e6', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-16 12:00:00', 'Cơm rang dưa bò', FALSE, FALSE, FALSE),
('e566d857-afd2-4748-a496-7b2057d72ec8', '3c333333-3333-4333-a333-333333333331', 105000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-17 12:00:00', 'Phở bò + café', FALSE, FALSE, FALSE),
('bbde9ba8-7d6a-4921-a597-e03b75367664', '3c333333-3333-4333-a333-333333333331', 65000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-18 12:30:00', 'Bún ốc', FALSE, FALSE, FALSE),
('bed2a4d1-17a5-4f63-a17a-66d2f3c44c36', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-19 12:00:00', 'Cơm suất', FALSE, FALSE, FALSE),
('f1f4ab1e-f899-4666-9a2d-7d336fd8cb6d', '3c333333-3333-4333-a333-333333333331', 115000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-20 12:00:00', 'Buffet trưa', FALSE, FALSE, FALSE),
('21f2d08c-c19f-4f33-9262-d835c0f9b564', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-21 12:30:00', 'Mì quảng', FALSE, FALSE, FALSE),
('f904e9d5-fb67-4ddc-adde-b3c0c739b2e5', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-22 12:00:00', 'Cơm niêu', FALSE, FALSE, FALSE),
('85ef0e98-eb2f-428a-98bf-6ad9b8493b0a', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-23 12:30:00', 'Bún đậu', FALSE, FALSE, FALSE),
('b50f1a4f-5ae4-4452-bd31-99655d3a534f', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-24 12:00:00', 'Cơm + nước ép', FALSE, FALSE, FALSE),
('259dcceb-a333-4404-812c-6586f75ed15f', '3c333333-3333-4333-a333-333333333331', 75000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-25 12:00:00', 'Phở cuốn', FALSE, FALSE, FALSE),
('66c0b919-8e8c-40d9-8e07-92d59b9d82d7', '3c333333-3333-4333-a333-333333333331', 85000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-26 12:30:00', 'Bún chả', FALSE, FALSE, FALSE),
('92a20862-149d-40c6-9520-f07ebd8d3ae8', '3c333333-3333-4333-a333-333333333331', 55000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-27 12:00:00', 'Cơm bình dân', FALSE, FALSE, FALSE),
('1a74f836-b74f-409b-98b2-f1aa73671c44', '3c333333-3333-4333-a333-333333333331', 95000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-28 12:00:00', 'Bún bò Huế', FALSE, FALSE, FALSE),
('7d47cc9a-7cbd-4751-9f87-da74af7ff925', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-29 12:30:00', 'Cơm trưa tối', FALSE, FALSE, FALSE),
('77ae52ce-08a7-4f2a-ac71-e85baffb73a7', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-06-30 12:00:00', 'Phở + trà đá', FALSE, FALSE, FALSE);

-- Đi lại T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('733781c3-b1c9-45d9-b62b-56d0ebeb7793', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-02 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE),
('217062f3-a850-433b-9bb9-b655c5beb3be', '3c333333-3333-4333-a333-333333333331', 45000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-05 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('f59a5200-128c-40d0-93ad-5c5aedda24d8', '3c333333-3333-4333-a333-333333333331', 25000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-08 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE),
('650519c4-7b75-4ef7-b59f-41f827fcee57', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-11 08:00:00', 'Grab', FALSE, FALSE, FALSE),
('9b7a3d13-6b7b-450a-8bf4-f26e73b8f759', '3c333333-3333-4333-a333-333333333331', 40000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-14 07:30:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('85c1e5bd-2a59-49b5-bc29-3531668c4d89', '3c333333-3333-4333-a333-333333333331', 20000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-17 07:30:00', 'Xe buýt', FALSE, FALSE, FALSE),
('3f18c34e-6171-46b5-81f2-364a1e612577', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-20 08:00:00', 'Đổ xăng', FALSE, FALSE, FALSE),
('e838eba5-a5a1-4daf-86cf-0d9fc1237b68', '3c333333-3333-4333-a333-333333333331', 30000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-23 07:30:00', 'Grab', FALSE, FALSE, FALSE),
('8ccd91bb-af9c-42be-b25e-07354c5abbc7', '3c333333-3333-4333-a333-333333333331', 35000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-26 08:00:00', 'Xe ôm', FALSE, FALSE, FALSE),
('f419e3d6-242c-4c00-8612-0bb476c47083', '3c333333-3333-4333-a333-333333333331', 25000, 'EXPENSE', '2b222222-2222-4222-a222-222222222222', '2026-06-29 07:30:00', 'Grab đi làm', FALSE, FALSE, FALSE);

-- Phí giao lưu T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('26e7ddbf-91ed-4e3b-9589-2a8af47c7fb0', '3c333333-3333-4333-a333-333333333332', 550000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-06-06 20:00:00', 'Nhậu cuối tuần', FALSE, FALSE, FALSE),
('607aaa46-ec9e-45fc-8061-d74fb2f05188', '3c333333-3333-4333-a333-333333333332', 700000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-06-13 20:00:00', 'Karaoke sinh nhật', FALSE, FALSE, FALSE),
('a5978f8a-237f-4909-becc-13d316a3730d', '3c333333-3333-4333-a333-333333333332', 450000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-06-20 20:00:00', 'Cafe + phim', FALSE, FALSE, FALSE),
('78f5d5d2-cced-4a65-a613-e0aff3b3a00f', '3c333333-3333-4333-a333-333333333332', 600000, 'EXPENSE', '2b222222-2222-4222-a222-222222222227', '2026-06-27 20:00:00', 'BBQ cuối tháng', FALSE, FALSE, FALSE);

-- Chi tiêu hàng ngày T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('a378cff9-9944-4a95-a9a0-434ba0369ccf', '3c333333-3333-4333-a333-333333333332', 280000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-06-05 18:00:00', 'Đồ dùng cá nhân', FALSE, FALSE, FALSE),
('ffec3f7a-fa5c-439d-9bd6-bd95cda619c4', '3c333333-3333-4333-a333-333333333332', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-06-18 17:00:00', 'Bột giặt, nước rửa bát', FALSE, FALSE, FALSE),
('a5cafc9c-277f-41f4-9d04-6c226e359c3d', '3c333333-3333-4333-a333-333333333332', 400000, 'EXPENSE', '2b222222-2222-4222-a222-222222222225', '2026-06-25 18:00:00', 'Mua đồ Shopee', FALSE, FALSE, FALSE);

-- Y tế T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('444c3838-2557-41e1-9626-ed7cd4ba35be', '3c333333-3333-4333-a333-333333333332', 500000, 'EXPENSE', '2b222222-2222-4222-a222-222222222226', '2026-06-22 16:00:00', 'Khám tổng quát', FALSE, FALSE, FALSE);

-- Quần áo T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('555c3838-2557-41e1-9626-ed7cd4ba35be', '3c333333-3333-4333-a333-333333333332', 800000, 'EXPENSE', '2b222222-2222-4222-a222-222222222231', '2026-06-15 15:00:00', 'Áo sơ mi mới', FALSE, FALSE, FALSE);

-- Phí liên lạc T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('666c3838-2557-41e1-9626-ed7cd4ba35be', '3c333333-3333-4333-a333-333333333332', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222234', '2026-06-15 10:00:00', 'Nạp điện thoại', FALSE, FALSE, FALSE);

-- Giáo dục T6
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('777c3838-2557-41e1-9626-ed7cd4ba35be', '3c333333-3333-4333-a333-333333333332', 1500000, 'EXPENSE', '2b222222-2222-4222-a222-222222222233', '2026-06-08 09:00:00', 'Khóa học Udemy', FALSE, FALSE, FALSE);

-- ========================= 12. TRANSACTION TAGS =========================
INSERT INTO transaction_tags (transaction_id, tag_id) VALUES
('21358305-d19d-4869-8567-0ca837955628', '11a11111-1111-4111-a111-111111111111'),
('02861c6a-364a-4a33-a3e0-3a31426ef522', '11a11111-1111-4111-a111-111111111111'),
('3a211699-c5f8-4929-ba0a-91a58618534e', '11a11111-1111-4111-a111-111111111111'),
('637afdb8-de71-421b-b8f4-80d72ae7ac67', '11a11111-1111-4111-a111-111111111111'),
('93bf2f0a-595e-4489-971e-ebbac7811d45', '11a11111-1111-4111-a111-111111111111'),
('7688376b-8ea6-4213-ad56-467da4cfb991', '11a11111-1111-4111-a111-111111111111'),
('140e7b40-c45c-4c2f-a07c-2eb78409e080', '11a11111-1111-4111-a111-111111111113'),
('ad07da5d-1c7c-4047-96ca-85f6e1ca3071', '11a11111-1111-4111-a111-111111111113'),
('4324a85b-24ec-42d6-90d0-512b9b791c26', '11a11111-1111-4111-a111-111111111112'),
('4324a85b-24ec-42d6-90d0-512b9b791c26', '11a11111-1111-4111-a111-111111111113');

-- ========================= 13. BUDGETS =========================
-- Budget cho tháng hiện tại (7/2026) và các tháng trước
INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, due_day_of_month, is_mandatory, created_at) VALUES
-- Tháng 4
('14d11111-1111-4111-a111-111111111101', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222221', 'Ngân sách Ăn uống', 3000000, 4, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-04-01 08:00:00'),
('14d11111-1111-4111-a111-111111111102', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222222', 'Ngân sách Di chuyển', 500000, 4, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-04-01 08:00:00'),
('14d11111-1111-4111-a111-111111111103', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222223', 'Tiền nhà hàng tháng', 5000000, 4, 2026, 'BILL', TRUE, 10, TRUE, '2026-04-01 08:00:00'),
-- Tháng 5
('14d11111-1111-4111-a111-111111111104', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222221', 'Ngân sách Ăn uống', 3000000, 5, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-05-01 08:00:00'),
('14d11111-1111-4111-a111-111111111105', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222222', 'Ngân sách Di chuyển', 500000, 5, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-05-01 08:00:00'),
('14d11111-1111-4111-a111-111111111106', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222223', 'Tiền nhà hàng tháng', 5000000, 5, 2026, 'BILL', TRUE, 10, TRUE, '2026-05-01 08:00:00'),
-- Tháng 6
('14d11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222221', 'Ngân sách Ăn uống', 3000000, 6, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-06-01 08:00:00'),
('14d11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222222', 'Ngân sách Di chuyển', 500000, 6, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-06-01 08:00:00'),
('14d11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222223', 'Tiền nhà hàng tháng', 5000000, 6, 2026, 'BILL', TRUE, 10, TRUE, '2026-06-01 08:00:00'),
-- Tháng 7 (hiện tại)
('14d11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222221', 'Ngân sách Ăn uống', 3000000, 7, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-07-01 08:00:00'),
('14d11111-1111-4111-a111-111111111115', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222222', 'Ngân sách Di chuyển', 500000, 7, 2026, 'FLEXIBLE', FALSE, NULL, FALSE, '2026-07-01 08:00:00'),
('14d11111-1111-4111-a111-111111111116', '1a111111-1111-4111-a111-111111111111', '2b222222-2222-4222-a222-222222222223', 'Tiền nhà hàng tháng', 5000000, 7, 2026, 'BILL', TRUE, 10, TRUE, '2026-07-01 08:00:00');

-- ========================= 14. SAVINGS GOALS =========================
INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, status, deadline_date, created_at, updated_at) VALUES
('17a11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', 'Mua iPhone 16', 30000000, 15000000, 'IN_PROGRESS', '2026-12-31', '2026-03-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 'Quỹ Khẩn cấp', 50000000, 50000000, 'COMPLETED', NULL, '2026-01-01 08:00:00', '2026-05-01 08:00:00'),
('17a11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', 'Du lịch Châu Âu', 100000000, 25000000, 'IN_PROGRESS', '2027-06-30', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', 'Mua xe máy', 45000000, 10000000, 'IN_PROGRESS', '2026-12-31', '2026-03-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111115', '1a111111-1111-4111-a111-111111111111', 'Học Thạc sĩ', 80000000, 40000000, 'IN_PROGRESS', '2027-12-31', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111116', '1a111111-1111-4111-a111-111111111111', 'Quỹ Đám cưới', 150000000, 75000000, 'IN_PROGRESS', '2028-06-30', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111117', '1a111111-1111-4111-a111-111111111111', 'Đổi Laptop', 25000000, 25000000, 'COMPLETED', NULL, '2026-02-01 08:00:00', '2026-04-15 08:00:00'),
('17a11111-1111-4111-a111-111111111118', '1a111111-1111-4111-a111-111111111111', 'Tiết kiệm nhà', 500000000, 100000000, 'IN_PROGRESS', '2030-12-31', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111119', '1a111111-1111-4111-a111-111111111111', 'Mua máy ảnh', 15000000, 5000000, 'IN_PROGRESS', '2026-09-30', '2026-04-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111120', '1a111111-1111-4111-a111-111111111111', 'Chữa bệnh Răng', 10000000, 10000000, 'COMPLETED', NULL, '2026-03-01 08:00:00', '2026-05-20 08:00:00');

-- ========================= 15. EXTERNAL LOANS =========================
INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled, created_at, updated_at) VALUES
('18b11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', 'BORROWED', 'FE Credit', 5000000, 0, '2026-01-10', '2026-12-10', 'Vay trả góp điện thoại', false, '2026-01-10 08:00:00', '2026-01-10 08:00:00'),
('18b11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 'LENT', 'Hùng Béo', 2000000, 0, '2026-05-15', '2026-07-15', 'Cho bạn mượn đỡ', false, '2026-05-15 08:00:00', '2026-05-15 08:00:00'),
('18b11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', 'BORROWED', 'Thẻ Tín Dụng VIB', 3000000, 2.5, '2026-06-01', '2026-07-15', 'Cà thẻ mua laptop', false, '2026-06-01 08:00:00', '2026-06-01 08:00:00'),
('18b11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', 'LENT', 'Em gái', 1000000, 0, '2026-04-20', '2026-05-20', 'Cho em mượn tiền học', true, '2026-04-20 08:00:00', '2026-05-20 08:00:00');

-- ========================= 16. NOTIFICATIONS =========================
INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES
('19c11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', 'Hóa đơn Tiền điện sẽ đến hạn vào ngày mai.', 'BILL_ALERT', FALSE, '2026-07-06 08:00:00'),
('19c11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 'Bạn đã tiêu 80% ngân sách Ăn uống tháng này.', 'BUDGET_WARNING', FALSE, '2026-07-05 14:00:00'),
('19c11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', 'Chúc mừng! Bạn đã hoàn thành mục tiêu Quỹ Khẩn cấp.', 'SAVINGS_GOAL', TRUE, '2026-05-01 09:00:00'),
('19c11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', 'Trần Thị B vừa thêm 1 khoản chi 600k vào nhóm Phòng Trọ.', 'DEBT_REMINDER', FALSE, '2026-06-05 10:00:00'),
('19c11111-1111-4111-a111-111111111115', '1a111111-1111-4111-a111-111111111111', 'Bạn đã nhận được 300k từ Trần Thị B.', 'PAYMENT_SUCCESS', TRUE, '2026-05-10 15:30:00'),
('19c11111-1111-4111-a111-111111111116', '1a111111-1111-4111-a111-111111111111', '🚨 Cảnh báo: Giao dịch Ăn uống 5,000,000₫ vượt ngưỡng bất thường!', 'SPENDING_ANOMALY', FALSE, '2026-05-20 21:05:00'),
('19c11111-1111-4111-a111-111111111117', '1a111111-1111-4111-a111-111111111111', 'Hóa đơn tiền mạng tháng 6 đã được tạo tự động.', 'BILL_CREATED', TRUE, '2026-06-01 08:00:00'),
('19c11111-1111-4111-a111-111111111118', '1a111111-1111-4111-a111-111111111111', 'Tình trạng tài chính của bạn tuần này: Khá tốt.', 'SYSTEM', TRUE, '2026-06-29 08:00:00'),
('19c11111-1111-4111-a111-111111111119', '1a111111-1111-4111-a111-111111111111', 'Hoàng Thị E vừa được thêm vào nhóm Ăn Trưa Công Ty.', 'GROUP_UPDATE', FALSE, '2026-03-10 11:00:00'),
('19c11111-1111-4111-a111-111111111120', '1a111111-1111-4111-a111-111111111111', 'Em gái đã trả xong khoản nợ 1,000,000₫.', 'DEBT_SETTLED', TRUE, '2026-05-20 09:00:00');

-- ============================================================================
-- HOÀN TẤT! 
-- Đăng nhập: nguyenvana@gmail.com / 123456
-- ============================================================================
