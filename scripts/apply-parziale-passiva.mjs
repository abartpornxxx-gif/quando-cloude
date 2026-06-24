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

// Use session port 5432 for DDL alterations
const ddlDbUrl = dbUrl.replace(':6543/', ':5432/').replace('pgbouncer=true', 'sslmode=require')

const { Client } = pg
const client = new Client({
  connectionString: ddlDbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000
})

await client.connect()
console.log('Connected to DB for migration...')
try {
  await client.query('ALTER TYPE "StatoFatturaPassiva" ADD VALUE IF NOT EXISTS \'parzialmente_pagata\'')
  console.log('✓ StatoFatturaPassiva updated successfully')
} catch (e) {
  console.error('Migration failed:', e.message)
} finally {
  await client.end()
}
