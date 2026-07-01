/**
 * QUADRO AI Operating Layer — Migration Check & Apply
 * Esegue pre-check, applica ai-audit-log-schema.sql, post-check, CRUD test.
 * NON stampa mai valori di segreti o DATABASE_URL.
 */

import { readFileSync } from 'fs'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

// ─── Carica .env.local ───────────────────────────────────────────────────────
const envContent = readFileSync(path.join(projectRoot, '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

if (!env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato in .env.local'); process.exit(1)
}

const { Pool } = pg
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } })

const q  = (sql, p=[]) => pool.query(sql, p)
const ok  = m => console.log(`  ✓ ${m}`)
const warn = m => console.warn(`  ⚠ ${m}`)
const fail = m => console.error(`  ✗ ${m}`)

// ─── FASE 2: PRE-CHECK ───────────────────────────────────────────────────────
async function preCheck() {
  console.log('\n=== FASE 2: PRE-CHECK DB ===')

  const { rows: t } = await q(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name='ai_audit_log'`)
  const tableExists = t.length > 0
  tableExists ? ok('Tabella ai_audit_log: GIA\' ESISTE') : warn('Tabella ai_audit_log: NON ESISTE (sarà creata)')

  if (tableExists) {
    const { rows: cols } = await q(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='ai_audit_log' ORDER BY ordinal_position`)
    console.log('  Colonne trovate:')
    for (const c of cols) console.log(`    ${c.column_name}: ${c.data_type}`)
  }

  const { rows: enums } = await q(`SELECT typname FROM pg_type WHERE typname IN ('AiActionStatus','AiRiskLevel')`)
  console.log(`  Enum: ${enums.length ? enums.map(e=>e.typname).join(', ') : 'nessuno'}`)

  const { rows: idx } = await q(`SELECT indexname FROM pg_indexes WHERE tablename='ai_audit_log'`)
  console.log(`  Indici: ${idx.length ? idx.map(r=>r.indexname).join(', ') : 'nessuno'}`)

  return tableExists
}

// ─── FASE 3: APPLICA MIGRATION ───────────────────────────────────────────────
async function applyMigration() {
  console.log('\n=== FASE 3: APPLICA MIGRATION ===')

  await q(`DO $$ BEGIN CREATE TYPE "AiActionStatus" AS ENUM ('DRAFT','CONFIRMED','EXECUTED','FAILED','CANCELLED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  ok('Enum AiActionStatus: OK')

  await q(`DO $$ BEGIN CREATE TYPE "AiRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  ok('Enum AiRiskLevel: OK')

  await q(`CREATE TABLE IF NOT EXISTS ai_audit_log (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           TEXT        NOT NULL,
    role              TEXT        NOT NULL,
    action_id         TEXT        NOT NULL,
    status            "AiActionStatus" NOT NULL DEFAULT 'DRAFT',
    risk_level        "AiRiskLevel"    NOT NULL,
    input_text        TEXT,
    proposed_payload  JSONB       NOT NULL DEFAULT '{}',
    final_payload     JSONB,
    result            JSONB,
    error_message     TEXT,
    commessa_id       UUID,
    cliente_id        UUID,
    rapportino_id     UUID,
    promemoria_id     UUID,
    struttura_nodo_id UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at      TIMESTAMPTZ,
    executed_at       TIMESTAMPTZ
  )`)
  ok('Tabella ai_audit_log: OK')

  await q(`CREATE INDEX IF NOT EXISTS ai_audit_log_user_id_idx    ON ai_audit_log (user_id)`)
  await q(`CREATE INDEX IF NOT EXISTS ai_audit_log_action_id_idx  ON ai_audit_log (action_id)`)
  await q(`CREATE INDEX IF NOT EXISTS ai_audit_log_status_idx     ON ai_audit_log (status)`)
  await q(`CREATE INDEX IF NOT EXISTS ai_audit_log_created_at_idx ON ai_audit_log (created_at DESC)`)
  ok('Indici: OK')

  await q(`ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY`)
  ok('RLS: abilitata')

  await q(`DROP POLICY IF EXISTS "ai_audit_log_own" ON ai_audit_log`)
  await q(`CREATE POLICY "ai_audit_log_own" ON ai_audit_log FOR ALL USING (user_id = auth.uid()::text)`)
  ok('Policy RLS "ai_audit_log_own": OK')
}

// ─── FASE 4: POST-CHECK ───────────────────────────────────────────────────────
async function postCheck() {
  console.log('\n=== FASE 4: POST-CHECK DB ===')
  const expected = [
    'id','user_id','role','action_id','status','risk_level','input_text',
    'proposed_payload','final_payload','result','error_message',
    'commessa_id','cliente_id','rapportino_id','promemoria_id','struttura_nodo_id',
    'created_at','confirmed_at','executed_at'
  ]

  const { rows: cols } = await q(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ai_audit_log'`)
  const present = cols.map(c=>c.column_name)
  const missing = expected.filter(c=>!present.includes(c))

  if (missing.length === 0) ok(`Tutte ${expected.length} colonne presenti`)
  else { fail(`Colonne mancanti: ${missing.join(', ')}`); return false }

  const { rows: enums } = await q(`SELECT typname FROM pg_type WHERE typname IN ('AiActionStatus','AiRiskLevel')`)
  if (enums.length === 2) ok('Enum AiActionStatus + AiRiskLevel: presenti')
  else { fail(`Enum mancanti (trovati ${enums.length}/2)`); return false }

  const { rows: idx } = await q(`SELECT indexname FROM pg_indexes WHERE tablename='ai_audit_log'`)
  ok(`Indici: ${idx.length} (${idx.map(r=>r.indexname).join(', ')})`)

  const { rows: rls } = await q(`SELECT relrowsecurity FROM pg_class WHERE relname='ai_audit_log'`)
  ok(`RLS: ${rls[0]?.relrowsecurity}`)

  const { rows: pol } = await q(`SELECT policyname FROM pg_policies WHERE tablename='ai_audit_log'`)
  ok(`Policy: ${pol.map(p=>p.policyname).join(', ')}`)

  return true
}

// ─── FASE 4b: CRUD TEST ───────────────────────────────────────────────────────
async function testCRUD() {
  console.log('\n=== FASE 4b: CRUD TEST DRAFT→EXECUTED ===')

  const { rows: [r] } = await q(`
    INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload)
    VALUES ('migration-test-user','impresa','PROMEMORIA_CREATE','DRAFT','LOW','{"_test":true}')
    RETURNING id`)
  ok(`INSERT DRAFT: id=${r.id}`)

  await q(`UPDATE ai_audit_log SET status='CONFIRMED', confirmed_at=NOW() WHERE id=$1`, [r.id])
  ok('UPDATE → CONFIRMED: OK')

  await q(`UPDATE ai_audit_log SET status='EXECUTED', executed_at=NOW(),
    final_payload='{"ok":true}', result='{"message":"test"}' WHERE id=$1`, [r.id])
  ok('UPDATE → EXECUTED: OK')

  const { rows: [check] } = await q(`SELECT status, executed_at FROM ai_audit_log WHERE id=$1`, [r.id])
  if (check.status === 'EXECUTED' && check.executed_at) ok('Lettura post-update: coerente')
  else { fail(`Lettura incoerente: ${JSON.stringify(check)}`); return false }

  // Test FAILED
  await q(`INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload,error_message)
    VALUES ('migration-test-user','impresa','PROMEMORIA_CREATE','FAILED','LOW','{}','test error')`)
  ok('INSERT FAILED: OK')

  // Cleanup
  await q(`DELETE FROM ai_audit_log WHERE user_id='migration-test-user'`)
  ok('Cleanup: OK')

  return true
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('QUADRO AI Operating Layer — Migration Tool')

  try {
    await pool.query('SELECT 1')
    console.log('  → Connessione DB: OK')
  } catch(e) {
    console.error(`  → Connessione FALLITA: ${e.message}`)
    process.exit(1)
  }

  const preExisted = await preCheck()
  await applyMigration()
  const post = await postCheck()
  const crud = await testCRUD()

  console.log('\n============================')
  console.log(`Tabella preesistente:  ${preExisted}`)
  console.log(`Post-check OK:         ${post}`)
  console.log(`CRUD test OK:          ${crud}`)

  if (post && crud) {
    console.log('\n✅ MIGRATION AI_AUDIT_LOG: COMPLETATA E VERIFICATA')
  } else {
    console.log('\n❌ MIGRATION INCOMPLETA')
    process.exit(1)
  }

  await pool.end()
}

main().catch(e => { console.error('Errore fatale:', e.message); process.exit(1) })
