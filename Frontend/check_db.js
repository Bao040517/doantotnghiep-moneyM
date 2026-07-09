const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function check() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'share-money',
    password: 'admin',
    port: 5432,
  });

  try {
    await client.connect();
    const res = await client.query("SELECT COUNT(*) FROM users");
    console.log('Total users in DB:', res.rows[0].count);
    
    const countTx = await client.query("SELECT COUNT(*) FROM transactions");
    console.log('Total transactions in DB:', countTx.rows[0].count);
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

check();
