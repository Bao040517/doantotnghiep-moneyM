const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Format date string for Postgres timestamp
function formatDate(year, month, day, hour, minute) {
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    const hStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    return `${year}-${mStr}-${dStr} ${hStr}:${minStr}:00`;
}

const users = [
    { id: '1a111111-1111-4111-a111-111111111111', name: 'Nguyễn Văn A (Thông Thái)', email: 'nguyenvana@gmail.com', avatar: 'https://ui-avatars.com/api/?name=A&background=0D8ABC&color=fff', baseSalary: 32000000, rentAmt: 6000000, persona: 'SAVER', years: [2025, 2026], startYear: 2025 },
    { id: '1b111111-1111-4111-a111-111111111111', name: 'Trần Thị B (Tiêu Lố)', email: 'tranthib@gmail.com', avatar: 'https://ui-avatars.com/api/?name=B&background=10B981&color=fff', baseSalary: 18000000, rentAmt: 4500000, persona: 'SPENDER', years: [2026], startYear: 2026 },
    { id: '1c111111-1111-4111-a111-111111111111', name: 'Lê Thị C (Trùm Nhóm)', email: 'lethic@gmail.com', avatar: 'https://ui-avatars.com/api/?name=C&background=F43F5E&color=fff', baseSalary: 25000000, rentAmt: 5000000, persona: 'GROUP_LEADER', years: [2026], startYear: 2026 },
    { id: '1d111111-1111-4111-a111-111111111111', name: 'Phạm Văn D (Con Nợ)', email: 'phamvand@gmail.com', avatar: 'https://ui-avatars.com/api/?name=D&background=8B5CF6&color=fff', baseSalary: 14000000, rentAmt: 3500000, persona: 'DEBTOR', years: [2026], startYear: 2026 },
    { id: '1e111111-1111-4111-a111-111111111111', name: 'Hoàng Thị E (Newbie GenZ)', email: 'hoangthie@gmail.com', avatar: 'https://ui-avatars.com/api/?name=E&background=EC4899&color=fff', baseSalary: 9500000, rentAmt: 2500000, persona: 'NEWBIE', years: [2026], startYear: 2026 }
];

// Realistic dictionaries for Vietnamese spending items
const foodItems = [
    { name: 'Phở Thìn Hà Nội - Bát tái nạm', min: 55000, max: 75000 },
    { name: 'Cơm tấm Tám Giang - Sườn bì chả', min: 45000, max: 65000 },
    { name: 'Bún chả Hương Liên', min: 50000, max: 70000 },
    { name: 'Bánh mì Huỳnh Hoa', min: 45000, max: 60000 },
    { name: 'Cơm văn phòng Giao Tận Nơi', min: 35000, max: 55000 },
    { name: 'Lẩu nướng Haidilao ăn trưa', min: 300000, max: 600000 },
    { name: 'KFC Việt Nam - Combo gà rán', min: 89000, max: 150000 },
    { name: 'Bún bò Huế Đông Ba', min: 45000, max: 65000 },
    { name: 'Bánh cuốn Tây Hồ', min: 35000, max: 50000 }
];

const drinkItems = [
    { name: 'Highlands Coffee - Phin Sữa Đá', min: 39000, max: 55000 },
    { name: 'Starbucks Coffee - Caramel Macchiato', min: 90000, max: 120000 },
    { name: 'Trà sữa Phúc Long - Ô long dừa', min: 55000, max: 75000 },
    { name: 'Cà phê muối Chú Long', min: 25000, max: 35000 },
    { name: 'Trà sữa Tocotoco', min: 35000, max: 50000 },
    { name: 'Nước ép trái cây tươi', min: 30000, max: 45000 }
];

const groceryItems = [
    { name: 'WinMart+ - Nhu yếu phẩm tuần', min: 200000, max: 550000 },
    { name: 'CoopMart - Mua đồ dùng gia đình', min: 350000, max: 850000 },
    { name: 'Bách Hóa Xanh - Thực phẩm tươi sống', min: 150000, max: 400000 },
    { name: 'Siêu thị Mega Market - Trái cây nhập khẩu', min: 300000, max: 700000 }
];

const transportItems = [
    { name: 'GrabBike đi làm', min: 25000, max: 45000 },
    { name: 'GrabCar đi gặp khách hàng', min: 80000, max: 180000 },
    { name: 'Đổ xăng A95 Petrolimex', min: 70000, max: 120000 },
    { name: 'Vé xe khách Phương Trang đi tỉnh', min: 180000, max: 350000 },
    { name: 'Nạp thẻ VinBus tháng', min: 100000, max: 200000 }
];

const shoppingItems = [
    { name: 'Shopee - Quần áo mùa hè', min: 150000, max: 450000 },
    { name: 'Tiki - Tai nghe Bluetooth không dây', min: 350000, max: 1200000 },
    { name: 'Lazada - Skincare & Mỹ phẩm', min: 200000, max: 800000 },
    { name: 'Uniqlo - Áo chống nắng', min: 390000, max: 790000 },
    { name: 'Shopee - Đồ decor phòng làm việc', min: 120000, max: 350000 }
];

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED V5
-- Nguyễn Văn A: 2 FULL YEARS (2025-01-01 to 2026-12-31 = 24 Months)
-- Other 4 Users: 1 FULL YEAR (2026-01-01 to 2026-12-31 = 12 Months)
-- Realistic Vietnamese Financial Data & High-Density Transactions (5 Users)
-- ============================================================================

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

-- 1. USERS
INSERT INTO users (id, email, password_hash, name, phone, avatar_url, bank_bin, bank_account_no, created_at) VALUES
`;

const userValues = users.map((u, i) => `('${u.id}', '${u.email}', '$2a$10$GK1LUpu5xnOCQt1I4V5zz.A4crOZWPjtcC3CHmaaZoqJitEgxpFXm', '${u.name}', '090${i}123456', '${u.avatar}', '970422', '109${i}8888999', '${u.startYear}-01-01 08:00:00')`);
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

// Global Groups
const groupTripId = uuid();
const groupDinnerId = uuid();

state.groups.push(`('${groupTripId}', 'Nhóm Du Lịch Xô Xát 2026', 'Quỹ du lịch Đà Lạt & Phú Quốc', '${users[2].id}', '2026-01-01 08:00:00')`);
state.groups.push(`('${groupDinnerId}', 'Hội Ăn Nhậu Cuối Tuần', 'Quỹ ăn uống gộp', '${users[0].id}', '2025-01-01 08:00:00')`);

users.forEach(u => {
    state.groupMembers.push(`('${uuid()}', '${groupTripId}', '${u.id}', '${u.id === users[2].id ? 'owner' : 'member'}', '${u.startYear}-01-01 08:00:00')`);
    state.groupMembers.push(`('${uuid()}', '${groupDinnerId}', '${u.id}', '${u.id === users[0].id ? 'owner' : 'member'}', '${u.startYear}-01-01 08:00:00')`);
});

users.forEach(u => {
    const w1 = uuid(); const w2 = uuid();
    const createdAt = `${u.startYear}-01-01 08:00:00`;
    state.wallets.push(`('${w1}', '${u.id}', 'Ví Tiền Mặt & MBBank', 45000000, 'VND', false, '${createdAt}')`);
    state.wallets.push(`('${w2}', '${u.id}', 'Thẻ Tín Dụng VPBank', -4500000, 'VND', true, '${createdAt}')`);

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

    const payeesList = [
        'Highlands Coffee', 'WinMart+', 'CoopMart', 'Grab Việt Nam',
        'Công ty Cổ phần Công nghệ', 'Shopee Việt Nam', 'Điện lực EVN',
        'Viettel Telecom', 'Petrolimex', 'Hệ thống Cơm tấm Tám Giang'
    ];
    const pArr = [];
    payeesList.forEach(pName => {
        const pId = uuid();
        state.payees.push(`('${pId}', '${u.id}', '${pName}')`);
        pArr.push(pId);
    });

    const tagsList = ['Gia đình', 'Cá nhân', 'Du lịch', 'Công việc', 'Tiết kiệm', 'Thiết yếu'];
    const tArr = [];
    tagsList.forEach(tName => {
        const tId = uuid();
        state.tags.push(`('${tId}', '${u.id}', '${tName}')`);
        tArr.push(tId);
    });

    // External Loans simulation
    if (u.persona === 'DEBTOR') {
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng VIB', 25000000, 6.5, '2026-01-10', '2026-12-31', 'Vay trả góp mua máy tính', false, '2026-01-10 09:00:00')`);
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Trần Thị B', 3000000, 0, '2026-04-15', '2026-09-01', 'Mượn tạm đóng tiền nhà', false, '2026-04-15 10:00:00')`);
    } else {
        state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Đồng nghiệp công ty', 4000000, 0, '${u.startYear}-03-01', '${u.startYear}-09-01', 'Cho mượn mua điện thoại', false, '${u.startYear}-03-01 10:00:00')`);
    }

    // Savings Goals simulation
    const sAmt1 = u.persona === 'SAVER' ? 35000000 : 12000000;
    const sAmt2 = u.persona === 'SAVER' ? 25000000 : 5000000;
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Mua Xe Máy Mới', 50000000, ${sAmt1}, '2027-06-30', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Dự Phòng Khẩn Cấp', 30000000, ${sAmt2}, '2026-12-31', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);

    // Notifications
    state.notifs.push(`('${uuid()}', '${u.id}', 'Bạn đã tiêu 85% ngân sách Ăn uống tháng này', 'WARNING', false, '2026-07-25 08:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Lương tháng 07/2026 đã được cộng vào tài khoản', 'INFO', true, '2026-07-05 09:00:00')`);

    // Budget configurations per month
    const budgetMultiplier = (u.persona === 'SPENDER') ? 0.7 : 1.0;
    const budgetConfigs = [
        { name: 'Ăn uống', limit: Math.round(5500000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false },
        { name: 'Chi tiêu hàng ngày', limit: Math.round(2500000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false },
        { name: 'Tiền điện', limit: 2000000, type: 'BILL', mandatory: true },
        { name: 'Phí liên lạc', limit: 500000, type: 'BILL', mandatory: true },
        { name: 'Phí giao lưu', limit: Math.round(2000000 * budgetMultiplier), type: 'FLEXIBLE', mandatory: false },
        { name: 'Mỹ phẩm', limit: 1200000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Tiền nhà', limit: u.rentAmt, type: 'BILL', mandatory: true },
        { name: 'Quần áo', limit: 2000000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Đi lại', limit: 1500000, type: 'FLEXIBLE', mandatory: false },
        { name: 'Y tế', limit: 1000000, type: 'FLEXIBLE', mandatory: false }
    ];

    // Loop target years (nguyenvana: 2025 & 2026; others: 2026)
    u.years.forEach(year => {
        // Loop 12 months for each year
        for (let m = 1; m <= 12; m++) {
            const mStr = m.toString().padStart(2, '0');
            
            // 1. Create monthly Budgets for all 10 expense categories
            budgetConfigs.forEach(bConfig => {
                const catId = categoryMap[bConfig.name];
                if (catId) {
                    state.budgets.push(`('${uuid()}', '${u.id}', '${catId}', 'Ngân sách ${bConfig.name} T${m}/${year}', ${bConfig.limit}, ${m}, ${year}, '${bConfig.type}', true, ${bConfig.mandatory})`);
                }
            });

            // 2. FIXED MONTHLY INCOME (Day 5 of month)
            const salaryTxId = uuid();
            const salaryDate = `${year}-${mStr}-05 08:30:00`;
            const salaryCatId = categoryMap['Tiền lương'];
            state.txs.push(`('${salaryTxId}', '${w1}', ${u.baseSalary}, 'INCOME', '${salaryCatId}', '${pArr[4]}', '${salaryDate}', 'Lương tháng ${mStr}/${year} - Công ty Tech', false, false, false, '${salaryDate}')`);
            state.txTags.push(`('${salaryTxId}', '${tArr[3]}')`);

            // Quarterly Bonus on April & August (Day 25)
            if (m === 4 || m === 8 || m === 12) {
                const bonusTxId = uuid();
                const bonusDate = `${year}-${mStr}-25 14:00:00`;
                const bonusAmt = Math.round(u.baseSalary * 0.4);
                state.txs.push(`('${bonusTxId}', '${w1}', ${bonusAmt}, 'INCOME', '${categoryMap['Tiền thưởng']}', '${pArr[4]}', '${bonusDate}', 'Thưởng KPI Quý ${m === 4 ? 1 : m === 8 ? 2 : 4}', false, false, false, '${bonusDate}')`);
                state.txTags.push(`('${bonusTxId}', '${tArr[4]}')`);
            }

            // 3. FIXED MONTHLY BILLS (Day 1 to 10)
            // Rent
            const rentTxId = uuid();
            const rentDate = `${year}-${mStr}-02 10:00:00`;
            state.txs.push(`('${rentTxId}', '${w1}', ${u.rentAmt}, 'EXPENSE', '${categoryMap['Tiền nhà']}', '${pArr[1]}', '${rentDate}', 'Tiền thuê nhà tháng ${mStr}/${year}', false, false, false, '${rentDate}')`);
            state.txTags.push(`('${rentTxId}', '${tArr[5]}')`);

            // Electricity EVN
            const elecTxId = uuid();
            const elecDate = `${year}-${mStr}-08 15:30:00`;
            const elecAmt = randomInt(600, 1800) * 1000;
            state.txs.push(`('${elecTxId}', '${w1}', ${elecAmt}, 'EXPENSE', '${categoryMap['Tiền điện']}', '${pArr[6]}', '${elecDate}', 'Hóa đơn Điện lực EVN T${mStr}/${year}', false, false, false, '${elecDate}')`);

            // Internet Viettel
            const netTxId = uuid();
            const netDate = `${year}-${mStr}-09 11:00:00`;
            state.txs.push(`('${netTxId}', '${w1}', 275000, 'EXPENSE', '${categoryMap['Phí liên lạc']}', '${pArr[7]}', '${netDate}', 'Cước Internet Viettel Fiber T${mStr}/${year}', false, false, false, '${netDate}')`);

            // 4. DAILY REALISTIC TRANSACTIONS (~50-70 txs/month)
            const daysInMonth = (m === 2) ? 28 : (m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 28);
            for (let d = 1; d <= daysInMonth; d++) {
                // Breakfast / Lunch / Dinner (Every day)
                if (Math.random() > 0.15) {
                    const foodItem = randomElement(foodItems);
                    const foodTxId = uuid();
                    const foodAmt = randomInt(foodItem.min, foodItem.max);
                    const foodDate = formatDate(year, m, d, randomInt(7, 19), randomInt(0, 59));
                    state.txs.push(`('${foodTxId}', '${w1}', ${foodAmt}, 'EXPENSE', '${categoryMap['Ăn uống']}', '${pArr[9]}', '${foodDate}', '${foodItem.name}', false, false, false, '${foodDate}')`);
                    state.txTags.push(`('${foodTxId}', '${tArr[1]}')`);
                }

                // Coffee / Drinks (Most workdays)
                if (Math.random() > 0.35) {
                    const drinkItem = randomElement(drinkItems);
                    const drinkTxId = uuid();
                    const drinkAmt = randomInt(drinkItem.min, drinkItem.max);
                    const drinkDate = formatDate(year, m, d, randomInt(8, 16), randomInt(0, 59));
                    state.txs.push(`('${drinkTxId}', '${w1}', ${drinkAmt}, 'EXPENSE', '${categoryMap['Ăn uống']}', '${pArr[0]}', '${drinkDate}', '${drinkItem.name}', false, false, false, '${drinkDate}')`);
                }

                // Transport (Grab/Gas)
                if (Math.random() > 0.4) {
                    const transItem = randomElement(transportItems);
                    const transTxId = uuid();
                    const transAmt = randomInt(transItem.min, transItem.max);
                    const transDate = formatDate(year, m, d, randomInt(7, 21), randomInt(0, 59));
                    state.txs.push(`('${transTxId}', '${w1}', ${transAmt}, 'EXPENSE', '${categoryMap['Đi lại']}', '${pArr[3]}', '${transDate}', '${transItem.name}', false, false, false, '${transDate}')`);
                }

                // Supermarket Groceries (2-3 times per week)
                if (d % 3 === 0) {
                    const grocItem = randomElement(groceryItems);
                    const grocTxId = uuid();
                    const grocAmt = randomInt(grocItem.min, grocItem.max);
                    const grocDate = formatDate(year, m, d, 18, randomInt(10, 50));
                    state.txs.push(`('${grocTxId}', '${w1}', ${grocAmt}, 'EXPENSE', '${categoryMap['Chi tiêu hàng ngày']}', '${pArr[1]}', '${grocDate}', '${grocItem.name}', false, false, false, '${grocDate}')`);
                }

                // Shopping (Shopee/Tiki/Lazada) - Extra frequent for SPENDER
                const shopChance = (u.persona === 'SPENDER') ? 0.25 : 0.08;
                if (Math.random() < shopChance) {
                    const shopItem = randomElement(shoppingItems);
                    const shopTxId = uuid();
                    const shopAmt = randomInt(shopItem.min, shopItem.max);
                    const shopDate = formatDate(year, m, d, 21, randomInt(0, 59));
                    const targetWallet = (u.persona === 'SPENDER' && Math.random() > 0.5) ? w2 : w1;
                    state.txs.push(`('${shopTxId}', '${targetWallet}', ${shopAmt}, 'EXPENSE', '${categoryMap['Quần áo']}', '${pArr[5]}', '${shopDate}', '${shopItem.name}', false, false, false, '${shopDate}')`);
                }
            }

            // 5. SAVINGS FUNDING FOR SAVER PERSONA
            if (u.persona === 'SAVER') {
                const saveTxId = uuid();
                const saveDate = `${year}-${mStr}-06 10:00:00`;
                const saveAmt = 5000000;
                state.txs.push(`('${saveTxId}', '${w1}', ${saveAmt}, 'EXPENSE', '${categoryMap['Mục tiêu tiết kiệm']}', '${pArr[1]}', '${saveDate}', 'Trích nạp Quỹ mua xe máy T${mStr}/${year}', false, false, false, '${saveDate}')`);
                state.txTags.push(`('${saveTxId}', '${tArr[4]}')`);
            }

            // 6. GROUP EXPENSES SIMULATION (Trip & Dinners)
            if (u.id === users[2].id) { // Group leader pays
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
                    }
                });
            }
        }
    });
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

fs.writeFileSync('seed_v5.sql', sql, 'utf8');
console.log('Successfully generated seed_v5.sql with 2-year data for Nguyễn Văn A and 1-year data for 4 other users!');
