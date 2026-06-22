// Migrazione: aggiunge il campo data_esecuzione alla tabella proposte_intervento
// Eseguire con: node scripts/manutenzioni-esecuzione-schema.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Migrazione: data_esecuzione su proposte_intervento...')

  await pool.query(`
    ALTER TABLE proposte_intervento
    ADD COLUMN IF NOT EXISTS data_esecuzione DATE;
  `)
  console.log('✓ Colonna data_esecuzione aggiunta (o già esistente)')

  await pool.end()
  console.log('Migrazione completata.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
