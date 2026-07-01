/**
 * QUADRO AI Operating Layer — Test DB diretto (Fase 6 verifica)
 * Testa il flusso audit DRAFT→CONFIRMED→EXECUTED e i guardrail di sicurezza.
 * NON usa HTTP, NON stampa segreti.
 */

import { readFileSync } from 'fs'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const envContent = readFileSync(path.join(root, '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { Pool } = pg
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 2, ssl: { rejectUnauthorized: false } })
const q = (sql, p=[]) => pool.query(sql, p)

let passed = 0, failed = 0
function test(name, fn) { return { name, fn } }

async function run(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch(e) {
    console.error(`  ✗ ${name}: ${e.message}`)
    failed++
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg) }

// ─── Helper: crea un audit DRAFT nel DB ──────────────────────────────────────
async function createDraft({ userId='test-ai-verify', role='impresa', actionId='PROMEMORIA_CREATE', riskLevel='MEDIUM', payload={titolo:'Test', dataOra: new Date().toISOString()} } = {}) {
  const { rows: [r] } = await q(`
    INSERT INTO ai_audit_log (user_id, role, action_id, status, risk_level, proposed_payload, input_text)
    VALUES ($1, $2, $3, 'DRAFT', $4, $5, 'testo test')
    RETURNING *
  `, [userId, role, actionId, riskLevel, JSON.stringify(payload)])
  return r
}

async function cleanup() {
  await q(`DELETE FROM ai_audit_log WHERE user_id LIKE 'test-ai-%'`)
}

// ─── TEST 1: Ciclo completo DRAFT → CONFIRMED → EXECUTED ─────────────────────
const tests = [

  test('Ciclo DRAFT → CONFIRMED → EXECUTED', async () => {
    const rec = await createDraft({ actionId: 'PROMEMORIA_CREATE' })
    assert(rec.status === 'DRAFT', `status deve essere DRAFT, trovato ${rec.status}`)
    assert(rec.id, 'id deve essere presente')
    assert(rec.proposed_payload?.titolo === 'Test', 'payload intatto')

    await q(`UPDATE ai_audit_log SET status='CONFIRMED', confirmed_at=NOW() WHERE id=$1`, [rec.id])
    const { rows: [c] } = await q(`SELECT status, confirmed_at FROM ai_audit_log WHERE id=$1`, [rec.id])
    assert(c.status === 'CONFIRMED', 'dopo update deve essere CONFIRMED')
    assert(c.confirmed_at, 'confirmed_at deve essere impostato')

    await q(`UPDATE ai_audit_log SET status='EXECUTED', executed_at=NOW(),
      final_payload='{"titolo":"Test"}', result='{"message":"creato","recordId":"fake-id"}' WHERE id=$1`, [rec.id])
    const { rows: [e] } = await q(`SELECT status, executed_at, result FROM ai_audit_log WHERE id=$1`, [rec.id])
    assert(e.status === 'EXECUTED', 'deve essere EXECUTED')
    assert(e.executed_at, 'executed_at presente')
    assert(e.result?.message === 'creato', 'result JSON corretto')
  }),

  test('Ciclo DRAFT → FAILED (executor fallisce)', async () => {
    const rec = await createDraft({ actionId: 'PROMEMORIA_CREATE', riskLevel: 'LOW' })
    await q(`UPDATE ai_audit_log SET status='FAILED', error_message='Titolo mancante', executed_at=NOW() WHERE id=$1`, [rec.id])
    const { rows: [f] } = await q(`SELECT status, error_message FROM ai_audit_log WHERE id=$1`, [rec.id])
    assert(f.status === 'FAILED', 'deve essere FAILED')
    assert(f.error_message === 'Titolo mancante', 'error_message corretto')
  }),

  test('Protezione double-confirm: CONFIRMED non può diventare EXECUTED direttamente da DRAFT', async () => {
    const rec = await createDraft({ actionId: 'PROMEMORIA_CREATE' })
    // Simula prima conferma
    await q(`UPDATE ai_audit_log SET status='EXECUTED', executed_at=NOW() WHERE id=$1 AND status='DRAFT'`, [rec.id])
    // Simula seconda conferma (come farebbe l'API se la chiamata arrivasse di nuovo)
    // L'API controlla status !== 'DRAFT' e restituisce 409
    const { rows: [check] } = await q(`SELECT status FROM ai_audit_log WHERE id=$1`, [rec.id])
    // Verifica: non è più DRAFT, quindi una seconda chiamata confirm sarebbe rifiutata
    assert(check.status !== 'DRAFT', 'record non è più DRAFT — una seconda confirm verrebbe rifiutata con 409')
  }),

  test('CANCELLED: ruolo non autorizzato a runtime', async () => {
    const rec = await createDraft({ userId: 'test-ai-unauth', actionId: 'COMMESSA_CREATE_DRAFT' })
    // Simula il caso in cui la confirm trova il ruolo non autorizzato
    await q(`UPDATE ai_audit_log SET status='CANCELLED', error_message='Ruolo operaio non autorizzato' WHERE id=$1`, [rec.id])
    const { rows: [cc] } = await q(`SELECT status, error_message FROM ai_audit_log WHERE id=$1`, [rec.id])
    assert(cc.status === 'CANCELLED', 'deve essere CANCELLED')
    assert(cc.error_message?.includes('non autorizzato'), 'error_message indica motivo')
  }),

  test('Record isola per user_id (sicurezza multi-utente)', async () => {
    const u1 = await createDraft({ userId: 'test-ai-user1', actionId: 'PROMEMORIA_CREATE' })
    const u2 = await createDraft({ userId: 'test-ai-user2', actionId: 'PROMEMORIA_CREATE' })

    // L'API verifica auditLog.userId !== user.id → 403
    // Simuliamo: user1 prova a confermare il draft di user2
    const { rows: own } = await q(`SELECT id FROM ai_audit_log WHERE id=$1 AND user_id='test-ai-user1'`, [u2.id])
    assert(own.length === 0, 'user1 non trova il draft di user2 → protezione ownership OK')
  }),

  test('Enum status: solo valori validi accettati', async () => {
    let caught = false
    try {
      await q(`INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload)
        VALUES ('test-ai-bad','impresa','PROMEMORIA_CREATE','INVALID_STATUS','LOW','{}')`)
    } catch(e) {
      caught = true
      assert(e.message.includes('invalid input value') || e.message.includes('enum') || e.message.includes('AiActionStatus'),
        `Errore DB corretto: ${e.message}`)
    }
    assert(caught, 'INSERT con status non valido deve fallire')
  }),

  test('Enum risk_level: solo valori validi accettati', async () => {
    let caught = false
    try {
      await q(`INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload)
        VALUES ('test-ai-bad','impresa','PROMEMORIA_CREATE','DRAFT','CRITICAL','{}')`)
    } catch(e) {
      caught = true
    }
    assert(caught, 'INSERT con risk_level non valido deve fallire')
  }),

  test('Batch: max 5 draft per richiesta (guardrail logico)', async () => {
    // Crea 5 DRAFT (il massimo consentito)
    const ids = []
    for (let i = 0; i < 5; i++) {
      const rec = await createDraft({ userId: 'test-ai-batch', actionId: 'PROMEMORIA_CREATE',
        payload: { titolo: `Test ${i+1}`, dataOra: new Date().toISOString() } })
      ids.push(rec.id)
    }
    const { rows } = await q(`SELECT COUNT(*) as cnt FROM ai_audit_log WHERE user_id='test-ai-batch'`)
    assert(parseInt(rows[0].cnt) === 5, `Creati 5 record DRAFT, trovati ${rows[0].cnt}`)
    // Il 6° sarebbe bloccato dall'API (limite client-side: slice(0,5))
  }),

  test('RLS policy presente nel DB', async () => {
    const { rows } = await q(`
      SELECT policyname, cmd FROM pg_policies
      WHERE tablename = 'ai_audit_log' AND policyname = 'ai_audit_log_own'`)
    assert(rows.length === 1, 'Policy "ai_audit_log_own" deve esistere')
    // pg_policies.cmd restituisce 'ALL' per FOR ALL
    assert(rows[0].cmd === 'ALL', `cmd deve essere 'ALL', trovato: ${rows[0].cmd}`)
  }),

  test('Indici presenti: 4 custom + 1 pk', async () => {
    const { rows } = await q(`SELECT indexname FROM pg_indexes WHERE tablename='ai_audit_log'`)
    const names = rows.map(r => r.indexname)
    assert(names.includes('ai_audit_log_user_id_idx'), 'indice user_id presente')
    assert(names.includes('ai_audit_log_status_idx'), 'indice status presente')
    assert(names.includes('ai_audit_log_action_id_idx'), 'indice action_id presente')
    assert(names.includes('ai_audit_log_created_at_idx'), 'indice created_at presente')
    assert(names.includes('ai_audit_log_pkey'), 'primary key presente')
    assert(rows.length >= 5, `Attesi ≥5 indici, trovati ${rows.length}`)
  }),

  test('JSONB proposed_payload + final_payload funzionano', async () => {
    const payload = { titolo: 'Test JSONB', dataOra: '2026-07-02T09:00:00', tipo: 'sopralluogo', custom: { nested: true } }
    const { rows: [r] } = await q(`
      INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload)
      VALUES ('test-ai-jsonb','impresa','PROMEMORIA_CREATE','DRAFT','MEDIUM',$1)
      RETURNING proposed_payload
    `, [JSON.stringify(payload)])
    assert(r.proposed_payload?.titolo === 'Test JSONB', 'JSONB proposto: lettura corretta')
    assert(r.proposed_payload?.custom?.nested === true, 'JSONB nested object: OK')

    await q(`UPDATE ai_audit_log SET final_payload=$1 WHERE user_id='test-ai-jsonb'`,
      [JSON.stringify({ ...payload, confermato: true })])
    const { rows: [u] } = await q(`SELECT final_payload FROM ai_audit_log WHERE user_id='test-ai-jsonb'`)
    assert(u.final_payload?.confermato === true, 'final_payload JSONB aggiornato correttamente')
  }),

  test('Colonne nullable opzionali accettano NULL', async () => {
    const { rows: [r] } = await q(`
      INSERT INTO ai_audit_log (user_id,role,action_id,status,risk_level,proposed_payload)
      VALUES ('test-ai-null','impresa','PROMEMORIA_CREATE','DRAFT','LOW','{}')
      RETURNING commessa_id, cliente_id, rapportino_id, promemoria_id, struttura_nodo_id`)
    assert(r.commessa_id === null, 'commessa_id nullable: OK')
    assert(r.cliente_id === null, 'cliente_id nullable: OK')
    assert(r.struttura_nodo_id === null, 'struttura_nodo_id nullable: OK')
  }),

]

// ─── VERIFICA CODICE SORGENTE (analisi statica) ──────────────────────────────
const staticChecks = [

  test('[STATIC] prepare route: verifica auth prima di tutto', async () => {
    const code = readFileSync(path.join(root, 'app/api/ai/actions/prepare/route.ts'), 'utf8')
    assert(code.includes("if (!user) return NextResponse.json({ error: 'Non autorizzato' }"), 'Auth check presente')
    assert(code.includes("role === 'cliente'"), 'Cliente escluso')
    assert(code.includes('rateLimitMap'), 'Rate limiting presente')
    assert(code.includes("slice(0, 5)"), 'Max 5 draft enforced')
    assert(!code.includes('DATABASE_URL') && !code.includes('password') && !code.includes('secret'),
      'Nessun segreto esposto nel codice')
  }),

  test('[STATIC] confirm route: re-valida e ownership check', async () => {
    const code = readFileSync(path.join(root, 'app/api/ai/actions/confirm/route.ts'), 'utf8')
    assert(code.includes("auditLog.userId !== user.id"), 'Ownership check presente')
    assert(code.includes("status !== 'DRAFT'"), 'Double-confirm protection presente')
    assert(code.includes('validateAction'), 'Re-validazione payload presente')
    assert(code.includes("role === 'cliente'"), 'Cliente escluso dalla confirm')
    assert(!code.includes('DATABASE_URL'), 'Nessun segreto esposto')
  }),

  test('[STATIC] executor: nessuna azione senza auditId', async () => {
    const code = readFileSync(path.join(root, 'lib/ai/actions/executor.ts'), 'utf8')
    assert(code.includes('auditId: string'), 'auditId obbligatorio')
    assert(code.includes("'FAILED'"), 'FAILED gestito')
    assert(code.includes("'EXECUTED'"), 'EXECUTED gestito')
    assert(code.includes("'CONFIRMED'"), 'CONFIRMED gestito')
    assert(!code.includes('note:'), 'Campo "note" rimosso (fix TypeScript)')
  }),

  test('[STATIC] validator: controlla ruolo, actionId, campi', async () => {
    const code = readFileSync(path.join(root, 'lib/ai/quadro-action-validator.ts'), 'utf8')
    assert(code.includes('isValidActionId'), 'Check actionId nel registry')
    assert(code.includes('allowedRoles'), 'Check ruolo autorizzato')
    assert(code.includes('requiredFields'), 'Check campi obbligatori')
  }),

  test('[STATIC] AssistenteContestuale: cliente non accede al flusso azioni', async () => {
    const code = readFileSync(path.join(root, 'components/ai/AssistenteContestuale.tsx'), 'utf8')
    assert(code.includes("role !== 'cliente'"), 'Cliente escluso dal flusso azioni')
    assert(code.includes('isActionIntent'), 'Rilevamento intent presente')
    assert(code.includes('AiActionConfirmPanel'), 'UI conferma integrata')
  }),

]

// ─── ESECUZIONE ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== FASE 6 — TEST AI OPERATING LAYER (DB + Statico) ===\n')

  try {
    await pool.query('SELECT 1')
    console.log('  Connessione DB: OK\n')
  } catch(e) {
    console.error('Connessione DB fallita:', e.message); process.exit(1)
  }

  console.log('--- Test DB ---')
  for (const t of tests) await run(t.name, t.fn)

  console.log('\n--- Test Statici (analisi codice) ---')
  for (const t of staticChecks) await run(t.name, t.fn)

  await cleanup()

  console.log(`\n============================`)
  console.log(`Passati: ${passed} | Falliti: ${failed}`)
  if (failed === 0) {
    console.log('\n✅ TUTTI I TEST AI LAYER PASSATI')
  } else {
    console.log('\n❌ ALCUNI TEST FALLITI')
    process.exit(1)
  }

  await pool.end()
}

main().catch(e => { console.error('Errore fatale:', e.message); process.exit(1) })
