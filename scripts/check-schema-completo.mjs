/**
 * Verifica che tutte le tabelle/colonne usate da:
 *   - /operaio/giornata/[id]/lavori (page.tsx)
 *   - /magazziniere/richieste/[id] (page.tsx)
 * esistano nel DB di produzione.
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"(.*)"$/, '$1')

const { Client } = pg
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 })
await client.connect()

let allOk = true

async function checkColumn(table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column]
  )
  const ok = rows.length > 0
  if (!ok) allOk = false
  console.log(`  ${ok ? '✅' : '❌ MANCANTE'} ${table}.${column}`)
  return ok
}

async function checkTable(table) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table]
  )
  const ok = rows.length > 0
  if (!ok) allOk = false
  console.log(`  ${ok ? '✅' : '❌ MANCANTE'} tabella: ${table}`)
  return ok
}

async function tryQuery(label, sql, params = []) {
  try {
    await client.query(sql, params)
    console.log(`  ✅ query OK: ${label}`)
    return true
  } catch (e) {
    allOk = false
    console.log(`  ❌ ERRORE query "${label}": ${e.message}`)
    return false
  }
}

console.log('\n══════════════════════════════════════════════════')
console.log('SCHEMA CHECK — tabelle e colonne richieste in prod')
console.log('══════════════════════════════════════════════════\n')

// ── Tabelle base ─────────────────────────────────────────────
console.log('─── Tabelle ───')
await checkTable('giornate')
await checkTable('commesse')
await checkTable('pianificazioni')
await checkTable('giornata_foto')
await checkTable('attrezzatura_usi')
await checkTable('suggerimenti_cantiere')
await checkTable('suggerimenti_spunte')
await checkTable('richieste_materiale')
await checkTable('operai')
await checkTable('materiali')
await checkTable('adempimenti_commessa')
await checkTable('adempimenti_modello')

// ── Colonne critiche ──────────────────────────────────────────
console.log('\n─── Colonne critiche ───')
// giornate
await checkColumn('giornate', 'fase')
await checkColumn('giornate', 'inizio_mattina')
await checkColumn('giornate', 'fine_mattina')
await checkColumn('giornate', 'inizio_pomeriggio')
await checkColumn('giornate', 'fine_pomeriggio')
await checkColumn('giornate', 'stato')
// commesse
await checkColumn('commesse', 'nome')
await checkColumn('commesse', 'indirizzo_cantiere')
await checkColumn('commesse', 'istruzioni_cantiere')
await checkColumn('commesse', 'attrezzature_necessarie')
await checkColumn('commesse', 'tipo_lavoro_id')   // aggiunto Fase 11
// attrezzatura_usi
await checkColumn('attrezzatura_usi', 'giornata_id')
await checkColumn('attrezzatura_usi', 'attrezzatura_id')
await checkColumn('attrezzatura_usi', 'riconsegnata')
// richieste_materiale
await checkColumn('richieste_materiale', 'stato')
await checkColumn('richieste_materiale', 'urgente')
await checkColumn('richieste_materiale', 'foto_url')
await checkColumn('richieste_materiale', 'giornata_id')
await checkColumn('richieste_materiale', 'operaio_id')
await checkColumn('richieste_materiale', 'commessa_id')
await checkColumn('richieste_materiale', 'materiale_id')

// ── Query reali (come le fa Prisma) ──────────────────────────
console.log('\n─── Query simulate (Prisma) ───')

// Simula la query della lavori page
await tryQuery('giornata con commessa+foto+attrezzatureUsi', `
  SELECT g.id, g.fase, g.inizio_mattina, g.fine_mattina, g.inizio_pomeriggio,
         c.id as commessa_id, c.nome, c.indirizzo_cantiere, c.istruzioni_cantiere, c.attrezzature_necessarie,
         au.id as uso_id, au.riconsegnata
  FROM giornate g
  LEFT JOIN commesse c ON c.id = g.commessa_id
  LEFT JOIN attrezzatura_usi au ON au.giornata_id = g.id AND au.riconsegnata = false
  LIMIT 1
`)

// Simula la query suggerimenti
await tryQuery('suggerimenti_cantiere', `
  SELECT id, testo, categoria, attivo FROM suggerimenti_cantiere WHERE attivo = true LIMIT 1
`)
await tryQuery('suggerimenti_spunte', `
  SELECT id, giornata_id, suggerimento_id, completato FROM suggerimenti_spunte LIMIT 1
`)

// Simula la query richiesta magazziniere
await tryQuery('richiesta_materiale con operaio+commessa+materiale', `
  SELECT r.id, r.descrizione, r.urgente, r.stato, r.foto_url, r.note,
         o.nome as operaio_nome,
         c.nome as commessa_nome, c.indirizzo_cantiere,
         m.id as mat_id, m.descrizione as mat_desc
  FROM richieste_materiale r
  LEFT JOIN operai o ON o.id = r.operaio_id
  LEFT JOIN commesse c ON c.id = r.commessa_id
  LEFT JOIN materiali m ON m.id = r.materiale_id
  LIMIT 1
`)

// ── Enum TipoFase giornata ─────────────────────────────────────
console.log('\n─── Enum e tipi ───')
const { rows: enumRows } = await client.query(`
  SELECT enumlabel FROM pg_enum pe
  JOIN pg_type pt ON pe.enumtypid = pt.oid
  WHERE pt.typname = 'fase_giornata'
  ORDER BY enumsortorder
`)
if (enumRows.length > 0) {
  console.log(`  ✅ enum fase_giornata: [${enumRows.map(r => r.enumlabel).join(', ')}]`)
} else {
  // Prova con nome alternativo
  const { rows: enum2 } = await client.query(`
    SELECT enumlabel FROM pg_enum pe
    JOIN pg_type pt ON pe.enumtypid = pt.oid
    WHERE pt.typname ILIKE '%fase%' OR pt.typname ILIKE '%giornata%'
    ORDER BY enumsortorder
  `)
  if (enum2.length > 0) {
    console.log(`  ✅ enum (variante): [${enum2.map(r => r.enumlabel).join(', ')}]`)
  } else {
    console.log(`  ℹ️  nessun enum fase_giornata (probabilmente gestito come text)`)
  }
}

// Verifica enum TipoMovimento con 'reso'
const { rows: tipoMov } = await client.query(`
  SELECT enumlabel FROM pg_enum pe
  JOIN pg_type pt ON pe.enumtypid = pt.oid
  WHERE pt.typname = 'TipoMovimento'
`)
if (tipoMov.length > 0) {
  console.log(`  ✅ enum TipoMovimento: [${tipoMov.map(r => r.enumlabel).join(', ')}]`)
} else {
  console.log(`  ❌ enum TipoMovimento NON TROVATO`)
  allOk = false
}

await client.end()

console.log('\n══════════════════════════════════════════════════')
console.log(allOk ? '✅ TUTTO OK — schema allineato' : '❌ PROBLEMI TROVATI — vedi sopra')
console.log('══════════════════════════════════════════════════\n')
if (!allOk) process.exit(1)
