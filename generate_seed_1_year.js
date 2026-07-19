const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

let content = fs.readFileSync('seed_complete.sql', 'utf8');

// Điều chỉnh lại thời gian tạo User A và ví/nhóm từ 2026 thành 2025 để khớp dữ liệu 1 năm
content = content.replace(/'2026-03-01 08:00:00'/g, "'2025-07-01 08:00:00'");
content = content.replace(/'2026-03-01 10:00:00'/g, "'2025-07-01 10:00:00'");

let extra = `\n-- ========================= BỔ SUNG DỮ LIỆU ĐỂ ĐÚNG YÊU CẦU =========================\n\n`;

// 1. Thêm categories cho các User khác (B, C, D, E) vì họ chưa có category trong seed_complete.sql
const otherUsers = [
    { id: '1a111111-1111-4111-a111-111111111112', wallet: '3c333333-3333-4333-a333-333333333341' },
    { id: '1a111111-1111-4111-a111-111111111113', wallet: '3c333333-3333-4333-a333-333333333342' },
    { id: '1a111111-1111-4111-a111-111111111114', wallet: '3c333333-3333-4333-a333-333333333343' },
    { id: '1a111111-1111-4111-a111-111111111115', wallet: '3c333333-3333-4333-a333-333333333344' }
];

extra += `-- TẠO CATEGORIES CHO CÁC USER KHÁC\n`;
extra += `INSERT INTO categories (id, user_id, name, type, icon_name) VALUES\n`;
let catInserts = [];
for (const u of otherUsers) {
    u.catIncome = uuid();
    u.catFood = uuid();
    u.catTransport = uuid();
    
    catInserts.push(`('${u.catIncome}', '${u.id}', 'Tiền lương', 'INCOME', '💰')`);
    catInserts.push(`('${u.catFood}', '${u.id}', 'Ăn uống', 'EXPENSE', '🍽️')`);
    catInserts.push(`('${u.catTransport}', '${u.id}', 'Đi lại', 'EXPENSE', '🚆')`);
}
extra += catInserts.join(',\n') + `;\n\n`;

// 2. Tạo 3 tháng dữ liệu gần nhất (Tháng 4, 5, 6 năm 2026) cho CÁC USER KHÁC
extra += `-- 3 THÁNG DỮ LIỆU GẦN NHẤT (THÁNG 4,5,6/2026) CHO MỌI USER KHÁC\n`;
let txInserts = [];
for (const u of otherUsers) {
    for (let month = 4; month <= 6; month++) {
        let mStr = month.toString().padStart(2, '0');
        // Lương
        txInserts.push(`('${uuid()}', '${u.wallet}', 15000000, 'INCOME', '${u.catIncome}', '2026-${mStr}-05 09:00:00', 'Lương Tháng ${month}', FALSE, FALSE, FALSE)`);
        // Chi tiêu Ăn uống (khoảng 8-12 lần)
        let numFood = randomInt(8, 12);
        for(let i = 0; i < numFood; i++) {
            let d = randomInt(1, 28).toString().padStart(2, '0');
            txInserts.push(`('${uuid()}', '${u.wallet}', ${randomInt(5, 20)*10000}, 'EXPENSE', '${u.catFood}', '2026-${mStr}-${d} 12:00:00', 'Ăn uống', FALSE, FALSE, FALSE)`);
        }
        // Chi tiêu Đi lại (khoảng 3-5 lần)
        let numTrans = randomInt(3, 5);
        for(let i = 0; i < numTrans; i++) {
            let d = randomInt(1, 28).toString().padStart(2, '0');
            txInserts.push(`('${uuid()}', '${u.wallet}', ${randomInt(3, 10)*10000}, 'EXPENSE', '${u.catTransport}', '2026-${mStr}-${d} 08:00:00', 'Đi lại / Đổ xăng', FALSE, FALSE, FALSE)`);
        }
    }
}
extra += `INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES\n`;
extra += txInserts.join(',\n') + `;\n\n`;


// 3. Bổ sung 9 tháng (Tháng 7/2025 -> Tháng 3/2026) cho USER A để đủ 1 năm
const catIncomeA = '2b222222-2222-4222-a222-222222222228';
const catFoodA = '2b222222-2222-4222-a222-222222222221';
const catHouseA = '2b222222-2222-4222-a222-222222222223';
const walletA1 = '3c333333-3333-4333-a333-333333333331';
const walletA2 = '3c333333-3333-4333-a333-333333333332';

extra += `-- 9 THÁNG CŨ CHO USER A (ĐỂ USER A CÓ ĐỦ 1 NĂM TỪ THÁNG 7/2025)\n`;
let aInserts = [];
for (let year = 2025; year <= 2026; year++) {
    let startMonth = (year === 2025) ? 7 : 1;
    let endMonth = (year === 2025) ? 12 : 3;
    for (let month = startMonth; month <= endMonth; month++) {
        let mStr = month.toString().padStart(2, '0');
        // Lương
        aInserts.push(`('${uuid()}', '${walletA2}', 20000000, 'INCOME', '${catIncomeA}', '${year}-${mStr}-05 09:00:00', 'Lương Tháng ${month}', FALSE, FALSE, FALSE)`);
        // Tiền nhà
        aInserts.push(`('${uuid()}', '${walletA2}', 5000000, 'EXPENSE', '${catHouseA}', '${year}-${mStr}-10 08:00:00', 'Tiền nhà Tháng ${month}', FALSE, FALSE, FALSE)`);
        // Ăn uống
        for(let i = 0; i < 15; i++) {
            let d = randomInt(1, 28).toString().padStart(2, '0');
            aInserts.push(`('${uuid()}', '${walletA1}', ${randomInt(5, 20)*10000}, 'EXPENSE', '${catFoodA}', '${year}-${mStr}-${d} 12:00:00', 'Ăn uống ngày ${d}', FALSE, FALSE, FALSE)`);
        }
    }
}
extra += `INSERT INTO transactions (id, wallet_id, amount, type, category_id, transaction_date, note, is_split, is_auto_generated, exclude_from_budget) VALUES\n`;
extra += aInserts.join(',\n') + `;\n\n`;

content += extra;
fs.writeFileSync('seed_1_year.sql', content, 'utf8');
console.log('Tạo lại thành công với đẩy đủ 3 tháng cho tất cả các user!');
