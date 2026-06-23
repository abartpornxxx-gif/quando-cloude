import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"(.*)"$/, '$1')

const { Client } = pg
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })

await client.connect()

const { rows } = await client.query(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('suggerimenti_cantiere','suggerimenti_spunte','adempimenti_commesse','adempimenti_modelli','tipi_lavoro','notifiche_lette')
  ORDER BY table_name
`)

console.log('Tabelle presenti:', rows.map(r => r.table_name))

// Verifica colonne attrezzature (assegnatario)
const { rows: attrCols } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'attrezzature' AND column_name = 'assegnatario'
`)
console.log('attrezzature.assegnatario:', attrCols.length > 0 ? 'ESISTE' : 'MANCANTE')

// Verifica colonne rapportini (cosa_fare_domani)
const { rows: raptCols } = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'rapportini' AND column_name IN ('cosa_fare_domani','urgenza_domani')
`)
console.log('rapportini columns:', raptCols.map(r => r.column_name))

// Verifica unique constraint su movimenti_magazzino.richiesta_id
const { rows: idxRows } = await client.query(`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'movimenti_magazzino' AND indexdef LIKE '%richiesta_id%'
`)
console.log('movimenti_magazzino.richiesta_id index:', idxRows.map(r => r.indexname))

await client.end()
