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
    created_by UUID NOT NULL REFERENCES users(id),
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
('1a111111-1111-4111-a111-111111111111', 'nguyenvana@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn A', '0901234567', 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff', '970422', '0901234567', '2025-07-01 08:00:00'),
('1a111111-1111-4111-a111-111111111112', 'tranthib@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Trần Thị B', '0902345678', 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1a111111-1111-4111-a111-111111111113', 'lethic@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Lê Thị C', '0903456789', 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1a111111-1111-4111-a111-111111111114', 'phamvand@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Phạm Văn D', '0904567890', 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1a111111-1111-4111-a111-111111111115', 'hoangthie@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Hoàng Thị E', '0905678901', 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff', NULL, NULL, '2026-03-15 08:00:00');

-- ========================= 2. WALLETS =========================
-- Ví chính cho User A (Nguyễn Văn A) - đây là user demo chính
INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES
('3c333333-3333-4333-a333-333333333331', '1a111111-1111-4111-a111-111111111111', 'Tiền mặt', 2350000, 'VND', false, '2025-07-01 08:00:00'),
('3c333333-3333-4333-a333-333333333332', '1a111111-1111-4111-a111-111111111111', 'Techcombank', 15500000, 'VND', false, '2025-07-01 08:00:00');
-- Ví cho các user khác
INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES
('3c333333-3333-4333-a333-333333333341', '1a111111-1111-4111-a111-111111111112', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('3c333333-3333-4333-a333-333333333342', '1a111111-1111-4111-a111-111111111113', 'Tiền mặt', 3000000, 'VND', false, '2025-07-01 08:00:00'),
('3c333333-3333-4333-a333-333333333343', '1a111111-1111-4111-a111-111111111114', 'Tiền mặt', 4000000, 'VND', false, '2025-07-01 08:00:00'),
('3c333333-3333-4333-a333-333333333344', '1a111111-1111-4111-a111-111111111115', 'Tiền mặt', 6000000, 'VND', false, '2025-07-01 08:00:00');

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
INSERT INTO groups (id, name, description, created_by, created_at) VALUES
('4d444444-4444-4444-a444-444444444441', 'Phòng Trọ 302', 'Tiền nhà hàng tháng', '1a111111-1111-4111-a111-111111111111', '2025-07-01 10:00:00'),
('4d444444-4444-4444-a444-444444444442', 'Du Lịch Đà Lạt', 'Chuyến đi tháng 5', '1a111111-1111-4111-a111-111111111112', '2026-04-15 10:00:00'),
('4d444444-4444-4444-a444-444444444443', 'Ăn Trưa Công Ty', 'Hội cơm hộp', '1a111111-1111-4111-a111-111111111113', '2026-03-10 10:00:00');

-- ========================= 7. GROUP MEMBERS =========================
INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES
-- Nhóm Phòng Trọ: A (owner) + B
('5e555555-5555-4555-a555-555555555551', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111111', 'owner', '2025-07-01 10:00:00'),
('5e555555-5555-4555-a555-555555555552', '4d444444-4444-4444-a444-444444444441', '1a111111-1111-4111-a111-111111111112', 'member', '2025-07-01 10:00:00'),
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
('17a11111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', 'Mua iPhone 16', 30000000, 15000000, 'IN_PROGRESS', '2026-12-31', '2025-07-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111112', '1a111111-1111-4111-a111-111111111111', 'Quỹ Khẩn cấp', 50000000, 50000000, 'COMPLETED', NULL, '2026-01-01 08:00:00', '2026-05-01 08:00:00'),
('17a11111-1111-4111-a111-111111111113', '1a111111-1111-4111-a111-111111111111', 'Du lịch Châu Âu', 100000000, 25000000, 'IN_PROGRESS', '2027-06-30', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111114', '1a111111-1111-4111-a111-111111111111', 'Mua xe máy', 45000000, 10000000, 'IN_PROGRESS', '2026-12-31', '2025-07-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111115', '1a111111-1111-4111-a111-111111111111', 'Học Thạc sĩ', 80000000, 40000000, 'IN_PROGRESS', '2027-12-31', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111116', '1a111111-1111-4111-a111-111111111111', 'Quỹ Đám cưới', 150000000, 75000000, 'IN_PROGRESS', '2028-06-30', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111117', '1a111111-1111-4111-a111-111111111111', 'Đổi Laptop', 25000000, 25000000, 'COMPLETED', NULL, '2026-02-01 08:00:00', '2026-04-15 08:00:00'),
('17a11111-1111-4111-a111-111111111118', '1a111111-1111-4111-a111-111111111111', 'Tiết kiệm nhà', 500000000, 100000000, 'IN_PROGRESS', '2030-12-31', '2026-01-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111119', '1a111111-1111-4111-a111-111111111111', 'Mua máy ảnh', 15000000, 5000000, 'IN_PROGRESS', '2026-09-30', '2026-04-01 08:00:00', '2026-06-30 08:00:00'),
('17a11111-1111-4111-a111-111111111120', '1a111111-1111-4111-a111-111111111111', 'Chữa bệnh Răng', 10000000, 10000000, 'COMPLETED', NULL, '2025-07-01 08:00:00', '2026-05-20 08:00:00');

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

-- ========================= BỔ SUNG DỮ LIỆU ĐỂ ĐÚNG YÊU CẦU =========================

-- TẠO CATEGORIES CHO CÁC USER KHÁC
INSERT INTO categories (id, user_id, name, type, icon_name) VALUES
('322e9458-d09d-40ab-8858-db948ef7febc', '1a111111-1111-4111-a111-111111111112', 'Tiền lương', 'INCOME', '💰'),
('df439c4c-5da3-4319-a5e2-198163c2b3b9', '1a111111-1111-4111-a111-111111111112', 'Ăn uống', 'EXPENSE', '🍽️'),
('33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '1a111111-1111-4111-a111-111111111112', 'Đi lại', 'EXPENSE', '🚆'),
('b45fadee-eeca-45ee-852e-6078dbd6ef22', '1a111111-1111-4111-a111-111111111113', 'Tiền lương', 'INCOME', '💰'),
('d26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '1a111111-1111-4111-a111-111111111113', 'Ăn uống', 'EXPENSE', '🍽️'),
('69223f6c-2fd6-4f63-9f59-af40e224d41d', '1a111111-1111-4111-a111-111111111113', 'Đi lại', 'EXPENSE', '🚆'),
('1b869975-e047-46e5-973b-6f8edccafa45', '1a111111-1111-4111-a111-111111111114', 'Tiền lương', 'INCOME', '💰'),
('7d40a459-7716-46e0-b181-60c48c42200b', '1a111111-1111-4111-a111-111111111114', 'Ăn uống', 'EXPENSE', '🍽️'),
('690c7a57-e589-41b9-8a56-9525397397f3', '1a111111-1111-4111-a111-111111111114', 'Đi lại', 'EXPENSE', '🚆'),
('32138d2b-f1f8-4ea3-a588-94030b3a843c', '1a111111-1111-4111-a111-111111111115', 'Tiền lương', 'INCOME', '💰'),
('b01c74e9-46f5-41c5-9497-ce1f3cd24022', '1a111111-1111-4111-a111-111111111115', 'Ăn uống', 'EXPENSE', '🍽️'),
('3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '1a111111-1111-4111-a111-111111111115', 'Đi lại', 'EXPENSE', '🚆');

-- 3 THÁNG DỮ LIỆU GẦN NHẤT (THÁNG 4,5,6/2026) CHO MỌI USER KHÁC
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('05adb7e4-2784-42cc-8a86-4cb360993214', '3c333333-3333-4333-a333-333333333341', 15000000, 'INCOME', '322e9458-d09d-40ab-8858-db948ef7febc', '2026-04-05 09:00:00', 'Lương Tháng 4', FALSE, FALSE, FALSE),
('ff58b834-76e5-4b9b-972e-c59c372377c9', '3c333333-3333-4333-a333-333333333341', 130000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-08 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('dd818ad0-021f-4b24-8335-2bc82b047639', '3c333333-3333-4333-a333-333333333341', 70000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('96b44066-ff90-45f2-8491-2d5e9a29f99d', '3c333333-3333-4333-a333-333333333341', 150000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2cd96412-fd0d-407e-b336-51babc3a84b7', '3c333333-3333-4333-a333-333333333341', 170000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-08 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('53927bc5-bbe5-4ac2-8d68-b9b530620852', '3c333333-3333-4333-a333-333333333341', 60000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('407c5052-6b4e-4606-a7e3-0b38e2fa4900', '3c333333-3333-4333-a333-333333333341', 70000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-23 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('b2c620df-54ff-4d84-b197-922df3e71819', '3c333333-3333-4333-a333-333333333341', 120000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-05 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('a2590986-4f11-4fe7-b1f7-372cbda23756', '3c333333-3333-4333-a333-333333333341', 80000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-04-09 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c7cae687-dc21-4eae-8c39-cda6a26bd9d7', '3c333333-3333-4333-a333-333333333341', 100000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-04-21 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('d7d6f015-9b54-4313-8f39-97d62f4d52ee', '3c333333-3333-4333-a333-333333333341', 50000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-04-20 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('5aa49333-35ec-418e-88e2-018f34cdf7dd', '3c333333-3333-4333-a333-333333333341', 70000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-04-16 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('2e39273d-cfab-4ee6-9ff4-3fa833060790', '3c333333-3333-4333-a333-333333333341', 30000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-04-15 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('50682b49-f1fc-4ee9-964a-ea24dc065cd4', '3c333333-3333-4333-a333-333333333341', 15000000, 'INCOME', '322e9458-d09d-40ab-8858-db948ef7febc', '2026-05-05 09:00:00', 'Lương Tháng 5', FALSE, FALSE, FALSE),
('20a36896-096d-4796-a644-90154083916e', '3c333333-3333-4333-a333-333333333341', 110000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-16 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('7099332c-3e6d-4d3e-a3ab-74e5380b8c9f', '3c333333-3333-4333-a333-333333333341', 120000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-27 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ae8a3cd4-da1c-437c-83c1-fabd52310f2a', '3c333333-3333-4333-a333-333333333341', 50000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('4f2477ef-45e1-462e-becf-a471b451c02d', '3c333333-3333-4333-a333-333333333341', 170000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-18 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('f1c021e3-c1dd-49c1-9709-b41b7c3ff03a', '3c333333-3333-4333-a333-333333333341', 140000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('527f1973-91b1-48a5-9071-75a382151c6f', '3c333333-3333-4333-a333-333333333341', 130000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-15 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('136ccb19-426c-4da3-93d3-8de54821111f', '3c333333-3333-4333-a333-333333333341', 100000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('096f6ac5-dc89-4150-8a26-93b1ad6b0d34', '3c333333-3333-4333-a333-333333333341', 150000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-05-04 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('abecdac2-f23e-4aea-8327-188694f66088', '3c333333-3333-4333-a333-333333333341', 90000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-05-20 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('914a0ddb-a7c1-47ed-b2f0-6456ed109cd7', '3c333333-3333-4333-a333-333333333341', 80000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-05-17 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('3b813a6e-410a-475f-86d6-88901ab01809', '3c333333-3333-4333-a333-333333333341', 40000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-05-10 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('bda3ad21-5658-4790-8481-fd9d12ad0e11', '3c333333-3333-4333-a333-333333333341', 40000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-05-09 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('1b2ea15c-0545-4b78-bef6-47e10d5e1552', '3c333333-3333-4333-a333-333333333341', 30000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-05-15 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('fceb9efa-a1bc-45d1-b2e2-cf3827635c87', '3c333333-3333-4333-a333-333333333341', 15000000, 'INCOME', '322e9458-d09d-40ab-8858-db948ef7febc', '2026-06-05 09:00:00', 'Lương Tháng 6', FALSE, FALSE, FALSE),
('13c6d65b-1090-4fd6-ad4a-a3d25bdfd2ee', '3c333333-3333-4333-a333-333333333341', 50000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-19 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('3c7f5004-94ea-4871-9224-8d144a99196c', '3c333333-3333-4333-a333-333333333341', 120000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-15 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('994a332a-bb7a-4ad4-9cc4-61a40f664371', '3c333333-3333-4333-a333-333333333341', 110000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-05 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('f3185390-52c2-4a22-84eb-185e839369a7', '3c333333-3333-4333-a333-333333333341', 100000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-10 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2bb51dfe-8667-4818-bf5f-09facfcba056', '3c333333-3333-4333-a333-333333333341', 100000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-03 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('79a66dd6-025b-41e2-8278-250075245ad4', '3c333333-3333-4333-a333-333333333341', 140000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-17 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('967b8a55-1bb9-42b7-91c8-ace14258cfee', '3c333333-3333-4333-a333-333333333341', 140000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('6a56213d-b421-44b0-9a58-6b7b9d4800f6', '3c333333-3333-4333-a333-333333333341', 100000, 'EXPENSE', 'df439c4c-5da3-4319-a5e2-198163c2b3b9', '2026-06-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('623d011b-d0bd-4c2c-b350-70f6164609ef', '3c333333-3333-4333-a333-333333333341', 80000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-06-06 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('792cbbdc-4bae-4dee-b2e5-563b8dd9fa81', '3c333333-3333-4333-a333-333333333341', 60000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-06-09 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('09f8feb7-33d7-420b-91a3-0353397c2618', '3c333333-3333-4333-a333-333333333341', 40000, 'EXPENSE', '33b081bd-c4c5-4ac4-b563-f05e5f0efd9b', '2026-06-15 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('9f80a661-51a3-44da-93d3-cf1658c967aa', '3c333333-3333-4333-a333-333333333342', 15000000, 'INCOME', 'b45fadee-eeca-45ee-852e-6078dbd6ef22', '2026-04-05 09:00:00', 'Lương Tháng 4', FALSE, FALSE, FALSE),
('8280ff0c-08f4-4295-910c-350ae98ad6a4', '3c333333-3333-4333-a333-333333333342', 120000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('58e3a403-bc4d-4205-a213-ca9337df460a', '3c333333-3333-4333-a333-333333333342', 160000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-23 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('752f9ca0-f373-45e5-8ff4-69fe226368e0', '3c333333-3333-4333-a333-333333333342', 160000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-09 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('f944b818-bc6b-447e-bf4e-e8c5b5f5ee6b', '3c333333-3333-4333-a333-333333333342', 90000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-09 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('6a342edc-571e-45ad-a301-30bef1eb5eff', '3c333333-3333-4333-a333-333333333342', 60000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-10 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('4f2db5f1-043f-4cf3-ab47-b76428b836fd', '3c333333-3333-4333-a333-333333333342', 160000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('44766be8-edfe-4d97-af81-f22da2ee690b', '3c333333-3333-4333-a333-333333333342', 150000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-08 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('bf4902c6-2405-45c5-b64c-9c90572fc6b6', '3c333333-3333-4333-a333-333333333342', 180000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('7c11a556-ee36-40c6-96fd-b31d397d988f', '3c333333-3333-4333-a333-333333333342', 200000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-04-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('9ef5b12f-d7aa-43f5-ae18-951b701f8da6', '3c333333-3333-4333-a333-333333333342', 30000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-04-27 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('acc59180-cedf-4c01-8e9d-e07caa4fc4c6', '3c333333-3333-4333-a333-333333333342', 40000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-04-02 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('c741ab0c-28ff-4e0a-ba09-b7d7db998989', '3c333333-3333-4333-a333-333333333342', 100000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-04-05 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('5c5d07f5-6944-4b6f-8580-9c6491001a63', '3c333333-3333-4333-a333-333333333342', 30000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-04-25 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('e2add013-0fbb-4128-a75e-32b11541eae7', '3c333333-3333-4333-a333-333333333342', 30000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-04-12 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('5e19363a-0da6-40b3-b67d-096fbcce74fa', '3c333333-3333-4333-a333-333333333342', 15000000, 'INCOME', 'b45fadee-eeca-45ee-852e-6078dbd6ef22', '2026-05-05 09:00:00', 'Lương Tháng 5', FALSE, FALSE, FALSE),
('c7fb8068-c2a5-4570-bfb1-412da0dbac03', '3c333333-3333-4333-a333-333333333342', 80000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-02 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('e849c4cf-e7c4-4e27-8a65-779e12eae5be', '3c333333-3333-4333-a333-333333333342', 90000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-12 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('d3af1177-cfd3-4bc4-b3f7-311eea1978b9', '3c333333-3333-4333-a333-333333333342', 190000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-06 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ebd90630-018a-4f00-8a2c-4e24b865d08b', '3c333333-3333-4333-a333-333333333342', 130000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2c762b25-0806-48f6-92f1-999417419173', '3c333333-3333-4333-a333-333333333342', 80000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('5567b4df-82a5-40e0-bedf-d002ead1c45f', '3c333333-3333-4333-a333-333333333342', 130000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-10 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ed175ee5-a5c1-4d99-b291-77a9d548c88d', '3c333333-3333-4333-a333-333333333342', 150000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-19 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('1f2d1b7c-8b67-4ebb-968b-5946474169c1', '3c333333-3333-4333-a333-333333333342', 150000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-05-09 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('1940725b-7ad0-40b5-ab08-407ce2e090c4', '3c333333-3333-4333-a333-333333333342', 70000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-05-06 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('f811ab8f-b5a1-4466-a77e-93550daac932', '3c333333-3333-4333-a333-333333333342', 100000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-05-03 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('3dac74e8-9ef7-4435-92c1-e5e32605d2fc', '3c333333-3333-4333-a333-333333333342', 60000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-05-04 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('7081e3ed-c42f-4c8c-a270-7709932bc619', '3c333333-3333-4333-a333-333333333342', 90000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-05-04 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('e0b6de3f-2518-4087-9aae-0b48deac0e24', '3c333333-3333-4333-a333-333333333342', 15000000, 'INCOME', 'b45fadee-eeca-45ee-852e-6078dbd6ef22', '2026-06-05 09:00:00', 'Lương Tháng 6', FALSE, FALSE, FALSE),
('886ac7f1-608b-4d49-bc9f-9e3110778533', '3c333333-3333-4333-a333-333333333342', 160000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-25 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('d0ba1900-0151-4d3c-9227-d6318a2ff2c6', '3c333333-3333-4333-a333-333333333342', 130000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-11 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c844de4c-70b0-485f-b357-7c0b134449a0', '3c333333-3333-4333-a333-333333333342', 180000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-21 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('80f25a3b-27a1-4950-a768-a006e8f4c84b', '3c333333-3333-4333-a333-333333333342', 130000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-01 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ad61bb16-8d21-4599-bcf9-ae54da869d41', '3c333333-3333-4333-a333-333333333342', 170000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-21 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('915e3425-a4f6-4cb4-bab1-dda6dde284ce', '3c333333-3333-4333-a333-333333333342', 90000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c10f4063-f6a7-4dee-823b-96f355ffabab', '3c333333-3333-4333-a333-333333333342', 150000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-07 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2d6e8a6c-c9df-43d1-a543-b2818eb0a1f8', '3c333333-3333-4333-a333-333333333342', 130000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-14 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2b88c9bf-24a9-4ab6-9894-44fd0b6438a6', '3c333333-3333-4333-a333-333333333342', 180000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-07 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c8d9527e-c6aa-4b8f-8c10-3126d7eb256d', '3c333333-3333-4333-a333-333333333342', 200000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('f02ec352-cf5e-41c4-883e-e9d950c97317', '3c333333-3333-4333-a333-333333333342', 190000, 'EXPENSE', 'd26b73aa-b5dc-4662-bbcc-aa910ec9d76d', '2026-06-12 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('6870376b-c441-45a5-a903-6fcd022c1736', '3c333333-3333-4333-a333-333333333342', 80000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-06-15 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('30a74029-8ca1-4110-9b6f-32b9f424a0f3', '3c333333-3333-4333-a333-333333333342', 40000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-06-22 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('c924b63a-be77-413f-ac83-1ad246134d8a', '3c333333-3333-4333-a333-333333333342', 60000, 'EXPENSE', '69223f6c-2fd6-4f63-9f59-af40e224d41d', '2026-06-09 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('22751c43-f495-4cea-afbe-bd6d91e2db9e', '3c333333-3333-4333-a333-333333333343', 15000000, 'INCOME', '1b869975-e047-46e5-973b-6f8edccafa45', '2026-04-05 09:00:00', 'Lương Tháng 4', FALSE, FALSE, FALSE),
('b00f97fa-421e-4a57-b297-3a2f495e4cb6', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-03 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('b9c877e7-cb03-4edb-ab01-8c304da51a4f', '3c333333-3333-4333-a333-333333333343', 190000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-20 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('6a986f67-eb23-4488-acdd-8632e44a3fa5', '3c333333-3333-4333-a333-333333333343', 110000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-23 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('0f2af913-7b06-4f5d-889f-3a35e5913e41', '3c333333-3333-4333-a333-333333333343', 120000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('baa5f3a1-2861-4937-bbb8-94901372c8d4', '3c333333-3333-4333-a333-333333333343', 160000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('418e0fb0-ff22-4d28-bb58-6de350bdb2ce', '3c333333-3333-4333-a333-333333333343', 150000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-21 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('14ebbb5f-00d0-40f5-9dde-b7391b80fccd', '3c333333-3333-4333-a333-333333333343', 80000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('d1bc2c01-0821-43ca-89c8-5e2d9b2e7f84', '3c333333-3333-4333-a333-333333333343', 130000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-04-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('55b4d9c3-f4fc-43b7-b6ca-07cd6905717f', '3c333333-3333-4333-a333-333333333343', 60000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-04-20 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('a6f13fe1-4b6b-43c9-a583-b07e5e2aa8cc', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-04-14 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('271b6145-f50c-47a1-8410-82799a185ddc', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-04-03 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('e9066ed7-335a-4b27-9aaa-5957144e8ae4', '3c333333-3333-4333-a333-333333333343', 15000000, 'INCOME', '1b869975-e047-46e5-973b-6f8edccafa45', '2026-05-05 09:00:00', 'Lương Tháng 5', FALSE, FALSE, FALSE),
('fe6a70b7-145d-4485-9c36-e520aba88b96', '3c333333-3333-4333-a333-333333333343', 190000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-14 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('796ba6fc-796f-44b2-8a52-31c5f7c2fa46', '3c333333-3333-4333-a333-333333333343', 120000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-12 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('3d6d5f63-f39a-474c-8046-a92a79eb9ffd', '3c333333-3333-4333-a333-333333333343', 170000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-01 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('fdd20804-6a29-451c-898e-02199e1d6a26', '3c333333-3333-4333-a333-333333333343', 160000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-02 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('91d804a6-8cbf-40fe-b91f-5239b34855f3', '3c333333-3333-4333-a333-333333333343', 80000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-18 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('984ca68b-dec3-4af6-9254-212a3f705078', '3c333333-3333-4333-a333-333333333343', 110000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('cf14b9e8-457b-4a90-9c63-5f29ec0ea464', '3c333333-3333-4333-a333-333333333343', 130000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c0f331c9-4228-4683-b92e-a6ae573d277b', '3c333333-3333-4333-a333-333333333343', 60000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-18 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('4aeddaa6-9ecc-44c4-8315-c14a52860e3b', '3c333333-3333-4333-a333-333333333343', 60000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('0ca69f9a-e3d5-4230-8d11-77e074e74fd3', '3c333333-3333-4333-a333-333333333343', 160000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-05-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('b321a2e5-b700-487b-8f51-dd840487c348', '3c333333-3333-4333-a333-333333333343', 100000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-05-21 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('bccb8ab0-712a-4d22-9f25-94cbab426f18', '3c333333-3333-4333-a333-333333333343', 80000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-05-06 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('7b2a8e2b-ec42-4c3e-b3d0-8ad4d5b18a2e', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-05-18 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('45c9649f-5cd4-4b37-bb33-d6cdc1f3cac9', '3c333333-3333-4333-a333-333333333343', 100000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-05-25 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('218d0de4-f46e-4bd4-8243-9ebf3d3c7ce2', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-05-09 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('56df0587-35e3-474d-a730-32022008c8da', '3c333333-3333-4333-a333-333333333343', 15000000, 'INCOME', '1b869975-e047-46e5-973b-6f8edccafa45', '2026-06-05 09:00:00', 'Lương Tháng 6', FALSE, FALSE, FALSE),
('213c0e6e-b219-457b-b2d7-374e5b0546fb', '3c333333-3333-4333-a333-333333333343', 100000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-10 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('e6dc049c-dfc1-49f8-b06d-32a70a60774a', '3c333333-3333-4333-a333-333333333343', 200000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-10 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('bb9e720f-f076-4f2e-8ebe-4665e44440d9', '3c333333-3333-4333-a333-333333333343', 150000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('68678b9b-551c-47c1-9efa-f375fb6e7da0', '3c333333-3333-4333-a333-333333333343', 190000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-06 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('47b78b56-0711-4bcb-9d50-ebfa53425552', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-24 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('4571d9ac-d5de-4635-a690-2bf0fe37336e', '3c333333-3333-4333-a333-333333333343', 50000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('b27e9abe-6ea0-425e-8d4c-9d696ad7a0cc', '3c333333-3333-4333-a333-333333333343', 80000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-21 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('afa8bf4f-16e3-4b5f-bae7-a2e567cd650a', '3c333333-3333-4333-a333-333333333343', 60000, 'EXPENSE', '7d40a459-7716-46e0-b181-60c48c42200b', '2026-06-07 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ab88211d-0305-4e51-824c-f20b9637defe', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-06-15 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('9c8d49fc-7522-470a-9fc6-d3462a6694f1', '3c333333-3333-4333-a333-333333333343', 70000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-06-17 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('b25c6cc2-1543-4d16-a7ec-b88a5276e643', '3c333333-3333-4333-a333-333333333343', 90000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-06-21 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('af213635-bf71-477a-ac56-59edd9c1575d', '3c333333-3333-4333-a333-333333333343', 40000, 'EXPENSE', '690c7a57-e589-41b9-8a56-9525397397f3', '2026-06-07 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('dd5a6dcc-e26b-4bf3-9238-6974848c0414', '3c333333-3333-4333-a333-333333333344', 15000000, 'INCOME', '32138d2b-f1f8-4ea3-a588-94030b3a843c', '2026-04-05 09:00:00', 'Lương Tháng 4', FALSE, FALSE, FALSE),
('ba50388c-5e1b-4a80-b219-3a4d7cd3efdc', '3c333333-3333-4333-a333-333333333344', 50000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-03 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('cd2c9bca-781d-4ef4-8463-2f0c33cbd12f', '3c333333-3333-4333-a333-333333333344', 200000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-25 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('5a9cf67b-cc91-45af-a0f6-ea66d9b67695', '3c333333-3333-4333-a333-333333333344', 140000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('7e3bf4f9-3c59-4ad7-845b-d297727834da', '3c333333-3333-4333-a333-333333333344', 130000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-12 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('e38fce5c-58fe-40e3-bd5a-94ce525e2a50', '3c333333-3333-4333-a333-333333333344', 120000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-20 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('3e69fb43-0ffa-4899-9ee2-fb1c11613c5a', '3c333333-3333-4333-a333-333333333344', 160000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('ea80a078-b6da-4247-b7a8-2dafbd20ec5f', '3c333333-3333-4333-a333-333333333344', 190000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-18 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('899522ad-f9f4-4902-8e53-c729cdc9fd0c', '3c333333-3333-4333-a333-333333333344', 50000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-28 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('47ef9575-d400-462f-8cca-9851a5e571db', '3c333333-3333-4333-a333-333333333344', 140000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-17 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('824b7ee7-f9f4-4778-b18d-c493723424cf', '3c333333-3333-4333-a333-333333333344', 150000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-04-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('9b787992-395b-4c91-b6f6-fed8aca31835', '3c333333-3333-4333-a333-333333333344', 50000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-04-10 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('ff064c3c-626c-4290-8b00-9ccdfbb578df', '3c333333-3333-4333-a333-333333333344', 60000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-04-20 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('1b054151-d4ef-4b57-b12f-8d9fe203c0c1', '3c333333-3333-4333-a333-333333333344', 40000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-04-25 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('6f935289-c5f8-44a0-be71-0c4e016acf0d', '3c333333-3333-4333-a333-333333333344', 40000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-04-18 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('b09e2e46-40b4-4384-979c-5dc8003f479a', '3c333333-3333-4333-a333-333333333344', 15000000, 'INCOME', '32138d2b-f1f8-4ea3-a588-94030b3a843c', '2026-05-05 09:00:00', 'Lương Tháng 5', FALSE, FALSE, FALSE),
('a166c694-a859-4ad1-a82a-12eaa90109f2', '3c333333-3333-4333-a333-333333333344', 120000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-18 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('92c571d4-2ce6-4811-8180-12e35432e726', '3c333333-3333-4333-a333-333333333344', 190000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-15 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('c2907883-ab76-48ff-ac69-41482b436f1c', '3c333333-3333-4333-a333-333333333344', 130000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2e8c0422-c703-4f0e-9641-dab21ab93415', '3c333333-3333-4333-a333-333333333344', 180000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-26 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('d339b098-7b18-423d-8777-0994da4c896b', '3c333333-3333-4333-a333-333333333344', 170000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-09 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('7f63128e-3004-432e-a1df-09cc0d10f029', '3c333333-3333-4333-a333-333333333344', 160000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-04 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('d5215218-8434-4631-910a-2d10fe0afcd4', '3c333333-3333-4333-a333-333333333344', 60000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-21 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('8594dd4c-5a73-448b-bcda-c031870a6dda', '3c333333-3333-4333-a333-333333333344', 120000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-05-25 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('dc126f7d-5731-4478-be46-bf76d1462f32', '3c333333-3333-4333-a333-333333333344', 40000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-05-23 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('3e7c93b6-c1fc-4a8f-aa9a-195b893e45cb', '3c333333-3333-4333-a333-333333333344', 100000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-05-07 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('8c1d7bbd-e48a-41d2-925c-33894bc70b28', '3c333333-3333-4333-a333-333333333344', 90000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-05-21 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('bb2afe4d-29b6-44cf-8542-c874127595d2', '3c333333-3333-4333-a333-333333333344', 30000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-05-06 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('f3053e2a-1cb8-44c3-951c-29f94b68e3fa', '3c333333-3333-4333-a333-333333333344', 15000000, 'INCOME', '32138d2b-f1f8-4ea3-a588-94030b3a843c', '2026-06-05 09:00:00', 'Lương Tháng 6', FALSE, FALSE, FALSE),
('24c5fac1-9540-478a-9af3-bc1f197b77d4', '3c333333-3333-4333-a333-333333333344', 190000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-11 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('e5fe70dd-3d66-4da3-b48d-ebdb106dafa9', '3c333333-3333-4333-a333-333333333344', 140000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('44b3a95e-6c0f-45a0-848e-1ae57ca87c66', '3c333333-3333-4333-a333-333333333344', 50000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-04 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('b23b0b74-5641-4e64-8d3b-3c2f40f2b1bf', '3c333333-3333-4333-a333-333333333344', 90000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-25 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('101751fb-68d8-43bb-940c-2ff7ad5898ab', '3c333333-3333-4333-a333-333333333344', 80000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-01 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('49e50605-84c1-4140-8b84-6c2ae01232ba', '3c333333-3333-4333-a333-333333333344', 120000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-13 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('eaafb12b-f92e-4b1a-8dbb-c4c329f39379', '3c333333-3333-4333-a333-333333333344', 170000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-03 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('4806dd1a-1059-4046-9751-7d2df72f2217', '3c333333-3333-4333-a333-333333333344', 80000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-06 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('2ec5e9a0-a77d-4ab6-acb9-796a871472d9', '3c333333-3333-4333-a333-333333333344', 80000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-03 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('687430da-85e9-44bc-b1b0-9b67740d684c', '3c333333-3333-4333-a333-333333333344', 150000, 'EXPENSE', 'b01c74e9-46f5-41c5-9497-ce1f3cd24022', '2026-06-22 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE),
('48c6c08b-5305-4c42-853c-b91cf1ac8dbf', '3c333333-3333-4333-a333-333333333344', 100000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-06-16 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('0c3db064-43db-4631-90a0-d45476d36e52', '3c333333-3333-4333-a333-333333333344', 100000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-06-05 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE),
('6a68a7ea-226e-4cff-a0ab-73002239b16d', '3c333333-3333-4333-a333-333333333344', 90000, 'EXPENSE', '3ed5551c-f1e5-4f64-a024-86c71de2e1ed', '2026-06-14 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE);

-- 9 THÁNG CŨ CHO USER A (ĐỂ USER A CÓ ĐỦ 1 NĂM TỪ THÁNG 7/2025)
INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES
('99d699f9-8d53-442f-98e8-10d6c1746cce', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-07-05 09:00:00', 'Lương Tháng 7', FALSE, FALSE, FALSE),
('87d88f15-f650-4d14-a4d2-931475f6d8e8', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-07-10 08:00:00', 'Tiền nhà Tháng 7', FALSE, FALSE, FALSE),
('445998d4-6b75-48f7-b83f-bc4b94b681f3', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-24 12:00:00', 'Ăn uống ngày 24', FALSE, FALSE, FALSE),
('65f16737-4a55-4a49-9e09-c6f4743d1948', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('80e6dd7c-5ce2-4a6e-9c58-6b0eca09a85f', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('ce4fa037-09a8-4e0d-a611-cebb1856fcb9', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-24 12:00:00', 'Ăn uống ngày 24', FALSE, FALSE, FALSE),
('ee1d06e3-0a79-43fe-87f5-ccab462eb2f8', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-24 12:00:00', 'Ăn uống ngày 24', FALSE, FALSE, FALSE),
('c0c29c1b-b6e8-4270-81a3-1c3281786b57', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('8d19e15d-a624-4c5e-8ca2-eb9f766a8e42', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('03dde645-260c-4ab6-b659-79a02b8cff6b', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('94096737-094f-4318-8641-c9ea7cd10f6e', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('48682a66-041c-4a86-bc82-d71dfed86c23', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-14 12:00:00', 'Ăn uống ngày 14', FALSE, FALSE, FALSE),
('46ac5ad2-548e-437b-b286-a5c1477845f5', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('026fef14-3ba5-4750-9976-e0d6a02bac2f', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('0e774eca-7723-45d4-abc0-e72442f3510e', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-20 12:00:00', 'Ăn uống ngày 20', FALSE, FALSE, FALSE),
('6cd1cfcf-e292-406d-8e76-57de1e318c42', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-17 12:00:00', 'Ăn uống ngày 17', FALSE, FALSE, FALSE),
('37f49a21-c6e5-4b43-9f5e-518da1ae2179', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-07-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('fa1116d2-1cf2-488c-ad64-59f7d1670256', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-08-05 09:00:00', 'Lương Tháng 8', FALSE, FALSE, FALSE),
('e28db4be-5542-49da-adbe-0fc6ffd1cfde', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-08-10 08:00:00', 'Tiền nhà Tháng 8', FALSE, FALSE, FALSE),
('ac938270-1ab2-493b-a1db-922d3f536930', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('e0927fde-63eb-4889-9fff-c01e407aa1cf', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('03765cf0-3c03-4721-982c-efa820b2e972', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('136697e3-9ecd-4e12-aec5-6ad34de64b8b', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('f23aa840-44c8-4de8-8014-93017e84683c', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('eceaaf62-8d77-4880-8d75-059e48c901ee', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('148a8f4f-1ff4-4f0f-880c-e5f77f6ad99a', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('cfd7ab27-3b07-4c90-8718-1f79b8b645ae', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('f5f470e8-3b65-4e7a-b689-1bee06179296', '3c333333-3333-4333-a333-333333333331', 130000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('17aa8a4d-e23a-4107-ab12-e79b76edc97f', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('e04f23d0-8a14-4ed8-8a4f-3390312217ad', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('2137d0e9-eb9f-4efa-aef7-7bd3ae8241d8', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-27 12:00:00', 'Ăn uống ngày 27', FALSE, FALSE, FALSE),
('a9e8b0b3-b203-41fd-bae6-1ad92bd002b1', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('fd0aee95-51c9-4452-97cc-dcb5ed556cf2', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-02 12:00:00', 'Ăn uống ngày 02', FALSE, FALSE, FALSE),
('f8f6ff2e-086f-4e56-b8c8-afa0d5cdd4ff', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-08-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('83ee1625-41b4-47ca-bbfc-c6a171f3d075', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-09-05 09:00:00', 'Lương Tháng 9', FALSE, FALSE, FALSE),
('36c3cf9b-4c10-4a70-988e-01c9e96c8cad', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-09-10 08:00:00', 'Tiền nhà Tháng 9', FALSE, FALSE, FALSE),
('33e573b0-6a2e-40d7-bb6f-1c7b887cc739', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('377b0fc1-bcbd-4a10-ac86-0a615ba462fa', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-08 12:00:00', 'Ăn uống ngày 08', FALSE, FALSE, FALSE),
('01e9bda8-a703-4a0a-8615-7c5d83bb2f22', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-04 12:00:00', 'Ăn uống ngày 04', FALSE, FALSE, FALSE),
('975ca461-5951-44eb-aa6c-b95da5de7c19', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('cfea20f8-a07d-4e89-a23f-9ea2b551abbb', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('a72aec72-cb66-4b19-9ff8-2e6c8329b980', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('1510edee-5b45-4016-80c8-16ab09a6bb2f', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-01 12:00:00', 'Ăn uống ngày 01', FALSE, FALSE, FALSE),
('931ee429-89d9-4b01-ae89-e68564e5c550', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('aa4c65b2-4a08-4525-b09e-ff88c11f4682', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('328aa6d6-f9cd-48c0-a639-7bd9643a0037', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-22 12:00:00', 'Ăn uống ngày 22', FALSE, FALSE, FALSE),
('c51a3083-7cf6-48d9-9360-57bf40e947be', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-04 12:00:00', 'Ăn uống ngày 04', FALSE, FALSE, FALSE),
('4d2d0bc8-b37f-4f31-b56b-4c12f2b6546d', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-24 12:00:00', 'Ăn uống ngày 24', FALSE, FALSE, FALSE),
('8c06d971-5ddb-496c-8c83-9f08cf87c267', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('004a691a-1ff4-4da1-8124-09b50a1589b0', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-25 12:00:00', 'Ăn uống ngày 25', FALSE, FALSE, FALSE),
('54e67645-cd00-480b-ad08-3530efd8de98', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-09-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('ee000a2c-e972-413b-8af3-3b7af72d39ea', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-10-05 09:00:00', 'Lương Tháng 10', FALSE, FALSE, FALSE),
('496621f8-f8c5-4c1b-9882-a17c7c22065b', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-10-10 08:00:00', 'Tiền nhà Tháng 10', FALSE, FALSE, FALSE),
('d06ce3fb-83f4-43c3-a913-2c73ecede64e', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-04 12:00:00', 'Ăn uống ngày 04', FALSE, FALSE, FALSE),
('8cb034b4-c558-4273-ab09-ae46f24234e3', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-25 12:00:00', 'Ăn uống ngày 25', FALSE, FALSE, FALSE),
('791ddc20-3ecd-4a81-8b0b-dbbf4eabdaec', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('e9a40404-13e3-41aa-8da9-47287bd79745', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-11 12:00:00', 'Ăn uống ngày 11', FALSE, FALSE, FALSE),
('82ddf4cb-35f9-4303-9f25-894f34d68ddf', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-22 12:00:00', 'Ăn uống ngày 22', FALSE, FALSE, FALSE),
('f6a2258d-d463-45a1-bb07-e036f6e809e2', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-17 12:00:00', 'Ăn uống ngày 17', FALSE, FALSE, FALSE),
('b88c939c-efc5-4a93-a942-f56e1a9f78b6', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('f9ece9e8-ad03-487a-ada5-71d9882928ae', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-25 12:00:00', 'Ăn uống ngày 25', FALSE, FALSE, FALSE),
('2b7b7c35-22f5-417d-8b66-03308b9f52af', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-20 12:00:00', 'Ăn uống ngày 20', FALSE, FALSE, FALSE),
('2419a176-a752-4775-89a8-dcc17833c93d', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('ce13d1e3-a0e5-4d48-a90e-2992a1b7f552', '3c333333-3333-4333-a333-333333333331', 140000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-15 12:00:00', 'Ăn uống ngày 15', FALSE, FALSE, FALSE),
('e6bdaf43-8dcb-4e97-b4c4-cd91cd66dad6', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-20 12:00:00', 'Ăn uống ngày 20', FALSE, FALSE, FALSE),
('76797050-17df-4acb-bf4a-33599c1699ef', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('19ca353b-78a5-4a52-b8c6-3ecf84eb038d', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-05 12:00:00', 'Ăn uống ngày 05', FALSE, FALSE, FALSE),
('87b123fd-16aa-4c6d-adae-e1ea904a9423', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-10-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('32725afc-0191-48d7-96a6-c9ab1fe5abb7', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-11-05 09:00:00', 'Lương Tháng 11', FALSE, FALSE, FALSE),
('d87f55d4-b9cc-48e2-bd70-de3c03b75a9a', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-11-10 08:00:00', 'Tiền nhà Tháng 11', FALSE, FALSE, FALSE),
('6109f832-6021-48e5-a2d6-4fd158aace74', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-11 12:00:00', 'Ăn uống ngày 11', FALSE, FALSE, FALSE),
('881d9e40-d1b5-4486-a6c2-fae39e49b4d0', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('6319c5d8-cfed-405b-bec9-c45477bb5879', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('9bb46072-b866-465c-bf0a-241e93ea2823', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-05 12:00:00', 'Ăn uống ngày 05', FALSE, FALSE, FALSE),
('0990721e-d73a-4b34-a82f-76f4fb717257', '3c333333-3333-4333-a333-333333333331', 140000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('078f9683-368a-4a87-9e19-c64442d0dff1', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-17 12:00:00', 'Ăn uống ngày 17', FALSE, FALSE, FALSE),
('22356c90-5db2-41a8-a7eb-f7c38954f297', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-03 12:00:00', 'Ăn uống ngày 03', FALSE, FALSE, FALSE),
('4d8cebf0-ac9a-4d6d-8a77-6478c6ab0585', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-15 12:00:00', 'Ăn uống ngày 15', FALSE, FALSE, FALSE),
('32bfda0c-e33c-4d21-bd9b-0a9ec58e17f9', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('87814547-45b8-4d48-b285-301aef026f98', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-07 12:00:00', 'Ăn uống ngày 07', FALSE, FALSE, FALSE),
('3de7218e-e927-4e31-9ec2-361461cd6471', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('e6f7c4b8-dce8-4ade-a408-c5a6e12837a5', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-05 12:00:00', 'Ăn uống ngày 05', FALSE, FALSE, FALSE),
('88df76b1-0dec-49cd-b4ee-f17b4d85f4a5', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-20 12:00:00', 'Ăn uống ngày 20', FALSE, FALSE, FALSE),
('61c5e71c-3320-4f10-93fc-38d253e5dc03', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-21 12:00:00', 'Ăn uống ngày 21', FALSE, FALSE, FALSE),
('7b343738-19ed-4bb7-bd21-d68d85c06a12', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-11-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('a0abb084-a6d9-44a0-8ae1-51faebcf2880', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2025-12-05 09:00:00', 'Lương Tháng 12', FALSE, FALSE, FALSE),
('afb22941-7b11-43a7-a4de-fa588974c9e7', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2025-12-10 08:00:00', 'Tiền nhà Tháng 12', FALSE, FALSE, FALSE),
('6b89f71a-e235-45ef-9ade-3b1c997314ae', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-17 12:00:00', 'Ăn uống ngày 17', FALSE, FALSE, FALSE),
('abe93212-155b-42c4-90b3-e2669985d76f', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-05 12:00:00', 'Ăn uống ngày 05', FALSE, FALSE, FALSE),
('20cdb4dc-af62-4dda-9ac1-9206ada63846', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-04 12:00:00', 'Ăn uống ngày 04', FALSE, FALSE, FALSE),
('f828cdda-bb0e-4445-9041-0e55407d2ba2', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('4a071212-91c1-42f3-9b38-f97e88d92280', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('eff42eaf-cdb0-4dbb-b23b-536d7c8b89a1', '3c333333-3333-4333-a333-333333333331', 130000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-02 12:00:00', 'Ăn uống ngày 02', FALSE, FALSE, FALSE),
('ad581305-9c65-45b2-a9d4-f3e92836c9be', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('4a26f916-a7f6-400c-964c-2b2b94e07211', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-11 12:00:00', 'Ăn uống ngày 11', FALSE, FALSE, FALSE),
('8c103508-b5c6-445f-a928-8d84505a638e', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-11 12:00:00', 'Ăn uống ngày 11', FALSE, FALSE, FALSE),
('1df11354-70c6-41a9-97f7-5d48cd550361', '3c333333-3333-4333-a333-333333333331', 140000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('0ffb0b18-5d4e-41b2-836b-aea2f3195b57', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-01 12:00:00', 'Ăn uống ngày 01', FALSE, FALSE, FALSE),
('69892b2a-e817-457e-a60f-58673201b7ce', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('3ea653bf-ac6a-4b96-8ea3-aec7e3f2538e', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-02 12:00:00', 'Ăn uống ngày 02', FALSE, FALSE, FALSE),
('2943be61-d8c1-432c-a689-5a8f9b8e0fbb', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-04 12:00:00', 'Ăn uống ngày 04', FALSE, FALSE, FALSE),
('e4fa3b82-313d-41a1-b6c3-0199cf44ddbe', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2025-12-15 12:00:00', 'Ăn uống ngày 15', FALSE, FALSE, FALSE),
('f7876530-03f6-4df0-b117-2904f1dab0b2', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-01-05 09:00:00', 'Lương Tháng 1', FALSE, FALSE, FALSE),
('42444dc5-299c-4d9a-98f5-7a7afd6fe804', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-01-10 08:00:00', 'Tiền nhà Tháng 1', FALSE, FALSE, FALSE),
('f792874b-b507-4334-808b-b2792e2fefdd', '3c333333-3333-4333-a333-333333333331', 130000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-11 12:00:00', 'Ăn uống ngày 11', FALSE, FALSE, FALSE),
('d6f86ae8-e1d6-46ba-a96f-52a807640685', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('620a8f7c-7973-4983-9dde-23cada4b6989', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('50461a89-d8ab-4a81-95d0-f4b6bfc415a0', '3c333333-3333-4333-a333-333333333331', 130000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('b9726551-8274-49a9-a85f-d8f1925b7283', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('4094730e-6ee2-4976-8b04-39be68c09fd5', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-17 12:00:00', 'Ăn uống ngày 17', FALSE, FALSE, FALSE),
('78e61545-f0a9-415b-9576-a3d37fe1d24f', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('58964b2c-74ca-489e-9a4e-ffb7e3558e2f', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-21 12:00:00', 'Ăn uống ngày 21', FALSE, FALSE, FALSE),
('35f70bdc-6773-4b08-ad17-4bd913df865b', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-20 12:00:00', 'Ăn uống ngày 20', FALSE, FALSE, FALSE),
('f629ebd9-349a-49f1-a011-48e2d4e17e8c', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('70c88d84-9d44-472e-b713-ae2da9f7dec4', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-27 12:00:00', 'Ăn uống ngày 27', FALSE, FALSE, FALSE),
('e2010ab2-4f3d-4fa9-aca1-8dda30fb10c1', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('da244e82-0931-4cde-acc2-16bdb302ccb9', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-27 12:00:00', 'Ăn uống ngày 27', FALSE, FALSE, FALSE),
('8ea40bcc-8a1e-45d6-a191-354d99594c48', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('f4710c04-a78c-4649-8201-eaa1e2858025', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-01-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('804cc10b-8f4f-4b1e-bcf8-4590d7c32bf4', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-02-05 09:00:00', 'Lương Tháng 2', FALSE, FALSE, FALSE),
('c281d23a-fec7-4c9c-a588-927e78ff2d62', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-02-10 08:00:00', 'Tiền nhà Tháng 2', FALSE, FALSE, FALSE),
('17f386cc-9586-4ec5-99be-1e40cdf3c47c', '3c333333-3333-4333-a333-333333333331', 110000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('14c8beb3-0e84-496d-8de1-558c13e7f643', '3c333333-3333-4333-a333-333333333331', 80000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('4ad105ea-6044-4840-8204-a1e944fc1275', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('cb9cd6ee-56c4-4811-8c4f-348e667df3fa', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-15 12:00:00', 'Ăn uống ngày 15', FALSE, FALSE, FALSE),
('7f007420-faaf-415c-ba60-cfcc0a55cf54', '3c333333-3333-4333-a333-333333333331', 50000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-23 12:00:00', 'Ăn uống ngày 23', FALSE, FALSE, FALSE),
('32dc013c-b17c-40c5-8483-360ada4d7f5b', '3c333333-3333-4333-a333-333333333331', 160000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('2e65de34-aaf0-4ae4-908c-746b55721e4c', '3c333333-3333-4333-a333-333333333331', 140000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-14 12:00:00', 'Ăn uống ngày 14', FALSE, FALSE, FALSE),
('777757eb-99f7-4811-8cce-f7ecc801bde5', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-25 12:00:00', 'Ăn uống ngày 25', FALSE, FALSE, FALSE),
('9a02b2f1-9ae3-4cb3-893c-95c3e35bdeca', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('e809edec-fa3b-457e-9fb8-06763af0ab64', '3c333333-3333-4333-a333-333333333331', 140000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('288fc485-e445-45ec-acbd-056ad495c1de', '3c333333-3333-4333-a333-333333333331', 170000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-10 12:00:00', 'Ăn uống ngày 10', FALSE, FALSE, FALSE),
('982b2e08-f097-4b8e-851e-7c7686203d9d', '3c333333-3333-4333-a333-333333333331', 70000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-19 12:00:00', 'Ăn uống ngày 19', FALSE, FALSE, FALSE),
('83edcf78-ad8b-4aaf-a02a-0ab1e0d402a5', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('68d8fd98-42bf-470f-abe8-1cbc104c69fc', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-26 12:00:00', 'Ăn uống ngày 26', FALSE, FALSE, FALSE),
('ee7ec14b-c327-4aa5-af61-a12bdf19479b', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-02-05 12:00:00', 'Ăn uống ngày 05', FALSE, FALSE, FALSE),
('a1b960b6-6633-465d-8a46-627d62f6999d', '3c333333-3333-4333-a333-333333333332', 20000000, 'INCOME', '2b222222-2222-4222-a222-222222222228', '2026-03-05 09:00:00', 'Lương Tháng 3', FALSE, FALSE, FALSE),
('32604b43-3245-484e-854b-ab695f086b7f', '3c333333-3333-4333-a333-333333333332', 5000000, 'EXPENSE', '2b222222-2222-4222-a222-222222222223', '2026-03-10 08:00:00', 'Tiền nhà Tháng 3', FALSE, FALSE, FALSE),
('f74d321f-d1cd-426b-880e-498c1ab4f7c0', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-13 12:00:00', 'Ăn uống ngày 13', FALSE, FALSE, FALSE),
('4fe0072a-ee78-41ed-83cd-283e1ec240e3', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-14 12:00:00', 'Ăn uống ngày 14', FALSE, FALSE, FALSE),
('76bd4bd6-c01b-4517-9fcc-30a7d5cffe57', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-06 12:00:00', 'Ăn uống ngày 06', FALSE, FALSE, FALSE),
('04c1e00a-0170-470a-8b6a-c249f424a85b', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('e5d8d64c-82ae-48ca-b8f2-9138f2d92d2a', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('85a3443b-e3ab-4a04-bd32-520e39f54fc8', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-14 12:00:00', 'Ăn uống ngày 14', FALSE, FALSE, FALSE),
('d1da9fd8-1877-4443-a5ce-796da55c5d3f', '3c333333-3333-4333-a333-333333333331', 150000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-25 12:00:00', 'Ăn uống ngày 25', FALSE, FALSE, FALSE),
('0ce55ab2-8002-4779-b545-ad82dbdb59d0', '3c333333-3333-4333-a333-333333333331', 120000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-14 12:00:00', 'Ăn uống ngày 14', FALSE, FALSE, FALSE),
('891c6601-b6ae-41db-8e7e-41911364a781', '3c333333-3333-4333-a333-333333333331', 90000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-21 12:00:00', 'Ăn uống ngày 21', FALSE, FALSE, FALSE),
('cdbe35ff-3868-43d5-b66b-f796cf00bcf4', '3c333333-3333-4333-a333-333333333331', 200000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-22 12:00:00', 'Ăn uống ngày 22', FALSE, FALSE, FALSE),
('bf57edff-14dd-4e86-9e1d-92e77a4edfaa', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-16 12:00:00', 'Ăn uống ngày 16', FALSE, FALSE, FALSE),
('62e685ce-12a4-4a19-95c1-a761e95d1547', '3c333333-3333-4333-a333-333333333331', 190000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-12 12:00:00', 'Ăn uống ngày 12', FALSE, FALSE, FALSE),
('98db98b0-bb97-4acb-a15d-71ce9ed27497', '3c333333-3333-4333-a333-333333333331', 180000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE),
('81fd81af-de64-439a-8519-921ae87ce931', '3c333333-3333-4333-a333-333333333331', 60000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-28 12:00:00', 'Ăn uống ngày 28', FALSE, FALSE, FALSE),
('b8fa9a2d-1ffb-4f10-9e7c-437f94358129', '3c333333-3333-4333-a333-333333333331', 100000, 'EXPENSE', '2b222222-2222-4222-a222-222222222221', '2026-03-09 12:00:00', 'Ăn uống ngày 09', FALSE, FALSE, FALSE);

