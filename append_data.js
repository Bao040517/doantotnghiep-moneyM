const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(year, month) {
    const d = randomInt(1, 28).toString().padStart(2, '0');
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

let sql = `
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
`;
const userValues = users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', NULL, NULL, '2025-07-01 08:00:00')`);
sql += userValues.join(',\n') + ';\n\n';

let walletsSQL = 'INSERT INTO wallets (id, user_id, name, balance, currency, is_liability, created_at) VALUES\n';
let categoriesSQL = 'INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n';
let payeesSQL = 'INSERT INTO payees (id, user_id, name) VALUES\n';
let tagsSQL = 'INSERT INTO tags (id, user_id, name, color) VALUES\n';
let loansSQL = 'INSERT INTO external_loans (id, user_id, type, counterparty_name, principal_amount, interest_rate, start_date, due_date, description, is_settled) VALUES\n';
let savingsSQL = 'INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline_date, status, created_at) VALUES\n';
let budgetsSQL = 'INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, is_mandatory) VALUES\n';
let notifSQL = 'INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES\n';
let groupsSQL = 'INSERT INTO groups (id, name, description, owner_id) VALUES\n';
let groupMembersSQL = 'INSERT INTO group_members (id, group_id, user_id, role) VALUES\n';
let expensesSQL = 'INSERT INTO expenses (id, group_id, paid_by, title, amount, category) VALUES\n';
let expenseSplitsSQL = 'INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n';
let paymentsSQL = 'INSERT INTO payments (id, expense_id, payer_id, receiver_id, amount, payment_date, note) VALUES\n';
let transactionsSQL = 'INSERT INTO transactions (id, wallet_id, amount, type, category_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated) VALUES\n';
let txTagsSQL = 'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES\n';
let txSplitsSQL = 'INSERT INTO transaction_splits (id, transaction_id, category_id, amount, note) VALUES\n';

const state = { wallets: [], categories: [], payees: [], tags: [], loans: [], savings: [], budgets: [], notifs: [], groups: [], groupMembers: [], expenses: [], expenseSplits: [], payments: [], txs: [], txTags: [], txSplits: [] };

users.forEach(u => {
    const w1 = uuid(); const w2 = uuid();
    state.wallets.push(`('${w1}', '${u.id}', 'Tiền mặt', 5000000, 'VND', false, '2025-07-01 08:00:00')`);
    state.wallets.push(`('${w2}', '${u.id}', 'Thẻ tín dụng', -1000000, 'VND', true, '2025-07-01 08:00:00')`);
    const wArr = [w1, w2];

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
    let anUongId = null;
    let muaSamId = null;

    defaultCategories.forEach(cat => {
        const cId = uuid();
        state.categories.push(`('${cId}', '${u.id}', '${cat.name}', '${cat.type}', '${cat.icon}')`);
        cArr.push({ id: cId, type: cat.type, name: cat.name });
        if (cat.name === 'Ăn uống') anUongId = cId;
        if (cat.name === 'Chi tiêu hàng ngày') muaSamId = cId; // fallback for split
    });

    const p1 = uuid(); const p2 = uuid();
    state.payees.push(`('${p1}', '${u.id}', 'Siêu thị')`);
    state.payees.push(`('${p2}', '${u.id}', 'Công ty')`);
    const pArr = [p1, p2];

    const t1 = uuid(); const t2 = uuid();
    state.tags.push(`('${t1}', '${u.id}', 'Gia đình', '#FF0000')`);
    state.tags.push(`('${t2}', '${u.id}', 'Cá nhân', '#0000FF')`);
    const tArr = [t1, t2];

    state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Bạn bè', 5000000, 0, '2026-01-01', '2026-12-31', 'Vay tiền', false)`);
    state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Đồng nghiệp', 2000000, 0, '2026-05-01', '2026-08-01', 'Cho mượn', false)`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ', 50000000, 15000000, '2027-12-31', 'IN_PROGRESS', '2026-01-01 08:00:00')`);
    state.budgets.push(`('${uuid()}', '${u.id}', '${anUongId}', 'Ngân sách Ăn uống', 4000000, 7, 2026, 'FLEXIBLE', false, false)`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Cảnh báo', 'Bạn đã tiêu nhiều', 'WARNING', false, '2026-07-20 08:00:00')`);

    const gId = uuid();
    state.groups.push(`('${gId}', 'Nhóm của ${u.name}', 'Mô tả', '${u.id}')`);
    state.groupMembers.push(`('${uuid()}', '${gId}', '${u.id}', 'owner')`);
    
    const otherUsers = users.filter(x => x.id !== u.id);
    const m1 = otherUsers[0]; const m2 = otherUsers[1];
    state.groupMembers.push(`('${uuid()}', '${gId}', '${m1.id}', 'member')`);
    state.groupMembers.push(`('${uuid()}', '${gId}', '${m2.id}', 'member')`);

    const expId = uuid();
    state.expenses.push(`('${expId}', '${gId}', '${u.id}', 'Ăn nhậu', 1500000, 'Ăn uống')`);
    state.expenseSplits.push(`('${uuid()}', '${expId}', '${u.id}', 500000, true)`);
    state.expenseSplits.push(`('${uuid()}', '${expId}', '${m1.id}', 500000, false)`);
    state.expenseSplits.push(`('${uuid()}', '${expId}', '${m2.id}', 500000, true)`);
    state.payments.push(`('${uuid()}', '${expId}', '${m2.id}', '${u.id}', 500000, '2026-07-21 08:00:00', 'Trả tiền')`);

    for (let m = 5; m <= 7; m++) {
        cArr.forEach(cat => {
            const txId = uuid();
            const amt = randomInt(1, 10) * 100000;
            const pid = randomElement(pArr);
            const d = randomDate(2026, m);
            const w = randomElement(wArr);
            const isSplit = (cat.type === 'EXPENSE' && Math.random() > 0.9);
            state.txs.push(`('${txId}', '${w}', ${amt}, '${cat.type}', '${cat.id}', '${pid}', '${d}', 'GD mẫu', ${isSplit}, false, false)`);
            state.txTags.push(`('${txId}', '${randomElement(tArr)}')`);
            if (isSplit && cat.type === 'EXPENSE') {
                const otherCat = randomElement(cArr.filter(c => c.type === 'EXPENSE' && c.id !== cat.id)) || {id: muaSamId};
                state.txSplits.push(`('${uuid()}', '${txId}', '${cat.id}', ${Math.floor(amt/2)}, 'Phần 1')`);
                state.txSplits.push(`('${uuid()}', '${txId}', '${otherCat.id}', ${Math.ceil(amt/2)}, 'Phần 2')`);
            }
        });

        for (let i = 0; i < 5; i++) {
            const cat = randomElement(cArr);
            const txId = uuid();
            state.txs.push(`('${txId}', '${w1}', ${randomInt(1, 5) * 50000}, '${cat.type}', '${cat.id}', '${p1}', '${randomDate(2026, m)}', 'Thêm', false, false, false)`);
            state.txTags.push(`('${txId}', '${t1}')`);
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

const fileContent = fs.readFileSync('seed_1_year.sql', 'utf8');
const marker = 'DELETE FROM transaction_tags;';
const parts = fileContent.split(marker);

if (parts.length > 1) {
    fs.writeFileSync('seed_1_year.sql', parts[0] + sql, 'utf8');
    console.log('Successfully appended complete seed data to existing schema!');
} else {
    console.error('Marker not found!');
}
