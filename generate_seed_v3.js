const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Generates dates strictly between 2026-01-01 and 2026-07-28
function randomDate(year, month) {
    const maxDay = (month === 7) ? 28 : 28;
    const d = randomInt(1, maxDay).toString().padStart(2, '0');
    const h = randomInt(7, 22).toString().padStart(2, '0');
    const m = randomInt(0, 59).toString().padStart(2, '0');
    const mStr = month.toString().padStart(2, '0');
    return `${year}-${mStr}-${d} ${h}:${m}:00`;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const users = [
    { id: '1a111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn A (Thông Thái)', email: 'nguyenvana@gmail.com', avatar: 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff' },
    { id: '1b111111-1111-4111-a111-111111111111', name: 'Trần Thị B (Tiêu Lố)', email: 'tranthib@gmail.com', avatar: 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff' },
    { id: '1c111111-1111-4111-a111-111111111111', name: 'Lê Thị C (Trùm Nhóm)', email: 'lethic@gmail.com', avatar: 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff' },
    { id: '1d111111-1111-4111-a111-111111111111', name: 'Phạm Văn D (Con Nợ)', email: 'phamvand@gmail.com', avatar: 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff' },
    { id: '1e111111-1111-4111-a111-111111111111', name: 'Hoàng Thị E (Newbie)', email: 'hoangthie@gmail.com', avatar: 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff' }
];

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED V3 (2026-01-01 to Present 2026-07-28)
-- ============================================================================

-- Xóa dữ liệu cũ an toàn: Kiểm tra sự tồn tại của bảng trước khi xóa (tránh lỗi 42P01 relation does not exist)
DO $$ 
DECLARE 
    tbl text;
    tbls text[] := ARRAY[
        'transaction_tags', 'transaction_splits', 'payments', 'expense_splits', 
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

-- 1. USERS (Tạo từ 2026-01-01)
INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES
`;

const userValues = users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', NULL, NULL, '2026-01-01 08:00:00')`);
sql += userValues.join(',\n') + ';\n\n';

let walletsSQL = 'INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES\n';
let categoriesSQL = 'INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n';
let payeesSQL = 'INSERT INTO payees (id, user_id, name) VALUES\n';
let tagsSQL = 'INSERT INTO tags (id, user_id, name) VALUES\n';
let loansSQL = 'INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled, created_at) VALUES\n';
let savingsSQL = 'INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at) VALUES\n';
let budgetsSQL = 'INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, is_mandatory) VALUES\n';
let notifSQL = 'INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES\n';
let groupsSQL = 'INSERT INTO groups (id, name, description, owner_id, created_at) VALUES\n';
let groupMembersSQL = 'INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES\n';
let expensesSQL = 'INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES\n';
let expenseSplitsSQL = 'INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n';
let paymentsSQL = 'INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES\n';
let transactionsSQL = 'INSERT INTO transactions (id, wallet_id, amount, type, category_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated, created_at) VALUES\n';
let txTagsSQL = 'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES\n';
let txSplitsSQL = 'INSERT INTO transaction_splits (id, parent_transaction_id, category_id, amount, note) VALUES\n';

const state = {
    wallets: [], categories: [], payees: [], tags: [], loans: [], savings: [],
    budgets: [], notifs: [], groups: [], groupMembers: [], expenses: [],
    expenseSplits: [], payments: [], txs: [], txTags: [], txSplits: []
};

users.forEach(u => {
    const w1 = uuid(); const w2 = uuid();
    state.wallets.push(`('${w1}', '${u.id}', 'Tiền mặt', 50000000, 'VND', false, '2026-01-01 08:00:00')`);
    state.wallets.push(`('${w2}', '${u.id}', 'Thẻ tín dụng', -5000000, 'VND', true, '2026-01-01 08:00:00')`);

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

    const cArr = [];
    const categoryMap = {};

    defaultCategories.forEach(cat => {
        const cId = uuid();
        state.categories.push(`('${cId}', '${u.id}', '${cat.name}', '${cat.type}', '${cat.icon}')`);
        cArr.push({ id: cId, type: cat.type, name: cat.name });
        categoryMap[cat.name] = cId;
    });

    const p1 = uuid(); const p2 = uuid(); const p3 = uuid();
    state.payees.push(`('${p1}', '${u.id}', 'Siêu thị CoopMart')`);
    state.payees.push(`('${p2}', '${u.id}', 'Công ty Cổ Phần')`);
    state.payees.push(`('${p3}', '${u.id}', 'Cửa hàng tiện lợi')`);
    const pArr = [p1, p2, p3];

    const t1 = uuid(); const t2 = uuid(); const t3 = uuid();
    state.tags.push(`('${t1}', '${u.id}', 'Gia đình')`);
    state.tags.push(`('${t2}', '${u.id}', 'Cá nhân')`);
    state.tags.push(`('${t3}', '${u.id}', 'Du lịch')`);
    const tArr = [t1, t2, t3];

    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng VIB', 20000000, 5, '2026-01-15', '2026-12-31', 'Vay tiêu dùng', false, '2026-01-15 09:00:00')`);
    state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Đồng nghiệp', 5000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn tạm', false, '2026-05-01 10:00:00')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ mua xe', 100000000, 25000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Bạn đã tiêu 80% ngân sách ăn uống', 'WARNING', false, '2026-07-20 08:00:00')`);

    const gId = uuid();
    state.groups.push(`('${gId}', 'Nhóm du lịch của ${u.name}', 'Quỹ đi chơi chung', '${u.id}', '2026-01-01 08:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${gId}', '${u.id}', 'owner', '2026-01-01 08:00:00')`);
    
    const otherUsers = users.filter(x => x.id !== u.id);
    const m1 = otherUsers[0]; const m2 = otherUsers[1];
    state.groupMembers.push(`('${uuid()}', '${gId}', '${m1.id}', 'member', '2026-01-01 08:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${gId}', '${m2.id}', 'member', '2026-01-01 08:00:00')`);

    // Dynamic budget setup for all expense categories per month
    const budgetConfigs = [
        { name: 'Ăn uống', limit: 5000000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Chi tiêu hàng ngày', limit: 2000000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Tiền điện', limit: 2000000, type: 'BILL', mandatory: true },
        { name: 'Phí liên lạc', limit: 1500000, type: 'BILL', mandatory: true },
        { name: 'Phí giao lưu', limit: 1500000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Mỹ phẩm', limit: 1000000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Tiền nhà', limit: 5000000, type: 'BILL', mandatory: true },
        { name: 'Quần áo', limit: 2000000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Đi lại', limit: 1500000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Y tế', limit: 1000000, type: 'FLEXIBLE', mandatory: false }
    ];

    // Loop 7 months (January 2026 to July 2026)
    for (let m = 1; m <= 7; m++) {
        const mStr = m.toString().padStart(2, '0');
        
        // Monthly Budgets for all main expense categories
        budgetConfigs.forEach(bConfig => {
            const catId = categoryMap[bConfig.name];
            if (catId) {
                state.budgets.push(`('${uuid()}', '${u.id}', '${catId}', 'Ngân sách ${bConfig.name} T${m}', ${bConfig.limit}, ${m}, 2026, '${bConfig.type}', true, ${bConfig.mandatory})`);
            }
        });

        // Group expenses
        const expId = uuid();
        const expDate = (m === 7) ? '2026-07-15 12:00:00' : `2026-${mStr}-15 12:00:00`;
        state.expenses.push(`('${expId}', '${gId}', '${u.id}', 'Nhậu cuối tháng ${m}', 3000000, 'Ăn uống', '${expDate}')`);
        state.expenseSplits.push(`('${uuid()}', '${expId}', '${u.id}', 1000000, true)`);
        const isSettled = m < 7;
        state.expenseSplits.push(`('${uuid()}', '${expId}', '${m1.id}', 1000000, ${isSettled})`);
        state.expenseSplits.push(`('${uuid()}', '${expId}', '${m2.id}', 1000000, true)`);
        const payDate = (m === 7) ? '2026-07-20 15:00:00' : `2026-${mStr}-20 15:00:00`;
        state.payments.push(`('${uuid()}', '${gId}', '${m2.id}', '${u.id}', 1000000, 'completed', '${payDate}')`);

        // Category transactions
        cArr.forEach(cat => {
            for (let j = 0; j < 2; j++) {
                const txId = uuid();
                const amt = randomInt(1, 15) * 50000;
                const pid = randomElement(pArr);
                const d = randomDate(2026, m);
                // Use w1 (Tiền mặt - is_liability = false) for EXPENSE transactions so budget calculations aggregate them
                const w = (cat.type === 'EXPENSE') ? w1 : randomElement([w1, w2]);
                const isSplit = (cat.type === 'EXPENSE' && Math.random() > 0.85);
                state.txs.push(`('${txId}', '${w}', ${amt}, '${cat.type}', '${cat.id}', '${pid}', '${d}', 'Chi tiêu ${cat.name} T${m}', ${isSplit}, false, false, '${d}')`);
                state.txTags.push(`('${txId}', '${randomElement(tArr)}')`);
                
                if (isSplit && cat.type === 'EXPENSE') {
                    const otherCat = randomElement(cArr.filter(c => c.type === 'EXPENSE' && c.id !== cat.id)) || { id: categoryMap['Chi tiêu hàng ngày'] };
                    state.txSplits.push(`('${uuid()}', '${txId}', '${cat.id}', ${Math.floor(amt / 2)}, 'Tiền ${cat.name}')`);
                    state.txSplits.push(`('${uuid()}', '${txId}', '${otherCat.id}', ${Math.ceil(amt / 2)}, 'Tiền mua thêm')`);
                }
            }
        });

        // 10 random extra transactions per month
        for (let i = 0; i < 10; i++) {
            const cat = randomElement(cArr);
            const txId = uuid();
            const w = (cat.type === 'EXPENSE') ? w1 : randomElement([w1, w2]);
            const d = randomDate(2026, m);
            state.txs.push(`('${txId}', '${w}', ${randomInt(1, 8) * 50000}, '${cat.type}', '${cat.id}', '${randomElement(pArr)}', '${d}', 'Phát sinh T${m}', false, false, false, '${d}')`);
            state.txTags.push(`('${txId}', '${randomElement(tArr)}')`);
        }
    }
});

function append(header, arr) {
    if (arr.length === 0) return '';
    return header + arr.join(',\n') + ';\n\n';
}

sql += append(walletsSQL, state.wallets);
sql += append(categoriesSQL, state.categories);
sql += append(payeesSQL, state.payees);
sql += append(tagsSQL, state.tags);
sql += append(loansSQL, state.loans);
sql += append(savingsSQL, state.savings);
sql += append(budgetsSQL, state.budgets);
sql += append(notifSQL, state.notifs);
sql += append(groupsSQL, state.groups);
sql += append(groupMembersSQL, state.groupMembers);
sql += append(expensesSQL, state.expenses);
sql += append(expenseSplitsSQL, state.expenseSplits);
sql += append(paymentsSQL, state.payments);
sql += '-- ========================= TRANSACTIONS =========================\n';
sql += append(transactionsSQL, state.txs);
sql += append(txTagsSQL, state.txTags);
sql += append(txSplitsSQL, state.txSplits);

fs.writeFileSync('seed_v3.sql', sql, 'utf8');
console.log('Successfully regenerated seed_v3.sql with complete budget coverage for all expense categories!');
