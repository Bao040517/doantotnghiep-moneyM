const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function formatDate(year, month, day, hour, minute) {
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    const hStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    return `${year}-${mStr}-${dStr} ${hStr}:${minStr}:00`;
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
        { name: 'Phở Thìn Hà Nội - Bát tái nạm', min: 55000, max: 75000 },
        { name: 'Cơm tấm Tám Giang - Sườn bì chả trứng', min: 45000, max: 65000 },
        { name: 'Bún chả Hương Liên - Suất đặc biệt', min: 50000, max: 70000 },
        { name: 'Bánh mì Huỳnh Hoa - Ôm giò chả', min: 45000, max: 60000 },
        { name: 'Cơm văn phòng Giao Tận Nơi', min: 35000, max: 55000 },
        { name: 'Lẩu nướng Haidilao ăn trưa', min: 300000, max: 600000 },
        { name: 'KFC Việt Nam - Combo gà rán giòn cay', min: 89000, max: 150000 },
        { name: 'Bún bò Huế Đông Ba - Tô đặc biệt', min: 45000, max: 65000 },
        { name: 'Highlands Coffee - Phin Sữa Đá', min: 39000, max: 55000 },
        { name: 'Starbucks Coffee - Caramel Macchiato', min: 90000, max: 120000 },
        { name: 'Trà sữa Phúc Long - Ô long dừa', min: 55000, max: 75000 },
        { name: 'Cà phê muối Chú Long', min: 25000, max: 35000 }
    ],
    'Chi tiêu hàng ngày': [
        { name: 'WinMart+ - Mua rau củ & thịt nách', min: 200000, max: 450000 },
        { name: 'CoopMart - Nhu yếu phẩm gia đình', min: 350000, max: 750000 },
        { name: 'Bách Hóa Xanh - Thực phẩm tươi sống', min: 150000, max: 350000 },
        { name: 'Pharmacity - Dầu gội & sữa tắm', min: 120000, max: 280000 }
    ],
    'Quần áo': [
        { name: 'Shopee - Áo thun Polo Uniqlo', min: 190000, max: 390000 },
        { name: 'Uniqlo Vincom - Áo khoác chống nắng UV', min: 490000, max: 790000 },
        { name: 'Zara Vietnam - Áo sơ mi công sở', min: 590000, max: 990000 },
        { name: 'Shopee - Vớ nam cổ cao 5 đôi', min: 79000, max: 129000 }
    ],
    'Mỹ phẩm': [
        { name: 'Hasaki Beauty - Kem chống nắng Anessa', min: 350000, max: 550000 },
        { name: 'Watsons - Sữa rửa mặt CeraVe', min: 280000, max: 420000 },
        { name: 'Guardian - Son dưỡng môi DHC Lip Cream', min: 140000, max: 220000 },
        { name: 'Shopee Mall - Tinh chất La Roche-Posay B5', min: 420000, max: 680000 }
    ],
    'Phí giao lưu': [
        { name: 'Cà phê gặp đối tác - The Coffee House', min: 120000, max: 250000 },
        { name: 'Tiệc sinh nhật bạn đồng nghiệp - Kichi-Kichi', min: 350000, max: 650000 },
        { name: 'Giao lưu bóng đá cuối tuần - Tiền sân', min: 100000, max: 200000 },
        { name: 'Xem phim CGV Cinema - Vé đôi IMAX', min: 240000, max: 380000 }
    ],
    'Y tế': [
        { name: 'Nhà thuốc Long Châu - Thuốc cảm & Vitamin C', min: 85000, max: 185000 },
        { name: 'Pharmacity - Nước muối sinh lý & khẩu trang', min: 45000, max: 95000 },
        { name: 'Nhà thuốc An Khang - Thuốc bổ mắt Omega 3', min: 190000, max: 350000 },
        { name: 'Khám sức khỏe định kỳ phòng khám', min: 450000, max: 850000 }
    ],
    'Giáo dục': [
        { name: 'Học phí khóa học IELTS Online', min: 850000, max: 1500000 },
        { name: 'Nạp tiền mua khóa học Udemy', min: 249000, max: 499000 },
        { name: 'Sách Tiki - Combo Sách Kỹ Năng & Tài Chính', min: 180000, max: 350000 },
        { name: 'Nhà sách Fahasa - Sổ tay & Bút ký', min: 95000, max: 195000 }
    ],
    'Tiền điện': [
        { name: 'Hóa đơn Tiền điện EVN HCMC', min: 650000, max: 1450000 },
        { name: 'Thanh toán Tiền nước Sawaco', min: 120000, max: 280000 }
    ],
    'Đi lại': [
        { name: 'GrabBike - Đón đi làm buổi sáng', min: 25000, max: 45000 },
        { name: 'GrabCar - Đi công tác gặp khách hàng', min: 85000, max: 175000 },
        { name: 'Đổ xăng A95 - cây xăng Petrolimex', min: 80000, max: 120000 },
        { name: 'Nạp tiền thẻ VETC thu phí tự động', min: 200000, max: 500000 }
    ],
    'Phí liên lạc': [
        { name: 'Hóa đơn Internet Viettel Fiber 250Mbps', min: 275000, max: 275000 },
        { name: 'Nạp tiền điện thoại Viettel Gói V120N', min: 120000, max: 120000 }
    ],
    'Tiền nhà': [
        { name: 'Tiền thuê nhà trọ / chung cư hàng tháng', min: 2500000, max: 6000000 },
        { name: 'Phí gửi xe máy & Phí dịch vụ hầm nhà', min: 150000, max: 350000 }
    ],
    'Mục tiêu tiết kiệm': [
        { name: 'Trích nạp Quỹ Mua Xe Máy Mới', min: 2000000, max: 5000000 },
        { name: 'Trích nạp Quỹ Dự Phòng Khẩn Cấp', min: 1500000, max: 3000000 }
    ],
    'Tiền lương': [
        { name: 'Chuyển khoản Lương tháng - Công ty Tech', min: 9500000, max: 32000000 },
        { name: 'Phụ cấp ăn trưa & Điện thoại hàng tháng', min: 1000000, max: 2000000 }
    ],
    'Tiền thưởng': [
        { name: 'Thưởng KPI hiệu suất công việc Quý', min: 3000000, max: 8000000 },
        { name: 'Hoàn tiền Cashback ưu đãi thẻ ngân hàng', min: 150000, max: 500000 }
    ],
    'Hoàn tiền tiết kiệm': [
        { name: 'Rút một phần Quỹ Dự Phòng Khẩn Cấp', min: 1000000, max: 3000000 },
        { name: 'Tạm rút tiền tiết kiệm chi tiêu đột xuất', min: 2000000, max: 4000000 }
    ],
    'Trả nợ nhóm': [
        { name: 'Trả tiền ăn trưa lẩu nướng nhóm', min: 150000, max: 350000 },
        { name: 'Thanh toán tiền camp du lịch nhóm', min: 500000, max: 1200000 }
    ],
    'Nhận tiền nhóm': [
        { name: 'Nhận tiền nhóm bạn B trả tiền cà phê', min: 80000, max: 180000 },
        { name: 'Nhận tiền nhóm thanh toán vé xem phim', min: 120000, max: 240000 }
    ],
    'Xóa nợ nhóm': [
        { name: 'Quyết toán xóa nợ nhóm chuyến đi chơi', min: 200000, max: 400000 },
        { name: 'Cân bằng tài khoản xóa nợ nhóm', min: 100000, max: 300000 }
    ],
    'Cho nhóm mượn': [
        { name: 'Chi ứng trước tiền ăn tối cho nhóm', min: 400000, max: 1000000 },
        { name: 'Thanh toán trước hóa đơn Karaoke nhóm', min: 600000, max: 1500000 }
    ]
};

let sql = `-- ============================================================================
-- SHAREMONEY DATABASE SEED V6
-- Nguyễn Văn A: 2 FULL YEARS (2025-01-01 to 2026-12-31 = 24 Months)
-- Other 4 Users: 1 FULL YEAR (2026-01-01 to 2026-12-31 = 12 Months)
-- Realistic Vietnamese Financial Data & High-Density Transactions (5 Users)
-- Financially Consistent Wallet Balances & Savings Alignments
-- Every category guaranteed >= 2 transactions per month!
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

users.forEach((u, uIdx) => {
    const wMain = uuid();     // Ví Điện Tử MBBank
    const wSavings = uuid();  // Ví Tiết Kiệm Vietcombank
    const wCredit = uuid();   // Thẻ Tín Dụng VPBank
    const createdAt = `${u.startYear}-01-01 08:00:00`;

    // 1. Categories (19 categories)
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

    const categoryMap = {};
    defaultCategories.forEach(cat => {
        const cId = uuid();
        state.categories.push(`('${cId}', '${u.id}', '${cat.name}', '${cat.type}', '${cat.icon}')`);
        categoryMap[cat.name] = cId;
    });

    // Payees
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

    // Tags
    const tagsList = ['Gia đình', 'Cá nhân', 'Du lịch', 'Công việc', 'Tiết kiệm', 'Thiết yếu'];
    const tArr = [];
    tagsList.forEach(tName => {
        const tId = uuid();
        state.tags.push(`('${tId}', '${u.id}', '${tName}')`);
        tArr.push(tId);
    });

    // External Loans
    if (u.persona === 'DEBTOR') {
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Ngân hàng VIB', 25000000, 6.5, '2026-01-10', '2026-12-31', 'Vay trả góp mua máy tính', false, '2026-01-10 09:00:00')`);
        state.loans.push(`('${uuid()}', '${u.id}', 'BORROWED', 'Trần Thị B', 3000000, 0, '2026-04-15', '2026-09-01', 'Mượn tạm đóng tiền nhà', false, '2026-04-15 10:00:00')`);
    } else {
        state.loans.push(`('${uuid()}', '${u.id}', 'LENT', 'Đồng nghiệp công ty', 4000000, 0, '${u.startYear}-03-01', '${u.startYear}-09-01', 'Cho mượn mua điện thoại', false, '${u.startYear}-03-01 10:00:00')`);
    }

    // Savings Goals
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Mua Xe Máy Mới', 50000000, ${u.sAmt1}, '2027-06-30', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);
    state.savings.push(`('${uuid()}', '${u.id}', 'Quỹ Dự Phòng Khẩn Cấp', 30000000, ${u.sAmt2}, '2026-12-31', 'IN_PROGRESS', '${u.startYear}-01-01 08:00:00')`);

    // Notifications
    state.notifs.push(`('${uuid()}', '${u.id}', 'Bạn đã tiêu 85% ngân sách Ăn uống tháng này', 'WARNING', false, '2026-07-25 08:00:00')`);
    state.notifs.push(`('${uuid()}', '${u.id}', 'Lương tháng 07/2026 đã được cộng vào tài khoản', 'INFO', true, '2026-07-05 09:00:00')`);

    // Budget configs per month
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

    let netMainBalance = 0;

    // Loop target years (nguyenvana: 2025 & 2026; others: 2026)
    u.years.forEach(year => {
        for (let m = 1; m <= 12; m++) {
            const mStr = m.toString().padStart(2, '0');

            // Budgets for expense categories
            budgetConfigs.forEach(bConfig => {
                const catId = categoryMap[bConfig.name];
                if (catId) {
                    state.budgets.push(`('${uuid()}', '${u.id}', '${catId}', 'Ngân sách ${bConfig.name} T${m}/${year}', ${bConfig.limit}, ${m}, ${year}, '${bConfig.type}', true, ${bConfig.mandatory})`);
                }
            });

            // GUARANTEE: EVERY CATEGORY GETS AT LEAST 2 TRANSACTIONS PER MONTH!
            Object.keys(categoryItemsMap).forEach(catName => {
                const catId = categoryMap[catName];
                if (!catId) return;
                const items = categoryItemsMap[catName];
                const catType = defaultCategories.find(c => c.name === catName).type;

                // Pick 2 distinct days in month for the 2 transactions
                const daysInMonth = (m === 2) ? 28 : (m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 28);
                const day1 = randomInt(1, Math.floor(daysInMonth / 2));
                const day2 = randomInt(Math.floor(daysInMonth / 2) + 1, daysInMonth);

                [day1, day2].forEach((day, idx) => {
                    const item = items[(idx + randomInt(0, items.length - 1)) % items.length];
                    const txId = uuid();
                    let amt = randomInt(item.min, item.max);
                    
                    // Special override for Base Salary on 1st tx of 'Tiền lương'
                    if (catName === 'Tiền lương' && idx === 0) {
                        amt = u.baseSalary;
                    }

                    const hour = catType === 'INCOME' ? 9 : randomInt(7, 21);
                    const txDate = formatDate(year, m, day, hour, randomInt(0, 59));
                    const payeeId = pArr[randomInt(0, pArr.length - 1)];

                    state.txs.push(`('${txId}', '${wMain}', ${amt}, '${catType}', '${catId}', '${payeeId}', '${txDate}', '${item.name}', false, false, false, '${txDate}')`);
                    
                    // Track balance
                    if (catType === 'INCOME') {
                        netMainBalance += amt;
                    } else if (catType === 'EXPENSE') {
                        netMainBalance -= amt;
                    }
                });
            });

            // Extra daily food & beverage & transport transactions for realistic density
            const daysInMonth = (m === 2) ? 28 : (m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 28);
            for (let d = 1; d <= daysInMonth; d++) {
                if (Math.random() > 0.3) {
                    const foodItem = randomElement(categoryItemsMap['Ăn uống']);
                    const foodTxId = uuid();
                    const foodAmt = randomInt(foodItem.min, foodItem.max);
                    const foodDate = formatDate(year, m, d, randomInt(11, 14), randomInt(0, 59));
                    state.txs.push(`('${foodTxId}', '${wMain}', ${foodAmt}, 'EXPENSE', '${categoryMap['Ăn uống']}', '${pArr[9]}', '${foodDate}', '${foodItem.name}', false, false, false, '${foodDate}')`);
                    netMainBalance -= foodAmt;
                }
            }

            // Group Expenses Simulation
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
                    }
                });
            }

            // Inject Over-limit & Approaching-limit transactions for Current Month (8/2026) to display warning card on Dashboard
            if (year === 2026 && m === 8) {
                // 1. Over limit: Ăn uống (Limit 5.5M -> spent + 5.8M = OVER LIMIT)
                const overTxId = uuid();
                const overDate = `2026-08-04 19:30:00`;
                state.txs.push(`('${overTxId}', '${wMain}', 5800000, 'EXPENSE', '${categoryMap['Ăn uống']}', '${pArr[0]}', '${overDate}', 'Tiệc lẩu nướng Haidilao mừng sinh nhật', false, false, false, '${overDate}')`);
                netMainBalance -= 5800000;

                // 2. Approaching limit: Phí giao lưu (Limit 2.0M -> spent + 1.75M = 87.5% APPROACHING)
                const appTxId = uuid();
                const appDate = `2026-08-05 14:00:00`;
                state.txs.push(`('${appTxId}', '${wMain}', 1750000, 'EXPENSE', '${categoryMap['Phí giao lưu']}', '${pArr[1]}', '${appDate}', 'Mừng đám cưới đồng nghiệp phòng IT', false, false, false, '${appDate}')`);
                netMainBalance -= 1750000;
            }
        }
    });

    // Ensure netMainBalance stays positive and realistic
    const finalMainBalance = Math.max(15000000, netMainBalance);
    const finalSavingsBalance = u.sAmt1 + u.sAmt2; // e.g. 60,000,000đ for User A!
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
sql += append('INSERT INTO budgets (id, user_id, category_id, name, limit_amount, month, year, type, is_recurring, is_mandatory) VALUES\n', state.budgets);
sql += append('INSERT INTO notifications (id, user_id, message, type, is_read, created_at) VALUES\n', state.notifs);
sql += append('INSERT INTO groups (id, name, description, owner_id, created_at) VALUES\n', state.groups);
sql += append('INSERT INTO group_members (id, group_id, user_id, role, joined_at) VALUES\n', state.groupMembers);
sql += append('INSERT INTO expenses (id, group_id, paid_by, title, amount, category, created_at) VALUES\n', state.expenses);
sql += append('INSERT INTO expense_splits (id, expense_id, user_id, amount_owed, is_settled) VALUES\n', state.expenseSplits);
sql += append('INSERT INTO payments (id, group_id, payer_id, receiver_id, amount, status, created_at) VALUES\n', state.payments);
sql += '-- ========================= TRANSACTIONS =========================\n';
sql += append('INSERT INTO transactions (id, wallet_id, amount, type, category_id, payee_id, transaction_date, note, is_split, exclude_from_budget, is_auto_generated, created_at) VALUES\n', state.txs);

fs.writeFileSync('seed_v6.sql', sql, 'utf8');
console.log('Successfully generated seed_v6.sql with 100% financial consistency and realistic transactions!');
