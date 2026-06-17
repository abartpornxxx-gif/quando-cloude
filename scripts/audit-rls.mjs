// Verifica policy RLS sulle tabelle principali
import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

const policies = await c.query(`
  SELECT tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
`)

console.log('=== RLS POLICIES ===')
for (const p of policies.rows) {
  console.log(`${p.tablename} | ${p.policyname} | ${p.cmd}`)
}

// Tabelle senza RLS abilitato
const noRls = await c.query(`
  SELECT relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
  ORDER BY relname
`)
console.log('\n=== TABELLE SENZA RLS ===')
for (const r of noRls.rows) console.log(r.relname)

await c.end()
