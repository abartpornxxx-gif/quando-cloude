// Script per applicare la migrazione delle Varianti e Richieste Preventivi Fornitori
// Esegui con: node scripts/apply-varianti-preventivi.mjs

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const { Client } = pg

// 1. Carica .env.local per leggere il DATABASE_URL
let databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  try {
    const envContent = readFileSync(resolve('.env.local'), 'utf8')
    const match = envContent.match(/^DATABASE_URL=["']?(.+?)["']?$/m)
    if (match) {
      databaseUrl = match[1]
    }
  } catch (e) {
    console.error('Impossibile caricare .env.local:', e.message)
  }
}

// Fallback al DB di sviluppo se non trovato in env
if (!databaseUrl) {
  databaseUrl = 'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
}

// Forza porta 5432 per le modifiche DDL (PgBouncer su 6543 non supporta alcune istruzioni DDL o transazioni)
const ddlUrl = databaseUrl.replace(':6543/', ':5432/').replace('pgbouncer=true', 'sslmode=require')

console.log('Connessione al database per DDL (porta 5432)...')
const client = new Client({ connectionString: ddlUrl })

async function run() {
  await client.connect()
  console.log('Connesso con successo.')

  const sqlPath = resolve('varianti-preventivi-schema.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  console.log('Esecuzione dello script SQL:', sqlPath)
  await client.query(sql)

  console.log('Migrazione completata con successo!')
  await client.end()
}

run().catch(async (err) => {
  console.error('Errore durante la migrazione:', err)
  try {
    await client.end()
  } catch (e) {}
  process.exit(1)
})
