const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgres://postgres.yzocyymegnmqkncdprkl:0986523787Bao@@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
    try {
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'external_loans'");
        console.log("external_loans columns:", res.rows.map(r => r.column_name));
        
        const res2 = await client.query("SELECT id, name FROM budgets WHERE category_id = 'cc463e76-ee63-45aa-89df-2421b9a975bc' AND user_id = '1a111111-1111-4111-a111-111111111111' AND month = 9");
        console.log("Multiple budgets for Phí liên lạc:", res2.rows);
    } finally {
        client.end();
    }
});
