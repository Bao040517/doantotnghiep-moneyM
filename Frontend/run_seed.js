const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSeed() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'share-money',
    password: 'admin',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const sqlPath = path.join(__dirname, '..', 'seed_data_3_months.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL script...');
    await client.query(sql);
    console.log('SQL script executed successfully!');
    
  } catch (err) {
    console.error('Error executing SQL script:', err);
  } finally {
    await client.end();
  }
}

runSeed();
