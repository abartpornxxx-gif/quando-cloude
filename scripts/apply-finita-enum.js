// Script: aggiunge il valore 'finita' all'enum StatoCommessa su Supabase
// Usa connessione diretta (porta 5432) per DDL, non il pooler di transazione
require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

const poolerUrl = process.env.DATABASE_URL
if (!poolerUrl) {
  console.error('DATABASE_URL non trovata in .env.local')
  process.exit(1)
}

// Pooler: postgresql://postgres.REF:PASS@aws-0-XX.pooler.supabase.com:6543/postgres
// Diretta: postgresql://postgres:PASS@db.REF.supabase.co:5432/postgres
// Username cambia da "postgres.REF" a "postgres", host e porta cambiano
const ref = poolerUrl.match(/postgres\.([^:]+):/)?.[1] ?? ''
const pass = poolerUrl.match(/postgres\.[^:]+:([^@]+)@/)?.[1] ?? ''
const directUrl = `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`

console.log('Connessione diretta:', directUrl.replace(/:([^@]+)@/, ':***@'))

const client = new Client({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  console.log('Connesso.')

  const checkRes = await client.query(`
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'finita'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatoCommessa')
  `)

  if (checkRes.rowCount > 0) {
    console.log("Il valore 'finita' esiste gia nell'enum StatoCommessa.")
  } else {
    console.log("Aggiungo 'finita' all'enum StatoCommessa...")
    await client.query(`ALTER TYPE "StatoCommessa" ADD VALUE 'finita'`)
    console.log("Valore 'finita' aggiunto.")
  }

  const enumRes = await client.query(`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatoCommessa')
    ORDER BY enumsortorder
  `)
  console.log('Valori enum StatoCommessa nel DB:', enumRes.rows.map(r => r.enumlabel).join(', '))

  await client.end()
}

main().catch(err => {
  console.error('Errore:', err.message)
  client.end().catch(() => {})
  process.exit(1)
})
