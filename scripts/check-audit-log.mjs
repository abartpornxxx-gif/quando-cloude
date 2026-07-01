/**
 * Controlla i record reali in ai_audit_log (esclude record di test).
 * NON stampa segreti.
 */
import { readFileSync } from 'fs'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } })

const { rows: summary } = await pool.query(`
  SELECT status, COUNT(*) as cnt
  FROM ai_audit_log
  WHERE user_id NOT LIKE 'test-%' AND user_id NOT LIKE 'migration-%'
  GROUP BY status ORDER BY status
`)

console.log('=== ai_audit_log — record da utenti reali ===')
if (summary.length === 0) {
  console.log('  (vuota — nessun test utente reale ancora eseguito)')
} else {
  for (const r of summary) console.log(`  ${r.status}: ${r.cnt} record`)
}

const { rows: recent } = await pool.query(`
  SELECT
    LEFT(id::text, 8) as id_short,
    LEFT(user_id::text, 8) as uid_short,
    role,
    action_id,
    status,
    risk_level,
    input_text,
    error_message,
    to_char(created_at AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI') as created,
    to_char(executed_at AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI') as executed
  FROM ai_audit_log
  WHERE user_id NOT LIKE 'test-%' AND user_id NOT LIKE 'migration-%'
  ORDER BY created_at DESC LIMIT 10
`)

if (recent.length > 0) {
  console.log('\n=== Ultimi 10 record reali ===')
  for (const r of recent) {
    console.log(`\n  [${r.status}] ${r.action_id} | ${r.role} | ${r.created}`)
    if (r.input_text) console.log(`    Input: "${r.input_text.slice(0, 80)}"`)
    if (r.error_message) console.log(`    Errore: ${r.error_message}`)
    if (r.executed) console.log(`    Eseguito: ${r.executed}`)
  }
}

// Promemoria creati con origine AI nell'ultima ora
const { rows: promemoria } = await pool.query(`
  SELECT
    titolo,
    to_char(data_ora AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI') as data_ora,
    stato,
    tipo,
    to_char(created_at AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI') as creato
  FROM promemoria
  WHERE origine_ai = true
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 10
`)

console.log('\n=== Promemoria creati da AI (ultime 24h) ===')
if (promemoria.length === 0) {
  console.log('  nessuno — test AI non ancora eseguito o promemoria non salvati')
} else {
  for (const p of promemoria) {
    console.log(`  "${p.titolo}" | ${p.data_ora} | ${p.stato} | creato ${p.creato}`)
  }
}

await pool.end()
