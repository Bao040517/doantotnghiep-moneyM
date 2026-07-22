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

-- 1. USERS
INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES
('1a111111-1111-4111-a111-111111111111', 'nguyenvana@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Nguyễn Văn A (Thông Thái)', '0900123456', 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1b111111-1111-4111-a111-111111111111', 'tranthib@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Trần Thị B (Tiêu Lố)', '0901123456', 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1c111111-1111-4111-a111-111111111111', 'lethic@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Lê Thị C (Trùm Nhóm)', '0902123456', 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1d111111-1111-4111-a111-111111111111', 'phamvand@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Phạm Văn D (Con Nợ)', '0903123456', 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff', NULL, NULL, '2025-07-01 08:00:00'),
('1e111111-1111-4111-a111-111111111111', 'hoangthie@gmail.com', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', 'Hoàng Thị E (Newbie)', '0904123456', 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff', NULL, NULL, '2025-07-01 08:00:00');

INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES
('a540364e-0ef5-4f4f-9d06-1d66fcb12d22', '1a111111-1111-4111-a111-111111111111', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('85c0b23b-c239-43ea-83a2-572d1af9a1fc', '1a111111-1111-4111-a111-111111111111', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00'),
('8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', '1b111111-1111-4111-a111-111111111111', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('215eaa4b-a41f-49f2-928a-5edf30fc45b1', '1b111111-1111-4111-a111-111111111111', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00'),
('05669d61-ae07-43c3-b865-45ade20ed8b8', '1c111111-1111-4111-a111-111111111111', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', '1c111111-1111-4111-a111-111111111111', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00'),
('6bdb4155-f19d-428c-8b69-bcab05b111f1', '1d111111-1111-4111-a111-111111111111', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', '1d111111-1111-4111-a111-111111111111', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00'),
('a796b5f4-e1f3-4832-a942-7459ed5c7bd0', '1e111111-1111-4111-a111-111111111111', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00'),
('94e5e03b-f72e-4a8e-84f6-f639bb40bb98', '1e111111-1111-4111-a111-111111111111', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00');

INSERT INTO categories (id, user_id, name, type, icon_name) VALUES
('732ac542-e706-4255-ad22-81ca96ed832b', '1a111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍕'),
('4d60eabd-76a6-485d-b19d-cff1d33f5c64', '1a111111-1111-4111-a111-111111111111', 'Mua sắm', 'EXPENSE', '🛍️'),
('82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', '1a111111-1111-4111-a111-111111111111', 'Lương', 'INCOME', '💰'),
('c6c03c02-a003-474c-89d4-54b10035b879', '1a111111-1111-4111-a111-111111111111', 'Chuyển khoản', 'TRANSFER', '🔄'),
('abc3f809-f026-4909-9421-c56ee49b23a6', '1b111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍕'),
('7247d92f-000d-41b2-b994-d3710a282708', '1b111111-1111-4111-a111-111111111111', 'Mua sắm', 'EXPENSE', '🛍️'),
('46fdeb19-87e4-4804-afa0-6e0f53f5a516', '1b111111-1111-4111-a111-111111111111', 'Lương', 'INCOME', '💰'),
('976e3620-7819-4e18-b9a1-2dfc1c199435', '1b111111-1111-4111-a111-111111111111', 'Chuyển khoản', 'TRANSFER', '🔄'),
('55b5f5f8-269c-4167-96dc-1fca8386396a', '1c111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍕'),
('c393e38b-c36b-4570-b9d6-b44f394d8aee', '1c111111-1111-4111-a111-111111111111', 'Mua sắm', 'EXPENSE', '🛍️'),
('b5bfc6bb-8d0c-4802-abe1-21c35e98df65', '1c111111-1111-4111-a111-111111111111', 'Lương', 'INCOME', '💰'),
('a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '1c111111-1111-4111-a111-111111111111', 'Chuyển khoản', 'TRANSFER', '🔄'),
('ec3fd4d2-40dc-41e5-b524-e63c22968ce6', '1d111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍕'),
('c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '1d111111-1111-4111-a111-111111111111', 'Mua sắm', 'EXPENSE', '🛍️'),
('53934183-09b6-4408-8981-eec250f8f2a9', '1d111111-1111-4111-a111-111111111111', 'Lương', 'INCOME', '💰'),
('b4bf2e8d-a067-4ec5-b130-eddd30756d67', '1d111111-1111-4111-a111-111111111111', 'Chuyển khoản', 'TRANSFER', '🔄'),
('4aee874c-e271-4529-8ad6-07b123fd6322', '1e111111-1111-4111-a111-111111111111', 'Ăn uống', 'EXPENSE', '🍕'),
('f899396a-bd53-40fd-a989-833cfb4c6b68', '1e111111-1111-4111-a111-111111111111', 'Mua sắm', 'EXPENSE', '🛍️'),
('c1e2822d-f69a-484f-ac71-a684502d76f8', '1e111111-1111-4111-a111-111111111111', 'Lương', 'INCOME', '💰'),
('6af2cf7c-6629-4d7a-9500-f02a58687891', '1e111111-1111-4111-a111-111111111111', 'Chuyển khoản', 'TRANSFER', '🔄');

INSERT INTO payees (id, user_id, name) VALUES
('e8df5842-572d-48b7-9faa-415d0dafa8ef', '1a111111-1111-4111-a111-111111111111', 'Siêu thị'),
('901ab58c-8210-4730-a721-af1c6b90214c', '1a111111-1111-4111-a111-111111111111', 'Công ty'),
('ea2cc75a-442c-4871-8bcc-9c80252c23fa', '1b111111-1111-4111-a111-111111111111', 'Siêu thị'),
('a712fd95-d509-49f5-a16e-a6f3d662f1e1', '1b111111-1111-4111-a111-111111111111', 'Công ty'),
('335f6b33-35cb-4e38-9789-fb182b36241d', '1c111111-1111-4111-a111-111111111111', 'Siêu thị'),
('c5503d66-8415-4978-9cd5-7162787a222b', '1c111111-1111-4111-a111-111111111111', 'Công ty'),
('19a146c6-1edb-425f-988a-4d4ef7ce296c', '1d111111-1111-4111-a111-111111111111', 'Siêu thị'),
('43e36098-67fd-4f11-806d-f1807c8b8212', '1d111111-1111-4111-a111-111111111111', 'Công ty'),
('6db82b09-e596-4287-bf1f-aeee250ea2b7', '1e111111-1111-4111-a111-111111111111', 'Siêu thị'),
('bf42611a-ee6f-46d5-82e0-f67a8d2fe040', '1e111111-1111-4111-a111-111111111111', 'Công ty');

INSERT INTO tags (id, user_id, name, color) VALUES
('bf5b882c-8897-4142-8a7c-a6239baf471b', '1a111111-1111-4111-a111-111111111111', 'Gia đình', '#FF0000'),
('30718189-4910-4c59-8838-0e7fa03f7f47', '1a111111-1111-4111-a111-111111111111', 'Cá nhân', '#0000FF'),
('e7ca6bab-cda2-4468-8623-691dd10d5b74', '1b111111-1111-4111-a111-111111111111', 'Gia đình', '#FF0000'),
('60927223-efeb-4b78-ae58-373e6c38479e', '1b111111-1111-4111-a111-111111111111', 'Cá nhân', '#0000FF'),
('9a77048b-7cb6-4c9c-a1cb-c98b28238c9f', '1c111111-1111-4111-a111-111111111111', 'Gia đình', '#FF0000'),
('bfefd179-69e8-42e8-87ea-af2682b5d9e5', '1c111111-1111-4111-a111-111111111111', 'Cá nhân', '#0000FF'),
('a569e05c-1337-4a1a-be9c-c57a774a37c9', '1d111111-1111-4111-a111-111111111111', 'Gia đình', '#FF0000'),
('8e469865-8c44-43a5-8bf0-b688a1c7de82', '1d111111-1111-4111-a111-111111111111', 'Cá nhân', '#0000FF'),
('aee5828b-e92e-42fb-9778-92d90e8a1e99', '1e111111-1111-4111-a111-111111111111', 'Gia đình', '#FF0000'),
('d86ec131-5aa3-49c8-8b9e-89a92c89dca6', '1e111111-1111-4111-a111-111111111111', 'Cá nhân', '#0000FF');

INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled) VALUES
('81266b26-b168-4d63-83db-12e924d61c20', '1a111111-1111-4111-a111-111111111111', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false),
('78224bfe-0809-434d-8bff-aabb7cfd21e0', '1a111111-1111-4111-a111-111111111111', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false),
('683f4fe7-e1a3-4a1c-a013-6b041062b642', '1b111111-1111-4111-a111-111111111111', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false),
('b34ea1dc-c94a-4a35-be47-779becfb2383', '1b111111-1111-4111-a111-111111111111', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false),
('94fa7af8-14e4-4e06-bac2-50457f3e6b81', '1c111111-1111-4111-a111-111111111111', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false),
('3855cba5-b225-4a19-abf0-5b1c381b332e', '1c111111-1111-4111-a111-111111111111', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false),
('95280428-c07a-4edb-8c39-c1d3b35b1ab6', '1d111111-1111-4111-a111-111111111111', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false),
('ac885d14-775e-41a4-bfa9-2752bc8adcfc', '1d111111-1111-4111-a111-111111111111', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false),
('7d1c847b-34e3-43cf-934c-727844483102', '1e111111-1111-4111-a111-111111111111', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false),
('48f25d29-531f-4c42-826a-0dd59066d130', '1e111111-1111-4111-a111-111111111111', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false);

INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at) VALUES
('c7040563-77cd-4ef0-b842-e72cb1ffd3ed', '1a111111-1111-4111-a111-111111111111', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00'),
('1db7bb43-714b-4d25-9eae-bf0d0323d03d', '1b111111-1111-4111-a111-111111111111', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00'),
('0ab9f9c1-b9ce-4410-ace0-2c7695582dc6', '1c111111-1111-4111-a111-111111111111', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00'),
('f0315108-8603-4b27-96fb-d559ed1db3d1', '1d111111-1111-4111-a111-111111111111', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00'),
('6f4b1d1b-034f-4e2c-a38e-8fe36ab454ca', '1e111111-1111-4111-a111-111111111111', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00');

INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, is_mandatory) VALUES
('0c6c73d0-9c7b-42fe-bbc2-9b1b4ceb189a', '1a111111-1111-4111-a111-111111111111', '732ac542-e706-4255-ad22-81ca96ed832b', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false),
('e030be54-0977-4fb0-94fb-28a655f69ebd', '1b111111-1111-4111-a111-111111111111', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false),
('160d8c2c-5b3c-4a0a-b4c5-98bea1c03a0c', '1c111111-1111-4111-a111-111111111111', '55b5f5f8-269c-4167-96dc-1fca8386396a', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false),
('8cfddc28-328e-463b-8320-577afb63c527', '1d111111-1111-4111-a111-111111111111', 'ec3fd4d2-40dc-41e5-b524-e63c22968ce6', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false),
('465835c1-2f02-487a-9e56-3ffecf04f03a', '1e111111-1111-4111-a111-111111111111', '4aee874c-e271-4529-8ad6-07b123fd6322', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false);

INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
('da3ba0cc-38b7-452e-8482-057b6fcf389a', '1a111111-1111-4111-a111-111111111111', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00'),
('8efd7075-0f22-4587-a478-a79dc7e43f33', '1b111111-1111-4111-a111-111111111111', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00'),
('8ac86702-016e-425b-ae15-125faa707c40', '1c111111-1111-4111-a111-111111111111', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00'),
('4e89678f-caae-479f-8339-2543cc218316', '1d111111-1111-4111-a111-111111111111', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00'),
('eb5959b0-fefb-47c5-8247-e772aa15d151', '1e111111-1111-4111-a111-111111111111', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00');

INSERT INTO groups (id, name, description, owner_id) VALUES
('c2fdf541-9274-428e-b06a-5c22e02ab363', 'Nhóm của Nguyễn Văn A (Thông Thái)', 'Mô tả', '1a111111-1111-4111-a111-111111111111'),
('6493a328-bcba-43c8-bb53-946768104d53', 'Nhóm của Trần Thị B (Tiêu Lố)', 'Mô tả', '1b111111-1111-4111-a111-111111111111'),
('c6e06e93-7291-4812-b690-6fd41cc5173f', 'Nhóm của Lê Thị C (Trùm Nhóm)', 'Mô tả', '1c111111-1111-4111-a111-111111111111'),
('1468768c-23c8-478a-89f8-1502d7c1f149', 'Nhóm của Phạm Văn D (Con Nợ)', 'Mô tả', '1d111111-1111-4111-a111-111111111111'),
('c7209932-4bde-46e0-8ef1-aa00e33b1903', 'Nhóm của Hoàng Thị E (Newbie)', 'Mô tả', '1e111111-1111-4111-a111-111111111111');

INSERT INTO group_members (id, group_id, user_id, role) VALUES
('0ca5ee94-c7e6-409f-9dcc-1bcc39e8feba', 'c2fdf541-9274-428e-b06a-5c22e02ab363', '1a111111-1111-4111-a111-111111111111', 'owner'),
('14dc0557-1d2f-4373-8e5c-98c75033d398', 'c2fdf541-9274-428e-b06a-5c22e02ab363', '1b111111-1111-4111-a111-111111111111', 'member'),
('1264920f-1890-4e83-ad44-b99850303694', 'c2fdf541-9274-428e-b06a-5c22e02ab363', '1c111111-1111-4111-a111-111111111111', 'member'),
('dccaef64-b530-423a-92c2-a23b78f4b63a', '6493a328-bcba-43c8-bb53-946768104d53', '1b111111-1111-4111-a111-111111111111', 'owner'),
('3eb2a80f-a563-459c-8a25-989f02657491', '6493a328-bcba-43c8-bb53-946768104d53', '1a111111-1111-4111-a111-111111111111', 'member'),
('54e65e18-bef9-497a-b871-3480de84bae3', '6493a328-bcba-43c8-bb53-946768104d53', '1c111111-1111-4111-a111-111111111111', 'member'),
('75511ec9-b856-4491-916e-04920c1169ab', 'c6e06e93-7291-4812-b690-6fd41cc5173f', '1c111111-1111-4111-a111-111111111111', 'owner'),
('68bee0ef-388c-4361-bfe1-f90a41d7b063', 'c6e06e93-7291-4812-b690-6fd41cc5173f', '1a111111-1111-4111-a111-111111111111', 'member'),
('ba453933-46aa-4b09-a2e1-d9190d24d086', 'c6e06e93-7291-4812-b690-6fd41cc5173f', '1b111111-1111-4111-a111-111111111111', 'member'),
('289edf13-c4e6-4a8f-b47f-996dadc2ea4a', '1468768c-23c8-478a-89f8-1502d7c1f149', '1d111111-1111-4111-a111-111111111111', 'owner'),
('4e42ff8b-baf6-42c0-819c-537be68b0547', '1468768c-23c8-478a-89f8-1502d7c1f149', '1a111111-1111-4111-a111-111111111111', 'member'),
('cf7e1a0b-a32c-4594-9089-8a4f8c4e5e69', '1468768c-23c8-478a-89f8-1502d7c1f149', '1b111111-1111-4111-a111-111111111111', 'member'),
('0220561c-22be-4515-b171-7d2040c7af19', 'c7209932-4bde-46e0-8ef1-aa00e33b1903', '1e111111-1111-4111-a111-111111111111', 'owner'),
('77819528-2913-4800-8c53-da62f8520566', 'c7209932-4bde-46e0-8ef1-aa00e33b1903', '1a111111-1111-4111-a111-111111111111', 'member'),
('41c86888-4707-4105-bf39-4da35bb42f34', 'c7209932-4bde-46e0-8ef1-aa00e33b1903', '1b111111-1111-4111-a111-111111111111', 'member');

INSERT INTO expenses (id, group_id, paid_by, title, amount, category) VALUES
('2a0653da-9e30-49b4-b624-98786490694a', 'c2fdf541-9274-428e-b06a-5c22e02ab363', '1a111111-1111-4111-a111-111111111111', 'Ăn nhậu', 1500000, 'Ăn uống'),
('bb29f801-f668-484b-a5a8-4aae0c9b8eb2', '6493a328-bcba-43c8-bb53-946768104d53', '1b111111-1111-4111-a111-111111111111', 'Ăn nhậu', 1500000, 'Ăn uống'),
('b53e1f0a-f03f-4a9f-a075-a7a645210853', 'c6e06e93-7291-4812-b690-6fd41cc5173f', '1c111111-1111-4111-a111-111111111111', 'Ăn nhậu', 1500000, 'Ăn uống'),
('15bc8de8-e823-4639-a028-628116cba815', '1468768c-23c8-478a-89f8-1502d7c1f149', '1d111111-1111-4111-a111-111111111111', 'Ăn nhậu', 1500000, 'Ăn uống'),
('0da36359-81aa-4c0d-9945-554f42979f9b', 'c7209932-4bde-46e0-8ef1-aa00e33b1903', '1e111111-1111-4111-a111-111111111111', 'Ăn nhậu', 1500000, 'Ăn uống');

INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES
('60193fc3-f4f9-431f-94f2-4614de9db7ae', '2a0653da-9e30-49b4-b624-98786490694a', '1a111111-1111-4111-a111-111111111111', 500000, true),
('4cc423c2-a448-4533-9526-02c018fae1fd', '2a0653da-9e30-49b4-b624-98786490694a', '1b111111-1111-4111-a111-111111111111', 500000, false),
('46a256f3-f4c2-46d1-9713-2d6c6626c5d8', '2a0653da-9e30-49b4-b624-98786490694a', '1c111111-1111-4111-a111-111111111111', 500000, true),
('faa864ab-04d6-4e23-af36-eefa503b2fc7', 'bb29f801-f668-484b-a5a8-4aae0c9b8eb2', '1b111111-1111-4111-a111-111111111111', 500000, true),
('dc84c599-d695-4d23-8ea8-cdb844c63b1d', 'bb29f801-f668-484b-a5a8-4aae0c9b8eb2', '1a111111-1111-4111-a111-111111111111', 500000, false),
('2f56b9dc-9e9c-4898-8683-2379d80c92a9', 'bb29f801-f668-484b-a5a8-4aae0c9b8eb2', '1c111111-1111-4111-a111-111111111111', 500000, true),
('a3d41658-0b88-412a-a6e9-88af9b36f084', 'b53e1f0a-f03f-4a9f-a075-a7a645210853', '1c111111-1111-4111-a111-111111111111', 500000, true),
('855005f1-1c31-4cf4-bf65-963db23851e6', 'b53e1f0a-f03f-4a9f-a075-a7a645210853', '1a111111-1111-4111-a111-111111111111', 500000, false),
('19fcdf11-3981-4688-8e58-7b446fb31ea6', 'b53e1f0a-f03f-4a9f-a075-a7a645210853', '1b111111-1111-4111-a111-111111111111', 500000, true),
('a7f7eaae-d2f5-4bd8-bf27-da9c3d504109', '15bc8de8-e823-4639-a028-628116cba815', '1d111111-1111-4111-a111-111111111111', 500000, true),
('0c2cdd4c-df24-407d-bd5c-e4a8d4786c7e', '15bc8de8-e823-4639-a028-628116cba815', '1a111111-1111-4111-a111-111111111111', 500000, false),
('1bfc0ccf-0474-4a64-8e44-9541ecc4de85', '15bc8de8-e823-4639-a028-628116cba815', '1b111111-1111-4111-a111-111111111111', 500000, true),
('6f414299-1a15-4800-81ee-4c1ce9400b35', '0da36359-81aa-4c0d-9945-554f42979f9b', '1e111111-1111-4111-a111-111111111111', 500000, true),
('cc824adf-0ff3-436e-b45b-373b71fd9d2e', '0da36359-81aa-4c0d-9945-554f42979f9b', '1a111111-1111-4111-a111-111111111111', 500000, false),
('4f7a219e-765f-45f6-b22a-530ecb845673', '0da36359-81aa-4c0d-9945-554f42979f9b', '1b111111-1111-4111-a111-111111111111', 500000, true);

INSERT INTO payments (id, expense_id, payer_id, receiver_id, amount, payment_date, note) VALUES
('7cd03e1e-221a-4d55-a46a-4ad765d737c1', '2a0653da-9e30-49b4-b624-98786490694a', '1c111111-1111-4111-a111-111111111111', '1a111111-1111-4111-a111-111111111111', 500000, '2026-07-21 08:00:00', 'Trả tiền'),
('f34ef2bb-75c6-45c2-abad-447a4d0e0632', 'bb29f801-f668-484b-a5a8-4aae0c9b8eb2', '1c111111-1111-4111-a111-111111111111', '1b111111-1111-4111-a111-111111111111', 500000, '2026-07-21 08:00:00', 'Trả tiền'),
('dca31acc-7971-4630-a455-0a733d2f335b', 'b53e1f0a-f03f-4a9f-a075-a7a645210853', '1b111111-1111-4111-a111-111111111111', '1c111111-1111-4111-a111-111111111111', 500000, '2026-07-21 08:00:00', 'Trả tiền'),
('c33c6b59-febe-49ce-b862-04e2ca849e8f', '15bc8de8-e823-4639-a028-628116cba815', '1b111111-1111-4111-a111-111111111111', '1d111111-1111-4111-a111-111111111111', 500000, '2026-07-21 08:00:00', 'Trả tiền'),
('be11843f-8d80-4183-a741-322f06d0a4e0', '0da36359-81aa-4c0d-9945-554f42979f9b', '1b111111-1111-4111-a111-111111111111', '1e111111-1111-4111-a111-111111111111', 500000, '2026-07-21 08:00:00', 'Trả tiền');

-- ========================= TRANSACTIONS =========================
INSERT INTO transactions (id, wallet_id, amount, type, category_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated) VALUES
('f8ac8e91-1f43-4b9b-938d-9449187c7dbe', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 700000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', '901ab58c-8210-4730-a721-af1c6b90214c', '2026-05-06 18:32:00', 'GD mẫu', false, false, false),
('250fcde2-7210-416d-bf60-6a57aaf8f628', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 200000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-01 22:32:00', 'GD mẫu', true, false, false),
('714a21c7-b96c-47be-a84f-b061c5b3254e', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 700000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-07 19:42:00', 'GD mẫu', false, false, false),
('c790dc63-04c8-45a4-855a-2c2cbd3f0015', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 100000, 'TRANSFER', 'c6c03c02-a003-474c-89d4-54b10035b879', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-17 10:36:00', 'GD mẫu', false, false, false),
('b5e84457-28b0-4bd1-b05b-7072128a5773', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 50000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-01 22:46:00', 'Thêm', false, false, false),
('0827a937-feab-4852-a7ef-7d68efaefc5b', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 100000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-03 10:05:00', 'Thêm', false, false, false),
('d4c81e53-a240-4e21-86e9-1b67e110b22b', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 250000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-18 09:16:00', 'Thêm', false, false, false),
('5420df97-9697-474a-9546-d3a80533c1c3', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 100000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-08 11:23:00', 'Thêm', false, false, false),
('15afd490-752b-45b1-bbeb-74735aad7960', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 150000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-05-13 21:21:00', 'Thêm', false, false, false),
('6beca9d8-b1c7-4eda-9268-73e9a63798a9', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 700000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', '901ab58c-8210-4730-a721-af1c6b90214c', '2026-06-14 16:45:00', 'GD mẫu', false, false, false),
('f7e7d1df-5b3d-42d4-8a0f-4bb4abf9a123', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 200000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', '901ab58c-8210-4730-a721-af1c6b90214c', '2026-06-14 22:00:00', 'GD mẫu', false, false, false),
('c7a362c5-d3a0-4a17-86dd-d1553839f62a', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 500000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-07 09:21:00', 'GD mẫu', false, false, false),
('19363e74-2367-44be-8cb8-1ffd1d803c11', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 900000, 'TRANSFER', 'c6c03c02-a003-474c-89d4-54b10035b879', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-10 10:00:00', 'GD mẫu', false, false, false),
('50c127ab-ea67-483a-b642-1ec23c6782d9', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 100000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-08 19:45:00', 'Thêm', false, false, false),
('6ba7e615-2439-4a0b-a471-b0af93714d42', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 200000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-21 10:06:00', 'Thêm', false, false, false),
('bc8ca064-ef1b-44a6-84cb-4834c4b52a65', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 200000, 'TRANSFER', 'c6c03c02-a003-474c-89d4-54b10035b879', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-21 18:04:00', 'Thêm', false, false, false),
('6a7d929b-7dfb-4a79-a9f8-91978c2d4bf4', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 50000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-28 18:21:00', 'Thêm', false, false, false),
('f5827ba5-3784-43ea-98b8-3a00af5a32e0', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 100000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-06-23 12:14:00', 'Thêm', false, false, false),
('1af948b8-8ea0-4bf3-b1a2-86a4fcb713ae', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 400000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-12 21:25:00', 'GD mẫu', false, false, false),
('cd8ccbcb-5e16-4ad9-807f-74c69d9429e8', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 1000000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-12 22:07:00', 'GD mẫu', false, false, false),
('24a52106-84c3-4cc6-84d3-5a2625f4d7ff', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 900000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', '901ab58c-8210-4730-a721-af1c6b90214c', '2026-07-27 20:17:00', 'GD mẫu', false, false, false),
('3de09fb8-693b-4d06-8e32-b4013387ce69', '85c0b23b-c239-43ea-83a2-572d1af9a1fc', 700000, 'TRANSFER', 'c6c03c02-a003-474c-89d4-54b10035b879', '901ab58c-8210-4730-a721-af1c6b90214c', '2026-07-12 22:25:00', 'GD mẫu', false, false, false),
('d11f5a91-278f-48b5-8a4a-d3af2bf876c2', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 50000, 'INCOME', '82ef6a8e-22e4-4c7e-b0ba-a74f00b98216', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-03 20:26:00', 'Thêm', false, false, false),
('493d6e79-b812-4be9-810c-3b457405f068', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 150000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-18 18:14:00', 'Thêm', false, false, false),
('776081aa-546e-4fcd-b335-b5ad321fb33d', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 50000, 'TRANSFER', 'c6c03c02-a003-474c-89d4-54b10035b879', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-27 22:45:00', 'Thêm', false, false, false),
('fccc0d5b-6c75-4a49-9bef-0bf9293c482d', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 250000, 'EXPENSE', '732ac542-e706-4255-ad22-81ca96ed832b', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-08 21:28:00', 'Thêm', false, false, false),
('3d9e1530-0668-414e-b79a-fc6b82c74e1a', 'a540364e-0ef5-4f4f-9d06-1d66fcb12d22', 100000, 'EXPENSE', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 'e8df5842-572d-48b7-9faa-415d0dafa8ef', '2026-07-27 20:43:00', 'Thêm', false, false, false),
('8cb7275d-a1a3-4412-a394-c22d4a4186a8', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 900000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-05-28 09:21:00', 'GD mẫu', false, false, false),
('acbcdc54-3e3e-472c-b081-72b7574986a0', '215eaa4b-a41f-49f2-928a-5edf30fc45b1', 400000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-05-08 08:42:00', 'GD mẫu', false, false, false),
('1466aea9-40f8-471e-b0db-bb1d84335696', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 500000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-20 13:01:00', 'GD mẫu', false, false, false),
('898ec90c-c12a-4187-b0b7-e429f86d5032', '215eaa4b-a41f-49f2-928a-5edf30fc45b1', 500000, 'TRANSFER', '976e3620-7819-4e18-b9a1-2dfc1c199435', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-05-10 14:17:00', 'GD mẫu', false, false, false),
('c2aaba3b-4ac7-4523-822e-e09d6118044b', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 50000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-18 18:15:00', 'Thêm', false, false, false),
('ba1ad777-fed1-49a4-996a-c73f321fced5', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 200000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-17 07:00:00', 'Thêm', false, false, false),
('00074703-69e7-48f4-862a-4b89e948a180', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 150000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-21 10:12:00', 'Thêm', false, false, false),
('bde76df2-1317-40a4-8fcf-a586444f819e', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 250000, 'TRANSFER', '976e3620-7819-4e18-b9a1-2dfc1c199435', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-04 15:34:00', 'Thêm', false, false, false),
('74887106-00d3-48f5-afcb-34781ed0bebb', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 200000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-05-25 09:24:00', 'Thêm', false, false, false),
('c686d446-b856-4c96-b1f4-967d73d11be6', '215eaa4b-a41f-49f2-928a-5edf30fc45b1', 800000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-10 08:53:00', 'GD mẫu', false, false, false),
('2cd5f8af-522b-4723-a653-4baed40b743a', '215eaa4b-a41f-49f2-928a-5edf30fc45b1', 400000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-20 09:15:00', 'GD mẫu', true, false, false),
('44d22f38-fc83-4584-86e8-e1960c254bc7', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 600000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-06-13 10:57:00', 'GD mẫu', false, false, false),
('d46ae6c3-03ae-491a-97f5-cb71546bda3b', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 500000, 'TRANSFER', '976e3620-7819-4e18-b9a1-2dfc1c199435', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-03 20:14:00', 'GD mẫu', false, false, false),
('e3703a7c-9b8c-45f4-b423-96611501f071', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 50000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-07 19:26:00', 'Thêm', false, false, false),
('d08edc23-2f63-4614-aad0-f719e8179f41', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-27 14:10:00', 'Thêm', false, false, false),
('14d1fec4-b772-4692-a8da-98b779ae8a7d', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-17 19:51:00', 'Thêm', false, false, false),
('7f309199-7597-4150-bf74-076730886320', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-07 18:51:00', 'Thêm', false, false, false),
('28e18ccc-1f43-421d-b983-1e91893accf5', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 250000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-06-27 18:30:00', 'Thêm', false, false, false),
('6a0b688d-33ef-411b-827b-83dd427ffd4e', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 200000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-07-19 16:26:00', 'GD mẫu', false, false, false),
('f67f534b-e194-49ef-8700-b73f393cf524', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-07-22 20:49:00', 'GD mẫu', true, false, false),
('f0f0b7d5-89e9-42c3-ab71-2df383d49aa8', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 700000, 'INCOME', '46fdeb19-87e4-4804-afa0-6e0f53f5a516', 'a712fd95-d509-49f5-a16e-a6f3d662f1e1', '2026-07-07 11:47:00', 'GD mẫu', false, false, false),
('12d210c3-f46c-44b1-817c-3f1150460b96', '215eaa4b-a41f-49f2-928a-5edf30fc45b1', 600000, 'TRANSFER', '976e3620-7819-4e18-b9a1-2dfc1c199435', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-03 15:42:00', 'GD mẫu', false, false, false),
('f32b9bee-fe56-4936-943d-a4db1c83ff80', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 250000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-17 10:42:00', 'Thêm', false, false, false),
('72e39f00-26cc-4abb-b863-992784c30ff6', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-10 21:39:00', 'Thêm', false, false, false),
('87b9aab5-cca6-4259-9efe-1f6f490eee4f', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 100000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-04 07:04:00', 'Thêm', false, false, false),
('11261c3c-0051-4afb-bc07-9487545ffbd7', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 200000, 'EXPENSE', '7247d92f-000d-41b2-b994-d3710a282708', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-13 14:15:00', 'Thêm', false, false, false),
('dab3f3ab-8330-4d54-a8b2-4707af21a0ed', '8d1b0cd3-ff8e-4d5e-a106-e8e2123eb02b', 200000, 'EXPENSE', 'abc3f809-f026-4909-9421-c56ee49b23a6', 'ea2cc75a-442c-4871-8bcc-9c80252c23fa', '2026-07-14 18:05:00', 'Thêm', false, false, false),
('a34ae431-d16b-4704-912b-f1557e952fa8', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 200000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-05-20 13:49:00', 'GD mẫu', true, false, false),
('ed562ddd-d0a3-40e8-890c-6d1a446d7aa8', '05669d61-ae07-43c3-b865-45ade20ed8b8', 400000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-05-09 20:54:00', 'GD mẫu', false, false, false),
('f99191ad-05bb-40ba-8752-fc2bc1fe011f', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 200000, 'INCOME', 'b5bfc6bb-8d0c-4802-abe1-21c35e98df65', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-05-05 15:17:00', 'GD mẫu', false, false, false),
('8a07c469-2a9a-4297-94c9-8338d9bbeb7e', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 100000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-05-05 22:51:00', 'GD mẫu', false, false, false),
('699c6c9f-f7de-4112-a460-ee1f95606cdb', '05669d61-ae07-43c3-b865-45ade20ed8b8', 50000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-05-23 12:36:00', 'Thêm', false, false, false),
('26ae7937-2f5d-41bc-9336-fe0489bd8f89', '05669d61-ae07-43c3-b865-45ade20ed8b8', 150000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-05-17 16:18:00', 'Thêm', false, false, false),
('670b8ca8-d6ec-4cc3-bf95-428666d967c9', '05669d61-ae07-43c3-b865-45ade20ed8b8', 50000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-05-16 22:03:00', 'Thêm', false, false, false),
('a735dec4-6f7e-41c8-96c4-8b0cee2bf155', '05669d61-ae07-43c3-b865-45ade20ed8b8', 100000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-05-20 22:14:00', 'Thêm', false, false, false),
('03ea680d-a655-4203-8b2f-15368cf6125c', '05669d61-ae07-43c3-b865-45ade20ed8b8', 100000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-05-01 20:19:00', 'Thêm', false, false, false),
('e5836d19-d7d7-4c6d-981a-9d5b36ac06a4', '05669d61-ae07-43c3-b865-45ade20ed8b8', 800000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-09 18:42:00', 'GD mẫu', false, false, false),
('41506a86-9983-481d-9fba-f07dfeb08d1e', '05669d61-ae07-43c3-b865-45ade20ed8b8', 700000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-06-06 09:58:00', 'GD mẫu', false, false, false),
('cd63b411-00bf-450b-badc-526bf8eed46d', '05669d61-ae07-43c3-b865-45ade20ed8b8', 500000, 'INCOME', 'b5bfc6bb-8d0c-4802-abe1-21c35e98df65', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-14 11:40:00', 'GD mẫu', false, false, false),
('bc127c89-f253-4d5a-96ab-c63d90c09472', '05669d61-ae07-43c3-b865-45ade20ed8b8', 200000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-06-04 21:42:00', 'GD mẫu', false, false, false),
('0433e026-2fc3-4b5c-a526-8ad4a8f6c26b', '05669d61-ae07-43c3-b865-45ade20ed8b8', 100000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-11 21:03:00', 'Thêm', false, false, false),
('8aa79237-c772-4bc7-847a-1193a49ac392', '05669d61-ae07-43c3-b865-45ade20ed8b8', 200000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-27 16:55:00', 'Thêm', false, false, false),
('5b53d71d-a079-459b-9278-e3349b6d711f', '05669d61-ae07-43c3-b865-45ade20ed8b8', 50000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-11 09:54:00', 'Thêm', false, false, false),
('6dd5b248-4566-4113-8e32-35cc4a7d786a', '05669d61-ae07-43c3-b865-45ade20ed8b8', 150000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-26 12:43:00', 'Thêm', false, false, false),
('da75fca6-87fa-4f30-9005-0b1c6c24645c', '05669d61-ae07-43c3-b865-45ade20ed8b8', 250000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-06-17 10:08:00', 'Thêm', false, false, false),
('3fe0ed37-7ec8-4372-9ea2-51a89b6f6787', '05669d61-ae07-43c3-b865-45ade20ed8b8', 100000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-07-18 14:08:00', 'GD mẫu', false, false, false),
('eb3dbaa0-ccbf-4d8d-9b26-a293818eb432', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 800000, 'EXPENSE', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', 'c5503d66-8415-4978-9cd5-7162787a222b', '2026-07-22 21:59:00', 'GD mẫu', false, false, false),
('127c3305-ce40-4f51-8fb2-e1e72605fafe', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 800000, 'INCOME', 'b5bfc6bb-8d0c-4802-abe1-21c35e98df65', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-17 15:01:00', 'GD mẫu', false, false, false),
('2e22cec0-f90a-4895-8210-f91df05320d8', 'fb2c5cdf-8fc5-4a5c-a265-8d9e934c90b5', 400000, 'TRANSFER', 'a0ee849a-9b23-4425-a1ca-d8c7cd1ab2a0', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-05 22:10:00', 'GD mẫu', false, false, false),
('f1361f09-e27d-4caf-bbdc-49fed2494c42', '05669d61-ae07-43c3-b865-45ade20ed8b8', 200000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-19 19:19:00', 'Thêm', false, false, false),
('f8d03a16-ce1a-43cf-8de6-7f4231c3a69d', '05669d61-ae07-43c3-b865-45ade20ed8b8', 150000, 'INCOME', 'b5bfc6bb-8d0c-4802-abe1-21c35e98df65', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-02 21:34:00', 'Thêm', false, false, false),
('1180dd9e-26e3-4aa6-8055-3720819841dd', '05669d61-ae07-43c3-b865-45ade20ed8b8', 250000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-08 07:16:00', 'Thêm', false, false, false),
('b2446038-d55e-4097-b968-77c46a421ada', '05669d61-ae07-43c3-b865-45ade20ed8b8', 150000, 'INCOME', 'b5bfc6bb-8d0c-4802-abe1-21c35e98df65', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-21 19:06:00', 'Thêm', false, false, false),
('b5ad1bcd-a4bb-4a4e-a4e5-1e4d102dff7f', '05669d61-ae07-43c3-b865-45ade20ed8b8', 200000, 'EXPENSE', '55b5f5f8-269c-4167-96dc-1fca8386396a', '335f6b33-35cb-4e38-9789-fb182b36241d', '2026-07-03 08:18:00', 'Thêm', false, false, false),
('413d5c3f-b8f6-41e3-a495-e1e595e5c7dd', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 1000000, 'EXPENSE', 'ec3fd4d2-40dc-41e5-b524-e63c22968ce6', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-05 09:05:00', 'GD mẫu', false, false, false),
('d2786169-871c-4b12-82d1-16196afade7a', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 600000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-05-14 17:36:00', 'GD mẫu', false, false, false),
('41221fcc-972d-4bd0-af67-760f9a2119c5', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 500000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-05-26 09:18:00', 'GD mẫu', false, false, false),
('3a55b73d-10d9-44c0-8c21-202ec5ec070a', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 200000, 'TRANSFER', 'b4bf2e8d-a067-4ec5-b130-eddd30756d67', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-04 22:41:00', 'GD mẫu', false, false, false),
('9b138b57-c3e1-43e8-9c7c-d5265b78c3e9', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 200000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-26 14:10:00', 'Thêm', false, false, false),
('4e285344-a040-44af-baeb-a6de8730096b', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 200000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-15 18:34:00', 'Thêm', false, false, false),
('3ea51e56-1980-452b-8ddb-415a1827c210', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 100000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-06 07:31:00', 'Thêm', false, false, false),
('86ef94a0-6473-42e7-8075-5f3bda24e627', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 50000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-20 15:12:00', 'Thêm', false, false, false),
('379d76e6-0792-4b7c-a29e-8044dc06960b', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 250000, 'EXPENSE', 'ec3fd4d2-40dc-41e5-b524-e63c22968ce6', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-05-16 19:16:00', 'Thêm', false, false, false),
('b35caaa1-4b7f-4e89-a9e1-e91ddb3d858a', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 700000, 'EXPENSE', 'ec3fd4d2-40dc-41e5-b524-e63c22968ce6', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-06-27 09:59:00', 'GD mẫu', false, false, false),
('7a6d08e3-8911-4e32-934b-2c2724bc0558', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 100000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-01 13:29:00', 'GD mẫu', false, false, false),
('32550ead-765f-4e45-a1d9-024f8c57798b', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 300000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-06-14 15:20:00', 'GD mẫu', false, false, false),
('ec7c534b-bbbd-4e15-bd4d-a9ace221af71', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 500000, 'TRANSFER', 'b4bf2e8d-a067-4ec5-b130-eddd30756d67', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-25 08:47:00', 'GD mẫu', false, false, false),
('667784e8-f32b-4391-8357-cb9ca99e3472', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 250000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-13 19:57:00', 'Thêm', false, false, false),
('9b662150-d50c-4831-bbf2-b8fbc81986d5', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 100000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-25 20:34:00', 'Thêm', false, false, false),
('d6f5d989-150c-40ae-8dd4-91f7dee83bdc', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 50000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-04 12:21:00', 'Thêm', false, false, false),
('9947d340-abc7-4a59-9c84-3154d9cec30b', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 150000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-10 20:25:00', 'Thêm', false, false, false),
('034f38c8-0300-42a9-a0cd-255d9ab7c0ef', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 50000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-06-23 10:37:00', 'Thêm', false, false, false),
('96506e28-d61c-4506-ac74-750d5373e3c8', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 900000, 'EXPENSE', 'ec3fd4d2-40dc-41e5-b524-e63c22968ce6', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-09 14:25:00', 'GD mẫu', false, false, false),
('aafad30f-5759-46a6-9743-effcaf0970c8', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 500000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-07-09 13:27:00', 'GD mẫu', false, false, false),
('f6e86a5b-0751-41bd-8a36-23ad92bf7521', '673649c6-90db-4f0d-bc1b-d4fe1d1b77ca', 500000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '43e36098-67fd-4f11-806d-f1807c8b8212', '2026-07-09 22:32:00', 'GD mẫu', false, false, false),
('481f5b84-5e58-494d-a171-67f30103942d', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 800000, 'TRANSFER', 'b4bf2e8d-a067-4ec5-b130-eddd30756d67', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-12 20:44:00', 'GD mẫu', false, false, false),
('ffa08b30-ad6a-420d-bc86-404960301afd', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 150000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-07 19:48:00', 'Thêm', false, false, false),
('0cad2caa-07b5-4a16-897c-885de6653819', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 150000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-18 21:59:00', 'Thêm', false, false, false),
('f33a7c4c-3a3d-4b07-a028-a24fe82c73cf', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 100000, 'TRANSFER', 'b4bf2e8d-a067-4ec5-b130-eddd30756d67', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-28 17:03:00', 'Thêm', false, false, false),
('b1c6414a-461d-498c-aff6-3dc0236a57b0', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 250000, 'EXPENSE', 'c9662d85-5ece-4f54-8266-fc9f9a5f85c2', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-15 17:53:00', 'Thêm', false, false, false),
('95312378-91ca-4a22-b9cb-4dac531fd0ca', '6bdb4155-f19d-428c-8b69-bcab05b111f1', 250000, 'INCOME', '53934183-09b6-4408-8981-eec250f8f2a9', '19a146c6-1edb-425f-988a-4d4ef7ce296c', '2026-07-22 15:51:00', 'Thêm', false, false, false),
('9e76e6c1-08b1-49ea-8914-9bef6a1a46c7', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 200000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-12 19:59:00', 'GD mẫu', false, false, false),
('7ef53243-5770-448f-a01d-7168ef465213', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 100000, 'EXPENSE', 'f899396a-bd53-40fd-a989-833cfb4c6b68', 'bf42611a-ee6f-46d5-82e0-f67a8d2fe040', '2026-05-18 12:00:00', 'GD mẫu', false, false, false),
('33bc9dd0-529d-4c2a-9d1d-e0d248eaa869', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 900000, 'INCOME', 'c1e2822d-f69a-484f-ac71-a684502d76f8', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-10 14:43:00', 'GD mẫu', false, false, false),
('8996dc54-c348-4373-8710-b7a260aae1bb', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 700000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-16 08:56:00', 'GD mẫu', false, false, false),
('ca8fe431-8326-41c9-87f1-6bbb39eed41b', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 250000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-05 15:10:00', 'Thêm', false, false, false),
('2666b5ee-2113-4e8f-94f4-05081af6f0ba', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-17 15:56:00', 'Thêm', false, false, false),
('7df33046-7da8-4b98-a21f-bf783450933c', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 150000, 'INCOME', 'c1e2822d-f69a-484f-ac71-a684502d76f8', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-19 22:23:00', 'Thêm', false, false, false),
('d8c8553e-9ee2-433b-aee5-ed52eee976a9', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 150000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-27 21:08:00', 'Thêm', false, false, false),
('14ad777b-724c-4ea9-99b9-81ebba3df2d4', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 250000, 'EXPENSE', 'f899396a-bd53-40fd-a989-833cfb4c6b68', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-05-16 19:31:00', 'Thêm', false, false, false),
('74c4a3b7-1a8b-4601-8bdd-4dbda480fec0', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-23 20:28:00', 'GD mẫu', false, false, false),
('20e869ad-a7a7-49ff-b840-652ecb350d68', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 600000, 'EXPENSE', 'f899396a-bd53-40fd-a989-833cfb4c6b68', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-26 10:53:00', 'GD mẫu', false, false, false),
('601d8755-dbcb-4d0f-90ac-7b140038b45d', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 100000, 'INCOME', 'c1e2822d-f69a-484f-ac71-a684502d76f8', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-09 12:43:00', 'GD mẫu', false, false, false),
('76c3036c-71c5-4337-b242-51db4b58b3a6', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 400000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', 'bf42611a-ee6f-46d5-82e0-f67a8d2fe040', '2026-06-23 08:33:00', 'GD mẫu', false, false, false),
('8edb99fd-2203-40c9-b3da-6b3ffbb6bb35', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'EXPENSE', 'f899396a-bd53-40fd-a989-833cfb4c6b68', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-04 20:17:00', 'Thêm', false, false, false),
('c63bb990-ccb4-498a-a656-2dc4621f0dd5', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 50000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-06 08:54:00', 'Thêm', false, false, false),
('cdcf496c-ce9d-4d47-8710-b82cd6d258ba', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 250000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-22 19:26:00', 'Thêm', false, false, false),
('dc7c3d31-0ed2-4de4-8653-9ca4eb39c59a', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 50000, 'INCOME', 'c1e2822d-f69a-484f-ac71-a684502d76f8', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-24 14:40:00', 'Thêm', false, false, false),
('3ce95268-1e7d-4087-8e01-0dd11d10047a', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 150000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-06-07 20:54:00', 'Thêm', false, false, false),
('bd9d07eb-b30d-4a70-8e0f-b7a1a28ce31b', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 1000000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', 'bf42611a-ee6f-46d5-82e0-f67a8d2fe040', '2026-07-15 19:14:00', 'GD mẫu', false, false, false),
('1da20c4a-42dc-4459-af68-fde30bdb5dec', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 500000, 'EXPENSE', 'f899396a-bd53-40fd-a989-833cfb4c6b68', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-09 13:12:00', 'GD mẫu', false, false, false),
('11e525dc-3a58-489c-9490-376e96f6638e', '94e5e03b-f72e-4a8e-84f6-f639bb40bb98', 400000, 'INCOME', 'c1e2822d-f69a-484f-ac71-a684502d76f8', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-14 16:06:00', 'GD mẫu', false, false, false),
('1ae56d1a-609b-4894-8502-eb18a1532b21', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', 'bf42611a-ee6f-46d5-82e0-f67a8d2fe040', '2026-07-12 12:55:00', 'GD mẫu', false, false, false),
('668406c8-ace2-430c-abba-e5fdacae38f8', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 100000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-06 21:23:00', 'Thêm', false, false, false),
('7b9fbcbe-b55d-4dac-9a93-c8e5ed174994', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 50000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-17 13:32:00', 'Thêm', false, false, false),
('a0e19afa-8221-405b-8db6-e19928010b3f', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 50000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-13 21:39:00', 'Thêm', false, false, false),
('0e8b8043-5301-4fa7-ae2e-a54fb6ad1413', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'EXPENSE', '4aee874c-e271-4529-8ad6-07b123fd6322', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-23 14:41:00', 'Thêm', false, false, false),
('12199b69-6dc9-4fc5-9a27-375995999ac9', 'a796b5f4-e1f3-4832-a942-7459ed5c7bd0', 200000, 'TRANSFER', '6af2cf7c-6629-4d7a-9500-f02a58687891', '6db82b09-e596-4287-bf1f-aeee250ea2b7', '2026-07-09 14:58:00', 'Thêm', false, false, false);

INSERT INTO transaction_tags (transaction_id, tag_id) VALUES
('f8ac8e91-1f43-4b9b-938d-9449187c7dbe', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('250fcde2-7210-416d-bf60-6a57aaf8f628', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('714a21c7-b96c-47be-a84f-b061c5b3254e', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('c790dc63-04c8-45a4-855a-2c2cbd3f0015', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('b5e84457-28b0-4bd1-b05b-7072128a5773', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('0827a937-feab-4852-a7ef-7d68efaefc5b', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('d4c81e53-a240-4e21-86e9-1b67e110b22b', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('5420df97-9697-474a-9546-d3a80533c1c3', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('15afd490-752b-45b1-bbeb-74735aad7960', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('6beca9d8-b1c7-4eda-9268-73e9a63798a9', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('f7e7d1df-5b3d-42d4-8a0f-4bb4abf9a123', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('c7a362c5-d3a0-4a17-86dd-d1553839f62a', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('19363e74-2367-44be-8cb8-1ffd1d803c11', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('50c127ab-ea67-483a-b642-1ec23c6782d9', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('6ba7e615-2439-4a0b-a471-b0af93714d42', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('bc8ca064-ef1b-44a6-84cb-4834c4b52a65', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('6a7d929b-7dfb-4a79-a9f8-91978c2d4bf4', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('f5827ba5-3784-43ea-98b8-3a00af5a32e0', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('1af948b8-8ea0-4bf3-b1a2-86a4fcb713ae', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('cd8ccbcb-5e16-4ad9-807f-74c69d9429e8', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('24a52106-84c3-4cc6-84d3-5a2625f4d7ff', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('3de09fb8-693b-4d06-8e32-b4013387ce69', '30718189-4910-4c59-8838-0e7fa03f7f47'),
('d11f5a91-278f-48b5-8a4a-d3af2bf876c2', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('493d6e79-b812-4be9-810c-3b457405f068', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('776081aa-546e-4fcd-b335-b5ad321fb33d', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('fccc0d5b-6c75-4a49-9bef-0bf9293c482d', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('3d9e1530-0668-414e-b79a-fc6b82c74e1a', 'bf5b882c-8897-4142-8a7c-a6239baf471b'),
('8cb7275d-a1a3-4412-a394-c22d4a4186a8', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('acbcdc54-3e3e-472c-b081-72b7574986a0', '60927223-efeb-4b78-ae58-373e6c38479e'),
('1466aea9-40f8-471e-b0db-bb1d84335696', '60927223-efeb-4b78-ae58-373e6c38479e'),
('898ec90c-c12a-4187-b0b7-e429f86d5032', '60927223-efeb-4b78-ae58-373e6c38479e'),
('c2aaba3b-4ac7-4523-822e-e09d6118044b', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('ba1ad777-fed1-49a4-996a-c73f321fced5', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('00074703-69e7-48f4-862a-4b89e948a180', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('bde76df2-1317-40a4-8fcf-a586444f819e', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('74887106-00d3-48f5-afcb-34781ed0bebb', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('c686d446-b856-4c96-b1f4-967d73d11be6', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('2cd5f8af-522b-4723-a653-4baed40b743a', '60927223-efeb-4b78-ae58-373e6c38479e'),
('44d22f38-fc83-4584-86e8-e1960c254bc7', '60927223-efeb-4b78-ae58-373e6c38479e'),
('d46ae6c3-03ae-491a-97f5-cb71546bda3b', '60927223-efeb-4b78-ae58-373e6c38479e'),
('e3703a7c-9b8c-45f4-b423-96611501f071', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('d08edc23-2f63-4614-aad0-f719e8179f41', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('14d1fec4-b772-4692-a8da-98b779ae8a7d', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('7f309199-7597-4150-bf74-076730886320', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('28e18ccc-1f43-421d-b983-1e91893accf5', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('6a0b688d-33ef-411b-827b-83dd427ffd4e', '60927223-efeb-4b78-ae58-373e6c38479e'),
('f67f534b-e194-49ef-8700-b73f393cf524', '60927223-efeb-4b78-ae58-373e6c38479e'),
('f0f0b7d5-89e9-42c3-ab71-2df383d49aa8', '60927223-efeb-4b78-ae58-373e6c38479e'),
('12d210c3-f46c-44b1-817c-3f1150460b96', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('f32b9bee-fe56-4936-943d-a4db1c83ff80', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('72e39f00-26cc-4abb-b863-992784c30ff6', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('87b9aab5-cca6-4259-9efe-1f6f490eee4f', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('11261c3c-0051-4afb-bc07-9487545ffbd7', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('dab3f3ab-8330-4d54-a8b2-4707af21a0ed', 'e7ca6bab-cda2-4468-8623-691dd10d5b74'),
('a34ae431-d16b-4704-912b-f1557e952fa8', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('ed562ddd-d0a3-40e8-890c-6d1a446d7aa8', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('f99191ad-05bb-40ba-8752-fc2bc1fe011f', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('8a07c469-2a9a-4297-94c9-8338d9bbeb7e', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('699c6c9f-f7de-4112-a460-ee1f95606cdb', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('26ae7937-2f5d-41bc-9336-fe0489bd8f89', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('670b8ca8-d6ec-4cc3-bf95-428666d967c9', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('a735dec4-6f7e-41c8-96c4-8b0cee2bf155', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('03ea680d-a655-4203-8b2f-15368cf6125c', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('e5836d19-d7d7-4c6d-981a-9d5b36ac06a4', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('41506a86-9983-481d-9fba-f07dfeb08d1e', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('cd63b411-00bf-450b-badc-526bf8eed46d', 'bfefd179-69e8-42e8-87ea-af2682b5d9e5'),
('bc127c89-f253-4d5a-96ab-c63d90c09472', 'bfefd179-69e8-42e8-87ea-af2682b5d9e5'),
('0433e026-2fc3-4b5c-a526-8ad4a8f6c26b', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('8aa79237-c772-4bc7-847a-1193a49ac392', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('5b53d71d-a079-459b-9278-e3349b6d711f', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('6dd5b248-4566-4113-8e32-35cc4a7d786a', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('da75fca6-87fa-4f30-9005-0b1c6c24645c', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('3fe0ed37-7ec8-4372-9ea2-51a89b6f6787', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('eb3dbaa0-ccbf-4d8d-9b26-a293818eb432', 'bfefd179-69e8-42e8-87ea-af2682b5d9e5'),
('127c3305-ce40-4f51-8fb2-e1e72605fafe', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('2e22cec0-f90a-4895-8210-f91df05320d8', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('f1361f09-e27d-4caf-bbdc-49fed2494c42', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('f8d03a16-ce1a-43cf-8de6-7f4231c3a69d', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('1180dd9e-26e3-4aa6-8055-3720819841dd', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('b2446038-d55e-4097-b968-77c46a421ada', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('b5ad1bcd-a4bb-4a4e-a4e5-1e4d102dff7f', '9a77048b-7cb6-4c9c-a1cb-c98b28238c9f'),
('413d5c3f-b8f6-41e3-a495-e1e595e5c7dd', '8e469865-8c44-43a5-8bf0-b688a1c7de82'),
('d2786169-871c-4b12-82d1-16196afade7a', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('41221fcc-972d-4bd0-af67-760f9a2119c5', '8e469865-8c44-43a5-8bf0-b688a1c7de82'),
('3a55b73d-10d9-44c0-8c21-202ec5ec070a', '8e469865-8c44-43a5-8bf0-b688a1c7de82'),
('9b138b57-c3e1-43e8-9c7c-d5265b78c3e9', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('4e285344-a040-44af-baeb-a6de8730096b', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('3ea51e56-1980-452b-8ddb-415a1827c210', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('86ef94a0-6473-42e7-8075-5f3bda24e627', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('379d76e6-0792-4b7c-a29e-8044dc06960b', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('b35caaa1-4b7f-4e89-a9e1-e91ddb3d858a', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('7a6d08e3-8911-4e32-934b-2c2724bc0558', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('32550ead-765f-4e45-a1d9-024f8c57798b', '8e469865-8c44-43a5-8bf0-b688a1c7de82'),
('ec7c534b-bbbd-4e15-bd4d-a9ace221af71', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('667784e8-f32b-4391-8357-cb9ca99e3472', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('9b662150-d50c-4831-bbf2-b8fbc81986d5', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('d6f5d989-150c-40ae-8dd4-91f7dee83bdc', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('9947d340-abc7-4a59-9c84-3154d9cec30b', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('034f38c8-0300-42a9-a0cd-255d9ab7c0ef', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('96506e28-d61c-4506-ac74-750d5373e3c8', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('aafad30f-5759-46a6-9743-effcaf0970c8', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('f6e86a5b-0751-41bd-8a36-23ad92bf7521', '8e469865-8c44-43a5-8bf0-b688a1c7de82'),
('481f5b84-5e58-494d-a171-67f30103942d', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('ffa08b30-ad6a-420d-bc86-404960301afd', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('0cad2caa-07b5-4a16-897c-885de6653819', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('f33a7c4c-3a3d-4b07-a028-a24fe82c73cf', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('b1c6414a-461d-498c-aff6-3dc0236a57b0', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('95312378-91ca-4a22-b9cb-4dac531fd0ca', 'a569e05c-1337-4a1a-be9c-c57a774a37c9'),
('9e76e6c1-08b1-49ea-8914-9bef6a1a46c7', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('7ef53243-5770-448f-a01d-7168ef465213', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('33bc9dd0-529d-4c2a-9d1d-e0d248eaa869', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('8996dc54-c348-4373-8710-b7a260aae1bb', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('ca8fe431-8326-41c9-87f1-6bbb39eed41b', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('2666b5ee-2113-4e8f-94f4-05081af6f0ba', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('7df33046-7da8-4b98-a21f-bf783450933c', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('d8c8553e-9ee2-433b-aee5-ed52eee976a9', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('14ad777b-724c-4ea9-99b9-81ebba3df2d4', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('74c4a3b7-1a8b-4601-8bdd-4dbda480fec0', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('20e869ad-a7a7-49ff-b840-652ecb350d68', 'd86ec131-5aa3-49c8-8b9e-89a92c89dca6'),
('601d8755-dbcb-4d0f-90ac-7b140038b45d', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('76c3036c-71c5-4337-b242-51db4b58b3a6', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('8edb99fd-2203-40c9-b3da-6b3ffbb6bb35', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('c63bb990-ccb4-498a-a656-2dc4621f0dd5', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('cdcf496c-ce9d-4d47-8710-b82cd6d258ba', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('dc7c3d31-0ed2-4de4-8653-9ca4eb39c59a', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('3ce95268-1e7d-4087-8e01-0dd11d10047a', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('bd9d07eb-b30d-4a70-8e0f-b7a1a28ce31b', 'd86ec131-5aa3-49c8-8b9e-89a92c89dca6'),
('1da20c4a-42dc-4459-af68-fde30bdb5dec', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('11e525dc-3a58-489c-9490-376e96f6638e', 'd86ec131-5aa3-49c8-8b9e-89a92c89dca6'),
('1ae56d1a-609b-4894-8502-eb18a1532b21', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('668406c8-ace2-430c-abba-e5fdacae38f8', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('7b9fbcbe-b55d-4dac-9a93-c8e5ed174994', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('a0e19afa-8221-405b-8db6-e19928010b3f', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('0e8b8043-5301-4fa7-ae2e-a54fb6ad1413', 'aee5828b-e92e-42fb-9778-92d90e8a1e99'),
('12199b69-6dc9-4fc5-9a27-375995999ac9', 'aee5828b-e92e-42fb-9778-92d90e8a1e99');

INSERT INTO transaction_splits (id, transaction_id, category_id, amount, note) VALUES
('daaf3c64-e90c-4505-b917-04475e9a1fbf', '250fcde2-7210-416d-bf60-6a57aaf8f628', '732ac542-e706-4255-ad22-81ca96ed832b', 100000, 'P1'),
('dbaf8d21-0b76-4353-93a9-362213929c87', '250fcde2-7210-416d-bf60-6a57aaf8f628', '4d60eabd-76a6-485d-b19d-cff1d33f5c64', 100000, 'P2'),
('cc7ab493-e056-4afa-8c76-063c62b2cb66', '2cd5f8af-522b-4723-a653-4baed40b743a', 'abc3f809-f026-4909-9421-c56ee49b23a6', 200000, 'P1'),
('2a785e89-721f-4e45-91f8-c9a56e03b764', '2cd5f8af-522b-4723-a653-4baed40b743a', '7247d92f-000d-41b2-b994-d3710a282708', 200000, 'P2'),
('3df33f51-3335-452f-abcc-464db0650e65', 'f67f534b-e194-49ef-8700-b73f393cf524', 'abc3f809-f026-4909-9421-c56ee49b23a6', 50000, 'P1'),
('fb5c8c7d-e970-4d75-822b-01bc169f7ccb', 'f67f534b-e194-49ef-8700-b73f393cf524', '7247d92f-000d-41b2-b994-d3710a282708', 50000, 'P2'),
('3ef95fdd-2317-4bbe-8efa-3e9d2ef62068', 'a34ae431-d16b-4704-912b-f1557e952fa8', '55b5f5f8-269c-4167-96dc-1fca8386396a', 100000, 'P1'),
('c38755de-aea0-4e3a-af77-797784abc9aa', 'a34ae431-d16b-4704-912b-f1557e952fa8', 'c393e38b-c36b-4570-b9d6-b44f394d8aee', 100000, 'P2');

