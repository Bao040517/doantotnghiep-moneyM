const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uid() {
    return crypto.randomUUID();
}

console.log("Reading seed_v20.sql baseline...");
const v20Path = path.join(__dirname, 'seed_v20.sql');
let content = fs.readFileSync(v20Path, 'utf8');

console.log("Building seed_v21.sql with external_loans standardization & multiple budgets...");

const dropTablesSQL = `
DROP TABLE IF EXISTS 
    transaction_tags, 
    payment_orders, 
    expense_splits, 
    expenses, 
    payments, 
    group_members, 
    groups, 
    transaction_splits, 
    transactions, 
    external_loans, 
    savings_allocations, 
    savings_goals, 
    budgets, 
    categories, 
    payees, 
    tags, 
    notifications, 
    wallets, 
    users 
CASCADE;
`;

// 1. Update Header
content = dropTablesSQL + content.replace(
    '-- SHAREMONEY DATABASE SEED SCRIPT - GENERATION V20 (PRODUCTION LIVE SEED)',
    '-- SHAREMONEY DATABASE SEED SCRIPT - GENERATION V21 (DATA STANDARDIZATION)'
);
content = content.replace(
    /-- Generated Date: 2026-09-03\n-- Features V20:[\s\S]*?--   ✅ Rich September 2026 Budgets, Bills, & Transactions/,
    `-- Generated Date: 2026-09-03
-- Features V21:
--   ✅ Added payee_id to external_loans for 1-way debt settlement
--   ✅ Added multiple BILL budgets in a single category (Phí liên lạc)`
);

// 2. Standardize external_loans table
const oldExternalLoansTableDef = `CREATE TABLE IF NOT EXISTS external_loans (
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
);`;

const newExternalLoansTableDef = `CREATE TABLE IF NOT EXISTS external_loans (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
    principal_amount NUMERIC(19, 4) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    due_date DATE,
    description TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

content = content.replace(oldExternalLoansTableDef, newExternalLoansTableDef);

// Add to ALTER TABLE statements (if they exist for fallback)
const alterExternalLoans = `ALTER TABLE IF EXISTS external_loans ADD COLUMN IF NOT EXISTS payee_id UUID REFERENCES payees(id) ON DELETE SET NULL;`;
if (content.includes('ALTER TABLE IF EXISTS payment_orders ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;')) {
    content = content.replace(
        'ALTER TABLE IF EXISTS payment_orders ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;',
        'ALTER TABLE IF EXISTS payment_orders ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;\n' + alterExternalLoans
    );
}

// 3. Add Multiple Budgets for "Phí liên lạc"
// User A: '1a111111-1111-4111-a111-111111111111'
// Cat "Phí liên lạc": 'cc463e76-ee63-45aa-89df-2421b9a975bc'
// We will generate 2 budgets for Sep 2026.
const budgetId1 = uid();
const budgetId2 = uid();

const extraBudgets = `
('${budgetId1}', 'Tiền nạp thẻ 20k', '1a111111-1111-4111-a111-111111111111', 'cc463e76-ee63-45aa-89df-2421b9a975bc', 20000, 9, 2026, 'BILL', true, 15, true, '970407', '19033338888_ducbaoddb1705', 'VIETTEL TELECOM', '75947046-1f29-41a4-bf33-c5d984ca0a3f', '2026-01-01 08:00:00'),
('${budgetId2}', 'Tiền điện thoại 30k', '1a111111-1111-4111-a111-111111111111', 'cc463e76-ee63-45aa-89df-2421b9a975bc', 30000, 9, 2026, 'BILL', true, 20, true, '970407', '19033338888_ducbaoddb1705', 'VIETTEL TELECOM', '75947046-1f29-41a4-bf33-c5d984ca0a3f', '2026-01-01 08:00:00')`;

// Find the last budget insert to append
const insertBudgetsPattern = /INSERT INTO budgets \(id, name, user_id, category_id, limit_amount, month, year, type, is_recurring, due_day_of_month, is_mandatory, payee_bank_bin, payee_bank_account, payee_account_name, payee_id, created_at\) VALUES[\s\S]*?;/;
const match = content.match(insertBudgetsPattern);
if (match) {
    const originalInsert = match[0];
    const modifiedInsert = originalInsert.replace(/;$/, ',' + extraBudgets + ';');
    content = content.replace(originalInsert, modifiedInsert);
} else {
    console.warn("WARNING: Could not find INSERT INTO budgets statement!");
}


// Write to seed_v21.sql
const v21Path = path.join(__dirname, 'seed_v21.sql');
fs.writeFileSync(v21Path, content, 'utf8');

console.log('✅ Successfully generated seed_v21.sql with V21 standardization!');
