require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { rows: withNote } = await pool.query(`
    SELECT id, lavoro_da_fare, note
    FROM pianificazioni
    WHERE note IS NOT NULL AND note <> ''
    ORDER BY created_at DESC
    LIMIT 20
  `)
  console.log(`\n=== Campo "note" in pianificazioni ===`)
  console.log(`Righe con dati: ${withNote.length}`)
  for (const r of withNote) {
    console.log(`  id: ${r.id}`)
    console.log(`  lavoroDaFare: ${r.lavoro_da_fare ?? '(vuoto)'}`)
    console.log(`  note:         ${r.note}`)
    console.log()
  }
  if (withNote.length === 0) console.log('Nessun dato nel campo note — sicuro eliminarlo.')
  await pool.end()
}
main().catch(e => { console.error(e); process.exit(1) })
