// Script to check if 'controllata' column exists in 'fatture_passive' table.
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL non trovata.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connesso.');

  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'fatture_passive' AND column_name = 'controllata'
  `);

  if (res.rowCount > 0) {
    console.log("La colonna 'controllata' ESISTE già.");
  } else {
    console.log("La colonna 'controllata' NON esiste. La aggiungo...");
    await client.query(`
      ALTER TABLE fatture_passive ADD COLUMN IF NOT EXISTS controllata BOOLEAN DEFAULT FALSE;
    `);
    console.log("La colonna 'controllata' è stata aggiunta.");
  }

  await client.end();
}

main().catch(err => {
  console.error('Errore:', err);
  client.end().catch(() => {});
  process.exit(1);
});
