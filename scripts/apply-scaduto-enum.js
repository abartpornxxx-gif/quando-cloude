// Script: aggiunge il valore 'scaduto' all'enum StatoPreventivo su Supabase
// Usa connessione diretta (porta 5432) per DDL, non il pooler di transazione
require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

const poolerUrl = process.env.DATABASE_URL
if (!poolerUrl) {
  console.error('DATABASE_URL non trovata in .env.local')
  process.exit(1)
}

// Usa il pooler in session mode (porta 5432) per supportare DDL
// Il pooler transaction mode (6543) non supporta ALTER TYPE
const sessionUrl = poolerUrl.replace(':6543/', ':5432/')

console.log('Connessione session mode:', sessionUrl.replace(/:([^@]+)@/, ':***@'))

const client = new Client({
  connectionString: sessionUrl,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  console.log('Connesso.')

  const checkRes = await client.query(`
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'scaduto'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatoPreventivo')
  `)

  if (checkRes.rowCount > 0) {
    console.log("Il valore 'scaduto' esiste già nell'enum StatoPreventivo.")
  } else {
    console.log("Aggiungo 'scaduto' all'enum StatoPreventivo...")
    await client.query(`ALTER TYPE "StatoPreventivo" ADD VALUE 'scaduto'`)
    console.log("Valore 'scaduto' aggiunto.")
  }

  const enumRes = await client.query(`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatoPreventivo')
    ORDER BY enumsortorder
  `)
  console.log('Valori enum StatoPreventivo nel DB:', enumRes.rows.map(r => r.enumlabel).join(', '))

  await client.end()
}

main().catch(err => {
  console.error('Errore:', err.message)
  client.end().catch(() => {})
  process.exit(1)
})
