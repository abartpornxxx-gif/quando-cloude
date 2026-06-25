const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

// Convert pooler port to session port if needed (from 6543 to 5432) to avoid prepared statements error
const url = new URL(connectionString);
if (url.port === '6543') {
  url.port = '5432';
}
const dbUrl = url.toString();

console.log('Connecting to database:', url.hostname);

const client = new Client({
  connectionString: dbUrl,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected. Reading SQL file...');
    const sqlPath = path.join(__dirname, '../prisma/migrazione_credenziali_sicure.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying SQL statements...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
