/**
 * QA VERIFICA FINALE — Incassi parziali (commit 1452a36)
 * Testa:
 *   1. Incasso 500 € su fattura 12.200 € → parzialmente_incassata, residuo 11.700 €
 *   2. Incasso 11.700 € (saldo) → incassata, residuo 0
 * Usa la stessa logica della action registraIncasso aggiornata (totale calcolato server-side).
 * ROLLBACK al termine — nessun dato di test rimane nel DB.
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
function getEnv(key) {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='))
  if (!line) throw new Error(`${key} non trovato in .env.local`)
  return line.split('=').slice(1).join('=').trim().replace(/^"(.*)"$/, '$1')
}

const DATABASE_URL = getEnv('DATABASE_URL')
// Costruisce URL diretto da URL pooler (porta 6543 → 5432, host pooler → db.ref.supabase.co)
function buildDirectUrl(poolerUrl) {
  const m = poolerUrl.match(/postgresql:\/\/([^:]+):([^@]+)@aws-[^.]+\.[^.]+\.pooler\.supabase\.com:\d+\/(.+)/)
  if (!m) return null
  const [, user, pass, db] = m
  const ref = user.split('.')[1] // postgres.REFID → REFID
  if (!ref) return null
  return `postgresql://${user}:${pass}@db.${ref}.supabase.co:5432/${db}`
}

function euroToCents(v) { return Math.round(parseFloat(String(v).replace(',', '.')) * 100) }
function eur(cents) { return (cents / 100).toFixed(2) + ' €' }

// Logica identica alla action aggiornata (server-side calc)
function calcolaStato(righe, aliquotaIva, giaIncassato, nuovoImporto) {
  const imponibile = righe.reduce((s, r) => s + Math.round(Number(r.quantita) * Number(r.prezzo_unitario)), 0)
  const iva = Math.round(imponibile * aliquotaIva / 100)
  const totaleFattura = imponibile + iva
  const residuo = totaleFattura - giaIncassato
  if (nuovoImporto <= 0) throw new Error('Importo non valido')
  if (nuovoImporto > residuo) throw new Error(`Importo superiore al residuo: residuo=${eur(residuo)}`)
  const nuovoTotaleIncassato = giaIncassato + nuovoImporto
  const completo = nuovoTotaleIncassato >= totaleFattura
  return { totaleFattura, nuovoTotaleIncassato, stato: completo ? 'incassata' : 'parzialmente_incassata' }
}

async function tryConnect(url, label) {
  const { Client } = pg
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  try {
    await client.connect()
    console.log(`  ✅ Connesso via ${label}`)
    return client
  } catch (e) {
    console.log(`  ⚠️  ${label} fallito: ${e.message}`)
    return null
  }
}

async function getClient() {
  console.log('Connessione al DB...')
  let client = await tryConnect(DATABASE_URL, 'pooler (6543)')
  if (!client) {
    const directUrl = buildDirectUrl(DATABASE_URL)
    if (directUrl) {
      client = await tryConnect(directUrl, 'direct (5432)')
    }
  }
  if (!client) throw new Error('Impossibile connettersi al DB — verificare rete e credenziali')
  return client
}

async function main() {
  let ok = true
  const risultati = {}

  const client = await getClient()
  await client.query('BEGIN')

  try {
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('QA VERIFICA FINALE — Incassi parziali (commit 1452a36)')
    console.log('═══════════════════════════════════════════════════════\n')

    // Setup dati di test
    const ts = Date.now()
    const { rows: [c] } = await client.query(
      `INSERT INTO clienti (nome, email) VALUES ($1, $2) RETURNING id`,
      [`__QA_FINALE__`, `qa-finale-${ts}@test.local`]
    )
    const { rows: [cm] } = await client.query(
      `INSERT INTO commesse (nome, cliente_id, preventivato, stato, fatturato)
       VALUES ($1, $2, 1220000, 'aperta', 0) RETURNING id`,
      [`__QA_FINALE_CM__`, c.id]
    )
    const { rows: [f] } = await client.query(
      `INSERT INTO fatture_attive (numero, anno, data, cliente_id, commessa_id, aliquota_iva, stato)
       VALUES ($1, $2, NOW(), $3, $4, 22, 'da_incassare') RETURNING id`,
      [`QAFIN${ts}`, 2026, c.id, cm.id]
    )
    // prezzoUnitario = 1.000.000 centesimi = 10.000 €; aliquotaIva 22% → totale 12.200 €
    await client.query(
      `INSERT INTO fattura_attiva_righe (fattura_id, descrizione, quantita, prezzo_unitario, ordine)
       VALUES ($1, 'Impianto elettrico', 1, 1000000, 0)`,
      [f.id]
    )

    // Helper: legge righe e fattura attuali dal DB (come fa la action)
    async function leggiDaDB() {
      const { rows: righe } = await client.query(
        `SELECT quantita, prezzo_unitario FROM fattura_attiva_righe WHERE fattura_id = $1`, [f.id]
      )
      const { rows: [fatt] } = await client.query(
        `SELECT aliquota_iva, importo_incassato, stato FROM fatture_attive WHERE id = $1`, [f.id]
      )
      return { righe, aliquotaIva: Number(fatt.aliquota_iva), giaIncassato: Number(fatt.importo_incassato ?? 0), stato: fatt.stato }
    }

    async function applicaIncassoDB(nuovoImporto) {
      const { righe, aliquotaIva, giaIncassato, stato } = await leggiDaDB()
      if (stato === 'incassata') throw new Error('Fattura già interamente incassata')
      const calc = calcolaStato(righe, aliquotaIva, giaIncassato, nuovoImporto)
      await client.query(
        `UPDATE fatture_attive SET stato = $1, importo_incassato = $2 WHERE id = $3`,
        [calc.stato, calc.nuovoTotaleIncassato, f.id]
      )
      await client.query(
        `UPDATE commesse SET fatturato = fatturato + $1 WHERE id = $2`,
        [nuovoImporto, cm.id]
      )
      return calc
    }

    // ─── TEST 1: Incasso parziale 500 € ────────────────────────────────────────
    console.log('TEST 1 — Incasso 500 € su fattura 12.200 €')
    console.log('─────────────────────────────────────────────')
    const imp500 = euroToCents('500')  // 50.000 centesimi
    const calc1 = await applicaIncassoDB(imp500)

    console.log(`  totaleFattura calcolato: ${eur(calc1.totaleFattura)}  atteso 12.200 €`)
    console.log(`  nuovoTotaleIncassato:    ${eur(calc1.nuovoTotaleIncassato)}  atteso 500 €`)
    console.log(`  stato risultante:        ${calc1.stato}`)

    const { rows: [fPost1] } = await client.query(
      `SELECT stato, importo_incassato FROM fatture_attive WHERE id = $1`, [f.id]
    )
    const { rows: [cmPost1] } = await client.query(
      `SELECT fatturato FROM commesse WHERE id = $1`, [cm.id]
    )

    const t1_stato_ok = fPost1.stato === 'parzialmente_incassata'
    const t1_importo_ok = Number(fPost1.importo_incassato) === 50000
    const t1_residuo_ok = calc1.totaleFattura - Number(fPost1.importo_incassato) === 1170000
    const t1_fatturato_ok = Number(cmPost1.fatturato) === 50000

    console.log(`  DB stato:          ${fPost1.stato}  ${t1_stato_ok ? '✅' : '❌ ATTESO parzialmente_incassata'}`)
    console.log(`  DB importoIncassato: ${eur(Number(fPost1.importo_incassato))}  ${t1_importo_ok ? '✅' : '❌ ATTESO 500 €'}`)
    console.log(`  Residuo rimasto:   ${eur(calc1.totaleFattura - Number(fPost1.importo_incassato))}  ${t1_residuo_ok ? '✅' : '❌ ATTESO 11.700 €'}`)
    console.log(`  commessa.fatturato: ${eur(Number(cmPost1.fatturato))}  ${t1_fatturato_ok ? '✅' : '❌ ATTESO 500 €'}`)

    const test1_ok = t1_stato_ok && t1_importo_ok && t1_residuo_ok && t1_fatturato_ok
    risultati['Test 1 (500 € → parzialmente_incassata)'] = test1_ok ? '✅ RIUSCITO' : '❌ FALLITO'
    if (!test1_ok) ok = false

    // ─── TEST 2: Saldo residuo 11.700 € ───────────────────────────────────────
    console.log('\nTEST 2 — Saldo residuo 11.700 € → chiude la fattura')
    console.log('─────────────────────────────────────────────')
    const imp11700 = euroToCents('11700')  // 1.170.000 centesimi
    const calc2 = await applicaIncassoDB(imp11700)

    console.log(`  nuovoTotaleIncassato:    ${eur(calc2.nuovoTotaleIncassato)}  atteso 12.200 €`)
    console.log(`  stato risultante:        ${calc2.stato}`)

    const { rows: [fPost2] } = await client.query(
      `SELECT stato, importo_incassato FROM fatture_attive WHERE id = $1`, [f.id]
    )
    const { rows: [cmPost2] } = await client.query(
      `SELECT fatturato FROM commesse WHERE id = $1`, [cm.id]
    )

    const t2_stato_ok = fPost2.stato === 'incassata'
    const t2_importo_ok = Number(fPost2.importo_incassato) === 1220000
    const t2_residuo_ok = calc2.totaleFattura - Number(fPost2.importo_incassato) === 0
    const t2_fatturato_ok = Number(cmPost2.fatturato) === 1220000

    console.log(`  DB stato:          ${fPost2.stato}  ${t2_stato_ok ? '✅' : '❌ ATTESO incassata'}`)
    console.log(`  DB importoIncassato: ${eur(Number(fPost2.importo_incassato))}  ${t2_importo_ok ? '✅' : '❌ ATTESO 12.200 €'}`)
    console.log(`  Residuo rimasto:   ${eur(calc2.totaleFattura - Number(fPost2.importo_incassato))}  ${t2_residuo_ok ? '✅' : '❌ ATTESO 0 €'}`)
    console.log(`  commessa.fatturato: ${eur(Number(cmPost2.fatturato))}  ${t2_fatturato_ok ? '✅' : '❌ ATTESO 12.200 €'}`)

    const test2_ok = t2_stato_ok && t2_importo_ok && t2_residuo_ok && t2_fatturato_ok
    risultati['Test 2 (11.700 € → incassata)'] = test2_ok ? '✅ RIUSCITO' : '❌ FALLITO'
    if (!test2_ok) ok = false

    // ─── TEST 3: Guard — ulteriore incasso su fattura già incassata ────────────
    console.log('\nTEST 3 — Guard: incasso su fattura già incassata deve errore')
    console.log('─────────────────────────────────────────────')
    try {
      await applicaIncassoDB(1)
      console.log('  ❌ DOVEVA lanciare errore ma non lo ha fatto')
      risultati['Test 3 (guard già incassata)'] = '❌ FALLITO'
      ok = false
    } catch (e) {
      const guardOk = e.message.includes('già interamente incassata')
      console.log(`  Errore ricevuto: "${e.message}"  ${guardOk ? '✅' : '❌ MESSAGGIO ERRATO'}`)
      risultati['Test 3 (guard già incassata)'] = guardOk ? '✅ RIUSCITO' : '❌ FALLITO'
      if (!guardOk) ok = false
    }

  } finally {
    await client.query('ROLLBACK')
    console.log('\n  Cleanup: ROLLBACK — nessun dato di test rimasto nel DB ✅')
    await client.end()
  }

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('RIEPILOGO')
  console.log('═══════════════════════════════════════════════════════')
  for (const [nome, esito] of Object.entries(risultati)) {
    console.log(`  ${esito}  ${nome}`)
  }
  console.log('═══════════════════════════════════════════════════════')
  console.log(ok ? '✅ TUTTI I TEST SUPERATI' : '❌ ALCUNI TEST FALLITI')
  console.log('═══════════════════════════════════════════════════════\n')
  if (!ok) process.exit(1)
}

main().catch(e => { console.error('\n❌ Errore fatale:', e.message); process.exit(1) })
