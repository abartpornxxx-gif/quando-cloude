import pg from 'pg'
const { Client } = pg
const DB = 'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
const c = new Client({ connectionString: DB })
await c.connect()

// === ENUM ===
const enums = await c.query(`
  SELECT t.typname, e.enumlabel
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = 'public'
  ORDER BY t.typname, e.enumsortorder
`)
console.log('=== ENUM IN DB ===')
const enumMap = {}
for (const r of enums.rows) {
  if (!enumMap[r.typname]) enumMap[r.typname] = []
  enumMap[r.typname].push(r.enumlabel)
}
for (const [name, vals] of Object.entries(enumMap)) console.log(` ${name}: ${vals.join(', ')}`)

const expectedEnums = {
  UserRole: ['impresa','operaio','cliente','magazziniere'],
  StatoMezzo: ['disponibile','in_uso','in_manutenzione','fuori_servizio'],
  StatoAttrezzatura: ['disponibile','in_uso','in_manutenzione','fuori_servizio'],
  StatoPreventivo: ['bozza','inviato','accettato','rifiutato'],
  StatoCommessa: ['aperta','chiusa'],
  FaseGiornata: ['inizio','mattina','pausa','pomeriggio','fine','completata'],
  StatoGiornata: ['bozza','inviata'],
  TipoOra: ['ordinaria','straordinaria'],
  TipoAssenza: ['ferie','permesso','malattia','altro'],
  StatoAssenza: ['in_attesa','approvata','rifiutata'],
  StatoRichiesta: ['richiesta','in_preparazione','consegnata'],
  StatoOrdine: ['richiesto','ordinato','consegnato','usato'],
  TipoMovimento: ['carico','scarico','reso'],
  StatoFatturaAttiva: ['da_incassare','incassata','scaduta'],
  StatoFatturaPassiva: ['da_pagare','pagata'],
}

console.log('\n=== VERIFICA ENUM (schema vs DB) ===')
// DB enums have snake_case keys but Prisma uses PascalCase — check case-insensitively
const dbEnumKeys = Object.fromEntries(Object.entries(enumMap).map(([k,v]) => [k.toLowerCase().replace(/_/g,''), v]))
for (const [name, vals] of Object.entries(expectedEnums)) {
  const key = name.toLowerCase().replace(/_/g,'')
  const dbVals = dbEnumKeys[key]
  if (!dbVals) { console.log(` MANCANTE: ${name}`); continue }
  const missing = vals.filter(v => !dbVals.includes(v))
  const extra = dbVals.filter(v => !vals.includes(v))
  if (missing.length || extra.length) {
    console.log(` DIFF ${name}: mancanti=[${missing}] extra=[${extra}]`)
  } else {
    console.log(` OK: ${name}`)
  }
}

// === TABELLE ===
const tables = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)
const dbTables = tables.rows.map(r => r.tablename)
console.log('\n=== TABELLE IN DB ===')
console.log(dbTables.join(', '))

const expectedTables = [
  'profiles','clienti','fornitori','operai','magazzinieri',
  'mezzi','attrezzature','materiali',
  'preventivi','preventivo_righe','commesse','commessa_operai',
  'giornate','giornata_ore','giornata_materiali','giornata_foto',
  'checklist_template','checklist_risposte',
  'pianificazioni','assenze',
  'attrezzatura_usi','richieste_materiale','chat_messaggi','rapportini',
  'ordini_fornitori','ordini_righe','movimenti_magazzino',
  'fatture_attive','fattura_attiva_righe','fatture_passive','dichiarazioni_conformita',
  'configurazione_orari',
]

console.log('\n=== VERIFICA TABELLE (schema vs DB) ===')
for (const t of expectedTables) {
  if (!dbTables.includes(t)) console.log(` MANCANTE: ${t}`)
  else console.log(` OK: ${t}`)
}

// === COLONNE PER TABELLE CHIAVE FASE 5 ===
const fase5Tables = ['fatture_attive','fattura_attiva_righe','fatture_passive','dichiarazioni_conformita']
for (const t of fase5Tables) {
  const cols = await c.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])
  console.log(`\n=== COLONNE ${t} ===`)
  for (const col of cols.rows) console.log(`  ${col.column_name} (${col.data_type}, ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`)
}

// === RLS ===
const rls = await c.query(`
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename
`)
console.log('\n=== RLS ABILITATA ===')
const noRls = rls.rows.filter(r => !r.rowsecurity).map(r => r.tablename)
if (noRls.length) console.log('SENZA RLS:', noRls.join(', '))
else console.log('OK: tutte le tabelle hanno RLS abilitata')

await c.end()
