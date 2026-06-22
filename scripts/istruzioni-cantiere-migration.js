require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Eseguo migrazione DB...')

  await pool.query(`ALTER TABLE pianificazioni DROP COLUMN IF EXISTS note;`)
  console.log('✓ Rimosso campo note da pianificazioni')

  await pool.query(`ALTER TABLE commesse ADD COLUMN IF NOT EXISTS istruzioni_cantiere TEXT;`)
  console.log('✓ Aggiunto istruzioni_cantiere su commesse')

  await pool.query(`ALTER TABLE commesse ADD COLUMN IF NOT EXISTS attrezzature_necessarie TEXT;`)
  console.log('✓ Aggiunto attrezzature_necessarie su commesse')

  await pool.end()
  console.log('\nMigrazione completata.')
}
main().catch(e => { console.error(e); process.exit(1) })
