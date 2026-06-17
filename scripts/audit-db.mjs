import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const enums = await c.query(`
  SELECT t.typname, e.enumlabel
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = 'public'
  ORDER BY t.typname, e.enumsortorder
`)
console.log('=== ENUM ===')
const enumMap = {}
for (const r of enums.rows) {
  if (!enumMap[r.typname]) enumMap[r.typname] = []
  enumMap[r.typname].push(r.enumlabel)
}
for (const [name, vals] of Object.entries(enumMap)) console.log(name, '->', vals.join(', '))

const tables = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)
console.log('\n=== TABELLE ===')
for (const r of tables.rows) console.log(r.tablename)

// Colonne per tabelle rilevanti
const rilevanti = ['ordini_fornitori', 'ordini_righe', 'movimenti_magazzino', 'richieste_materiale', 'materiali', 'giornate', 'rapportini', 'chat_messaggi', 'profiles', 'commesse']
for (const t of rilevanti) {
  const cols = await c.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])
  if (cols.rows.length) {
    console.log(`\n=== ${t} ===`)
    for (const col of cols.rows) console.log(`  ${col.column_name} (${col.data_type}, ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`)
  } else {
    console.log(`\n=== ${t} === (NON TROVATA)`)
  }
}

await c.end()
