import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const dbUrl = envContent.split('\n')
  .find(l => l.trim().startsWith('DATABASE_URL='))
  .split('=')
  .slice(1)
  .join('=')
  .trim()
  .replace(/^"(.*)"$/, '$1')

const { Client } = pg
const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000
})

await client.connect()

async function getEnumValues(typeName) {
  const { rows } = await client.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = $1
  `, [typeName])
  return rows.map(r => r.enumlabel)
}

try {
  const attiveValues = await getEnumValues('StatoFatturaAttiva')
  console.log('StatoFatturaAttiva values:', attiveValues)
} catch (e) {
  console.log('StatoFatturaAttiva error:', e.message)
}

try {
  const passiveValues = await getEnumValues('StatoFatturaPassiva')
  console.log('StatoFatturaPassiva values:', passiveValues)
} catch (e) {
  console.log('StatoFatturaPassiva error:', e.message)
}

await client.end()
