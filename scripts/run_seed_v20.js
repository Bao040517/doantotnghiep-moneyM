const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read connection string from environment or argument
const connectionString = process.env.DATABASE_URL || process.argv[2];

if (!connectionString) {
    console.error("Usage: node run_seed_v20.js <database_url>");
    process.exit(1);
}

async function run() {
    console.log("Connecting to PostgreSQL database...");
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Successfully connected to database!");

        console.log("Dropping old tables if exist...");
        const dropSQL = `
        DROP TABLE IF EXISTS 
            refresh_tokens, 
            payment_orders, 
            audit_logs,
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
        await client.query(dropSQL);
        console.log("✅ All old tables dropped cleanly!");

        console.log("Reading and executing seed_v20.sql...");
        const seedPath = path.join(__dirname, 'seed_v20.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        console.log(`Executing SQL script (${seedSQL.length} bytes)...`);
        await client.query(seedSQL);
        console.log("🎉 Database Seed V20 executed successfully!");

        // Verify counts
        const userCount = await client.query('SELECT count(*) FROM users;');
        const walletCount = await client.query('SELECT count(*) FROM wallets;');
        const budgetCount = await client.query('SELECT count(*) FROM budgets;');
        const txnCount = await client.query('SELECT count(*) FROM transactions;');
        const notifCount = await client.query('SELECT count(*) FROM notifications;');

        console.log("\n📊 Verification Summary:");
        console.log(`- Users: ${userCount.rows[0].count}`);
        console.log(`- Wallets: ${walletCount.rows[0].count}`);
        console.log(`- Budgets: ${budgetCount.rows[0].count}`);
        console.log(`- Transactions: ${txnCount.rows[0].count}`);
        console.log(`- Notifications: ${notifCount.rows[0].count}`);

    } catch (err) {
        console.error("❌ Error executing seed:", err);
    } finally {
        await client.end();
        console.log("Disconnected from database.");
    }
}

run();
