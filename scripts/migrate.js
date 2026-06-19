const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const file = process.argv[2]
if (!file) { console.error('Usage: node scripts/migrate.js <sql-file>'); process.exit(1) }

const sql = fs.readFileSync(path.resolve(file), 'utf8')

// SESSION pooler (port 5432) for DDL
const dbUrl = process.env.DATABASE_URL.replace(':6543/', ':5432/').replace('pgbouncer=true', 'sslmode=require')
const client = new Client({ connectionString: dbUrl })

async function run() {
  await client.connect()
  console.log('Connesso. Eseguo:', file)
  await client.query(sql)
  console.log('OK')
  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
