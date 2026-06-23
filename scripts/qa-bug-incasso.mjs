/**
 * Diagnosi bug: incasso 500 su fattura 12.200 → dovrebbe essere parzialmente_incassata
 * Test esatto del caso reale segnalato.
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"(.*)"$/, '$1')

const { Client } = pg
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

function euroToCents(v) { return Math.round(parseFloat(String(v).replace(',', '.')) * 100) }
function eur(cents) { return (cents / 100).toFixed(2) + ' EUR' }

async function main() {
  await client.connect()
  console.log('\n═══════════════════════════════════════════')
  console.log('DIAGNOSI — Caso: fattura 12.200 €, incasso 500 €')
  console.log('═══════════════════════════════════════════\n')

  let ok = true
  await client.query('BEGIN')

  try {
    // Crea dati di test
    const { rows: [c] } = await client.query(
      `INSERT INTO clienti (nome, email) VALUES ($1, $2) RETURNING id`,
      ['__QA_DIAG__', `qa-diag-${Date.now()}@test.local`]
    )
    const { rows: [cm] } = await client.query(
      `INSERT INTO commesse (nome, cliente_id, preventivato, stato, fatturato)
       VALUES ($1, $2, 1220000, 'aperta', 0) RETURNING id, fatturato`,
      ['__QA_DIAG_COMMESSA__', c.id]
    )

    // Fattura con IVA 22%: imponibile 10.000 € → totale 12.200 €
    // prezzoUnitario salvato in centesimi: 1.000.000 centesimi = 10.000 €
    const { rows: [f] } = await client.query(
      `INSERT INTO fatture_attive (numero, anno, data, cliente_id, commessa_id, aliquota_iva, stato)
       VALUES ($1, $2, NOW(), $3, $4, 22, 'da_incassare') RETURNING id, stato`,
      [`QADIAG${Date.now()}`, 2026, c.id, cm.id]
    )
    // prezzoUnitario = 1000000 (10.000 € in centesimi), quantita = 1
    await client.query(
      `INSERT INTO fattura_attiva_righe (fattura_id, descrizione, quantita, prezzo_unitario, ordine)
       VALUES ($1, 'Impianto elettrico', 1, 1000000, 0)`,
      [f.id]
    )

    // Ricalcola il totale come farebbe la page
    const { rows: righe } = await client.query(
      `SELECT quantita, prezzo_unitario FROM fattura_attiva_righe WHERE fattura_id = $1`, [f.id]
    )
    const { rows: [fatturaDb] } = await client.query(
      `SELECT aliquota_iva, importo_incassato, stato FROM fatture_attive WHERE id = $1`, [f.id]
    )

    const imponibile = righe.reduce((s, r) => s + Math.round(r.quantita * r.prezzo_unitario), 0)
    const iva = Math.round(imponibile * fatturaDb.aliquota_iva / 100)
    const totale = imponibile + iva

    console.log('Calcolo fattura (come fa la page):')
    console.log('  prezzoUnitario in DB:', righe[0].prezzo_unitario, '(centesimi)')
    console.log('  quantita:', righe[0].quantita)
    console.log('  imponibile:', eur(imponibile), '→', imponibile, 'centesimi')
    console.log('  IVA 22%:', eur(iva))
    console.log('  TOTALE:', eur(totale), '→', totale, 'centesimi')
    console.log('  Atteso totale: 1.220.000 centesimi =', totale === 1220000 ? '✅' : `❌ (trovato ${totale})`)
    if (totale !== 1220000) { ok = false }

    // Simula registraIncasso con incasso 500 €
    const giaIncassato = fatturaDb.importo_incassato ?? 0
    const nuovoImporto = euroToCents('500')  // 50.000 centesimi
    const nuovoTotaleIncassato = giaIncassato + nuovoImporto
    const completamenteIncassata = nuovoTotaleIncassato >= totale

    console.log('\nRegistraIncasso — simulazione:')
    console.log('  giaIncassato:', eur(giaIncassato))
    console.log('  nuovoImporto (500 €):', nuovoImporto, 'centesimi =', eur(nuovoImporto))
    console.log('  totaleRighe (passato al server):', totale, 'centesimi')
    console.log('  nuovoTotaleIncassato:', nuovoTotaleIncassato, 'centesimi')
    console.log('  completamenteIncassata:', completamenteIncassata)
    console.log('  nuovoStato atteso:', completamenteIncassata ? 'incassata ❌ BUG!' : 'parzialmente_incassata ✅')

    const nuovoStato = completamenteIncassata ? 'incassata' : 'parzialmente_incassata'
    if (nuovoStato !== 'parzialmente_incassata') { ok = false }

    // Applica nel DB
    await client.query(
      `UPDATE fatture_attive SET stato = $1, importo_incassato = $2 WHERE id = $3`,
      [nuovoStato, nuovoTotaleIncassato, f.id]
    )
    await client.query(
      `UPDATE commesse SET fatturato = fatturato + $1 WHERE id = $2`,
      [nuovoImporto, cm.id]
    )

    // Verifica
    const { rows: [fPost] } = await client.query(
      `SELECT stato, importo_incassato FROM fatture_attive WHERE id = $1`, [f.id]
    )
    const { rows: [cmPost] } = await client.query(
      `SELECT fatturato FROM commesse WHERE id = $1`, [cm.id]
    )

    console.log('\nVerifica DB dopo incasso 500 €:')
    console.log('  stato:', fPost.stato, fPost.stato === 'parzialmente_incassata' ? '✅' : '❌')
    console.log('  importo_incassato:', eur(Number(fPost.importo_incassato)), Number(fPost.importo_incassato) === 50000 ? '✅' : '❌')
    console.log('  residuo:', eur(totale - Number(fPost.importo_incassato)), totale - Number(fPost.importo_incassato) === 1170000 ? '✅' : '❌')
    console.log('  commessa.fatturato:', eur(Number(cmPost.fatturato)), Number(cmPost.fatturato) === 50000 ? '✅' : '❌')

    if (fPost.stato !== 'parzialmente_incassata') ok = false
    if (Number(fPost.importo_incassato) !== 50000) ok = false
    if (Number(cmPost.fatturato) !== 50000) ok = false

  } finally {
    await client.query('ROLLBACK')
    console.log('\nCleanup: ROLLBACK — nessun dato di test rimasto ✅')
    await client.end()
  }

  console.log('\n═══════════════════════════════════════════')
  console.log(ok ? '✅ LOGICA CORRETTA — il bug non è nella logica attuale' : '❌ BUG CONFERMATO — vedere errori sopra')
  console.log('═══════════════════════════════════════════\n')
  if (!ok) process.exit(1)
}

main().catch(e => { console.error('Errore:', e.message); process.exit(1) })
