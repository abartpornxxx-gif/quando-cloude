/**
 * QUADRO — Audit completo DB + migrazione automatica
 * Controlla ogni tabella/colonna/enum vs schema Prisma e applica ciò che manca.
 * Connessione: session pooler porta 5432 (supporta DDL).
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('pg')

const DB_URL = 'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

// ─── helper ────────────────────────────────────────────────────────────────

async function query(sql, params = []) {
  const r = await client.query(sql, params)
  return r.rows
}

async function run(sql, label) {
  try {
    await client.query(sql)
    console.log(`  ✓ ${label}`)
    return true
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`)
    return false
  }
}

// Elenca tabelle esistenti
async function getTables() {
  const rows = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `)
  return new Set(rows.map(r => r.table_name))
}

// Elenca colonne di una tabella
async function getColumns(table) {
  const rows = await query(`
    SELECT column_name, data_type, column_default, is_nullable, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `, [table])
  return new Map(rows.map(r => [r.column_name, r]))
}

// Elenca valori di un enum
async function getEnumValues(enumName) {
  const rows = await query(`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = $1
    ORDER BY e.enumsortorder
  `, [enumName])
  return new Set(rows.map(r => r.enumlabel))
}

// ─── 1. ENUM ───────────────────────────────────────────────────────────────

console.log('\n═══ ENUM ═══')

// user_role
{
  const expected = ['impresa', 'operaio', 'cliente', 'magazziniere']
  const existing = await getEnumValues('user_role')
  for (const v of expected) {
    if (!existing.has(v)) {
      await run(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${v}'`, `user_role += ${v}`)
    } else {
      console.log(`  ✓ user_role.${v} OK`)
    }
  }
}

// "UserRole" (PascalCase — usato da ChatMessaggio.ruolo in Prisma)
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'UserRole'`)
  if (rows.length === 0) {
    // Controlla se chat_messaggi.ruolo usa user_role o UserRole
    const cols = await getColumns('chat_messaggi')
    const ruoloCol = cols.get('ruolo')
    if (!ruoloCol) {
      console.log('  - UserRole: chat_messaggi non ancora creata, verrà gestita nella sezione tabelle')
    } else {
      console.log(`  ✓ chat_messaggi.ruolo usa tipo: ${ruoloCol.udt_name}`)
    }
  } else {
    console.log('  ✓ UserRole enum esiste')
  }
}

// stato_mezzo
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_mezzo'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_mezzo AS ENUM ('disponibile','in_uso','in_manutenzione','fuori_servizio')`, 'crea stato_mezzo')
  } else {
    const vals = await getEnumValues('stato_mezzo')
    for (const v of ['disponibile', 'in_uso', 'in_manutenzione', 'fuori_servizio']) {
      if (!vals.has(v)) await run(`ALTER TYPE stato_mezzo ADD VALUE IF NOT EXISTS '${v}'`, `stato_mezzo += ${v}`)
    }
    console.log('  ✓ stato_mezzo OK')
  }
}

// stato_attrezzatura
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_attrezzatura'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_attrezzatura AS ENUM ('disponibile','in_uso','in_manutenzione','fuori_servizio')`, 'crea stato_attrezzatura')
  } else {
    console.log('  ✓ stato_attrezzatura OK')
  }
}

// stato_preventivo
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_preventivo'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_preventivo AS ENUM ('bozza','inviato','accettato','rifiutato')`, 'crea stato_preventivo')
  } else {
    console.log('  ✓ stato_preventivo OK')
  }
}

// stato_commessa
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_commessa'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_commessa AS ENUM ('aperta','chiusa')`, 'crea stato_commessa')
  } else {
    console.log('  ✓ stato_commessa OK')
  }
}

// fase_giornata
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'fase_giornata'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE fase_giornata AS ENUM ('inizio','mattina','pausa','pomeriggio','fine','completata')`, 'crea fase_giornata')
  } else {
    const vals = await getEnumValues('fase_giornata')
    for (const v of ['inizio','mattina','pausa','pomeriggio','fine','completata']) {
      if (!vals.has(v)) await run(`ALTER TYPE fase_giornata ADD VALUE IF NOT EXISTS '${v}'`, `fase_giornata += ${v}`)
    }
    console.log('  ✓ fase_giornata OK')
  }
}

// stato_giornata
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_giornata'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_giornata AS ENUM ('bozza','inviata')`, 'crea stato_giornata')
  } else {
    console.log('  ✓ stato_giornata OK')
  }
}

// tipo_ora
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'tipo_ora'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE tipo_ora AS ENUM ('ordinaria','straordinaria')`, 'crea tipo_ora')
  } else {
    console.log('  ✓ tipo_ora OK')
  }
}

// tipo_assenza
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'tipo_assenza'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE tipo_assenza AS ENUM ('ferie','permesso','malattia','altro')`, 'crea tipo_assenza')
  } else {
    console.log('  ✓ tipo_assenza OK')
  }
}

// stato_assenza
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_assenza'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_assenza AS ENUM ('in_attesa','approvata','rifiutata')`, 'crea stato_assenza')
  } else {
    console.log('  ✓ stato_assenza OK')
  }
}

// stato_richiesta
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_richiesta'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_richiesta AS ENUM ('richiesta','in_preparazione','consegnata')`, 'crea stato_richiesta')
  } else {
    console.log('  ✓ stato_richiesta OK')
  }
}

// "StatoOrdine"
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'StatoOrdine'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE "StatoOrdine" AS ENUM ('richiesto','ordinato','consegnato','usato')`, 'crea StatoOrdine')
  } else {
    console.log('  ✓ StatoOrdine OK')
  }
}

// "TipoMovimento"
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'TipoMovimento'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE "TipoMovimento" AS ENUM ('carico','scarico','reso')`, 'crea TipoMovimento')
  } else {
    console.log('  ✓ TipoMovimento OK')
  }
}

// stato_fattura_attiva
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_fattura_attiva'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_fattura_attiva AS ENUM ('da_incassare','incassata','scaduta')`, 'crea stato_fattura_attiva')
  } else {
    console.log('  ✓ stato_fattura_attiva OK')
  }
}

// stato_fattura_passiva
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_fattura_passiva'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_fattura_passiva AS ENUM ('da_pagare','pagata')`, 'crea stato_fattura_passiva')
  } else {
    console.log('  ✓ stato_fattura_passiva OK')
  }
}

// stato_richiesta_offerta
{
  const rows = await query(`SELECT typname FROM pg_type WHERE typname = 'stato_richiesta_offerta'`)
  if (rows.length === 0) {
    await run(`CREATE TYPE stato_richiesta_offerta AS ENUM ('nuova','vista','in_preventivo','chiusa')`, 'crea stato_richiesta_offerta')
  } else {
    console.log('  ✓ stato_richiesta_offerta OK')
  }
}

// ─── 2. TABELLE & COLONNE ──────────────────────────────────────────────────

const tables = await getTables()
console.log('\n═══ TABELLE ═══')

async function ensureTable(name, createSql) {
  if (!tables.has(name)) {
    await run(createSql, `CREA tabella ${name}`)
    tables.add(name)
    return true
  }
  return false
}

async function ensureColumn(table, col, ddl) {
  const cols = await getColumns(table)
  if (!cols.has(col)) {
    await run(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${ddl}`, `${table}.${col} aggiunto`)
  } else {
    console.log(`  ✓ ${table}.${col} OK`)
  }
}

// profiles
await ensureTable('profiles', `
  CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'cliente',
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('profiles')) {
  console.log('  ✓ profiles esiste')
  await ensureColumn('profiles', 'email', 'email TEXT')
}

// clienti
await ensureTable('clienti', `
  CREATE TABLE clienti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    partita_iva TEXT, codice_fiscale TEXT, indirizzo TEXT,
    citta TEXT, cap TEXT, provincia TEXT, email TEXT, telefono TEXT, pec TEXT,
    codice_destinatario TEXT, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('clienti')) console.log('  ✓ clienti OK')

// fornitori
await ensureTable('fornitori', `
  CREATE TABLE fornitori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    partita_iva TEXT, codice_fiscale TEXT, indirizzo TEXT,
    citta TEXT, cap TEXT, provincia TEXT, email TEXT, telefono TEXT, pec TEXT, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('fornitori')) console.log('  ✓ fornitori OK')

// operai
await ensureTable('operai', `
  CREATE TABLE operai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL, email TEXT UNIQUE, ruolo TEXT,
    costo_orario INT NOT NULL DEFAULT 0, zona TEXT,
    skills JSONB NOT NULL DEFAULT '[]', note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('operai')) console.log('  ✓ operai OK')

// magazzinieri (Fase 12)
await ensureTable('magazzinieri', `
  CREATE TABLE magazzinieri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL, email TEXT UNIQUE, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('magazzinieri')) console.log('  ✓ magazzinieri OK')

// mezzi
await ensureTable('mezzi', `
  CREATE TABLE mezzi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL, targa TEXT,
    stato stato_mezzo NOT NULL DEFAULT 'disponibile',
    scadenza_bollo DATE, scadenza_revisione DATE, scadenza_assicurazione DATE, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('mezzi')) console.log('  ✓ mezzi OK')

// attrezzature
await ensureTable('attrezzature', `
  CREATE TABLE attrezzature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    stato stato_attrezzatura NOT NULL DEFAULT 'disponibile',
    assegnatario TEXT, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('attrezzature')) console.log('  ✓ attrezzature OK')

// materiali
await ensureTable('materiali', `
  CREATE TABLE materiali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codice TEXT, descrizione TEXT NOT NULL,
    prezzo INT NOT NULL DEFAULT 0, unita TEXT DEFAULT 'pz',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('materiali')) console.log('  ✓ materiali OK')

// preventivi
await ensureTable('preventivi', `
  CREATE TABLE preventivi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clienti(id),
    data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stato stato_preventivo NOT NULL DEFAULT 'bozza',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('preventivi')) console.log('  ✓ preventivi OK')

// preventivo_righe
await ensureTable('preventivo_righe', `
  CREATE TABLE preventivo_righe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preventivo_id UUID NOT NULL REFERENCES preventivi(id) ON DELETE CASCADE,
    descrizione TEXT NOT NULL, quantita FLOAT NOT NULL DEFAULT 1,
    prezzo_unitario INT NOT NULL DEFAULT 0, ordine INT NOT NULL DEFAULT 0
  )
`)
if (tables.has('preventivo_righe')) console.log('  ✓ preventivo_righe OK')

// tipi_lavoro (Fase 11)
await ensureTable('tipi_lavoro', `
  CREATE TABLE tipi_lavoro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL, descrizione TEXT, attivo BOOLEAN NOT NULL DEFAULT TRUE, ordine INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('tipi_lavoro')) console.log('  ✓ tipi_lavoro OK')

// commesse
await ensureTable('commesse', `
  CREATE TABLE commesse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cliente_id UUID REFERENCES clienti(id),
    indirizzo_cantiere TEXT,
    stato stato_commessa NOT NULL DEFAULT 'aperta',
    archiviata BOOLEAN NOT NULL DEFAULT FALSE,
    preventivato INT NOT NULL DEFAULT 0,
    costi_materiali INT NOT NULL DEFAULT 0,
    costi_manodopera INT NOT NULL DEFAULT 0,
    costi_mezzi INT NOT NULL DEFAULT 0,
    fatturato INT NOT NULL DEFAULT 0,
    preventivo_id UUID UNIQUE REFERENCES preventivi(id),
    note TEXT,
    tipo_lavoro_id UUID REFERENCES tipi_lavoro(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('commesse')) {
  console.log('  ✓ commesse OK')
  // Colonne aggiunte nelle fasi recenti
  await ensureColumn('commesse', 'archiviata', 'archiviata BOOLEAN NOT NULL DEFAULT FALSE')
  await ensureColumn('commesse', 'tipo_lavoro_id', 'tipo_lavoro_id UUID REFERENCES tipi_lavoro(id) ON DELETE SET NULL')
}

// adempimenti_modello (Fase 11)
await ensureTable('adempimenti_modello', `
  CREATE TABLE adempimenti_modello (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_lavoro_id UUID NOT NULL REFERENCES tipi_lavoro(id) ON DELETE CASCADE,
    testo TEXT NOT NULL, note TEXT, collegamento TEXT, ordine INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('adempimenti_modello')) console.log('  ✓ adempimenti_modello OK')

// adempimenti_commessa (Fase 11)
await ensureTable('adempimenti_commessa', `
  CREATE TABLE adempimenti_commessa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    modello_id UUID REFERENCES adempimenti_modello(id) ON DELETE SET NULL,
    testo TEXT NOT NULL, note TEXT, collegamento TEXT, ordine INT NOT NULL DEFAULT 0,
    fatto BOOLEAN NOT NULL DEFAULT FALSE,
    fatto_da TEXT, fatto_at TIMESTAMPTZ, nota_spunta TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('adempimenti_commessa')) console.log('  ✓ adempimenti_commessa OK')

// commessa_operai
await ensureTable('commessa_operai', `
  CREATE TABLE commessa_operai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    operaio_id UUID NOT NULL REFERENCES operai(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(commessa_id, operaio_id)
  )
`)
if (tables.has('commessa_operai')) console.log('  ✓ commessa_operai OK')

// pianificazioni
await ensureTable('pianificazioni', `
  CREATE TABLE pianificazioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    operaio_id UUID NOT NULL REFERENCES operai(id) ON DELETE CASCADE,
    mezzo_id UUID REFERENCES mezzi(id),
    lavoro_da_fare TEXT, note_materiale TEXT, note TEXT,
    stima_impresa_ore FLOAT, confermata BOOLEAN NOT NULL DEFAULT FALSE, sostituito BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(commessa_id, operaio_id, data)
  )
`)
if (tables.has('pianificazioni')) {
  console.log('  ✓ pianificazioni OK')
  await ensureColumn('pianificazioni', 'stima_impresa_ore', 'stima_impresa_ore FLOAT')
  await ensureColumn('pianificazioni', 'confermata', 'confermata BOOLEAN NOT NULL DEFAULT FALSE')
  await ensureColumn('pianificazioni', 'sostituito', 'sostituito BOOLEAN NOT NULL DEFAULT FALSE')
}

// assenze
await ensureTable('assenze', `
  CREATE TABLE assenze (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operaio_id UUID NOT NULL REFERENCES operai(id) ON DELETE CASCADE,
    data_inizio DATE NOT NULL, data_fine DATE NOT NULL,
    tipo tipo_assenza NOT NULL DEFAULT 'ferie',
    stato stato_assenza NOT NULL DEFAULT 'in_attesa',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('assenze')) console.log('  ✓ assenze OK')

// giornate
await ensureTable('giornate', `
  CREATE TABLE giornate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID NOT NULL REFERENCES commesse(id),
    operaio_id UUID NOT NULL REFERENCES operai(id),
    data DATE NOT NULL,
    mezzo_id UUID REFERENCES mezzi(id),
    pianificazione_id UUID UNIQUE REFERENCES pianificazioni(id),
    lavoro_svolto TEXT, note TEXT,
    stato stato_giornata NOT NULL DEFAULT 'bozza',
    fase fase_giornata NOT NULL DEFAULT 'inizio',
    inizio_mattina TIMESTAMPTZ, fine_mattina TIMESTAMPTZ,
    inizio_pomeriggio TIMESTAMPTZ, fine_pomeriggio TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('giornate')) console.log('  ✓ giornate OK')

// giornata_ore
await ensureTable('giornata_ore', `
  CREATE TABLE giornata_ore (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    tipo tipo_ora NOT NULL DEFAULT 'ordinaria',
    quantita FLOAT NOT NULL
  )
`)
if (tables.has('giornata_ore')) console.log('  ✓ giornata_ore OK')

// giornata_materiali
await ensureTable('giornata_materiali', `
  CREATE TABLE giornata_materiali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    materiale_id UUID REFERENCES materiali(id),
    descrizione TEXT NOT NULL,
    quantita FLOAT NOT NULL DEFAULT 1,
    prezzo_unitario INT NOT NULL DEFAULT 0
  )
`)
if (tables.has('giornata_materiali')) console.log('  ✓ giornata_materiali OK')

// giornata_foto
await ensureTable('giornata_foto', `
  CREATE TABLE giornata_foto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    url TEXT NOT NULL, path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('giornata_foto')) console.log('  ✓ giornata_foto OK')

// checklist_template
await ensureTable('checklist_template', `
  CREATE TABLE checklist_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domanda TEXT NOT NULL, ordine INT NOT NULL DEFAULT 0, attiva BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('checklist_template')) console.log('  ✓ checklist_template OK')

// checklist_risposte
await ensureTable('checklist_risposte', `
  CREATE TABLE checklist_risposte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES checklist_template(id),
    risposta BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(giornata_id, template_id)
  )
`)
if (tables.has('checklist_risposte')) console.log('  ✓ checklist_risposte OK')

// attrezzatura_usi
await ensureTable('attrezzatura_usi', `
  CREATE TABLE attrezzatura_usi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attrezzatura_id UUID NOT NULL REFERENCES attrezzature(id),
    operaio_id UUID NOT NULL REFERENCES operai(id),
    commessa_id UUID NOT NULL REFERENCES commesse(id),
    mezzo_id UUID REFERENCES mezzi(id),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    riconsegnata BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('attrezzatura_usi')) console.log('  ✓ attrezzatura_usi OK')

// richieste_materiale
await ensureTable('richieste_materiale', `
  CREATE TABLE richieste_materiale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    commessa_id UUID NOT NULL REFERENCES commesse(id),
    operaio_id UUID NOT NULL REFERENCES operai(id),
    materiale_id UUID REFERENCES materiali(id),
    descrizione TEXT NOT NULL, urgente BOOLEAN NOT NULL DEFAULT FALSE,
    stato stato_richiesta NOT NULL DEFAULT 'richiesta',
    foto_url TEXT, foto_path TEXT, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('richieste_materiale')) console.log('  ✓ richieste_materiale OK')

// chat_messaggi
await ensureTable('chat_messaggi', `
  CREATE TABLE chat_messaggi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID NOT NULL REFERENCES commesse(id),
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    autore_nome TEXT NOT NULL,
    ruolo user_role NOT NULL,
    testo TEXT, foto_url TEXT, foto_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('chat_messaggi')) console.log('  ✓ chat_messaggi OK')

// rapportini
await ensureTable('rapportini', `
  CREATE TABLE rapportini (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID NOT NULL UNIQUE REFERENCES giornate(id) ON DELETE CASCADE,
    lavoro_eseguito TEXT NOT NULL, lavori_extra TEXT,
    note_attrezzatura TEXT, note_giorno_successivo TEXT,
    ore_ordinarie FLOAT NOT NULL DEFAULT 0,
    ore_straordinarie FLOAT NOT NULL DEFAULT 0,
    cosa_fare_domani TEXT, urgenza_domani INT, stima_ore_domani FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('rapportini')) {
  console.log('  ✓ rapportini OK')
  await ensureColumn('rapportini', 'cosa_fare_domani', 'cosa_fare_domani TEXT')
  await ensureColumn('rapportini', 'urgenza_domani', 'urgenza_domani INT')
  await ensureColumn('rapportini', 'stima_ore_domani', 'stima_ore_domani FLOAT')
}

// ordini_fornitori
await ensureTable('ordini_fornitori', `
  CREATE TABLE ordini_fornitori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornitore_id UUID REFERENCES fornitori(id),
    commessa_id UUID REFERENCES commesse(id),
    stato "StatoOrdine" NOT NULL DEFAULT 'richiesto',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('ordini_fornitori')) console.log('  ✓ ordini_fornitori OK')

// ordini_righe
await ensureTable('ordini_righe', `
  CREATE TABLE ordini_righe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordine_id UUID NOT NULL REFERENCES ordini_fornitori(id) ON DELETE CASCADE,
    materiale_id UUID REFERENCES materiali(id),
    descrizione TEXT NOT NULL,
    quantita FLOAT NOT NULL DEFAULT 1,
    prezzo_unitario INT NOT NULL DEFAULT 0
  )
`)
if (tables.has('ordini_righe')) console.log('  ✓ ordini_righe OK')

// movimenti_magazzino
await ensureTable('movimenti_magazzino', `
  CREATE TABLE movimenti_magazzino (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    materiale_id UUID REFERENCES materiali(id),
    tipo "TipoMovimento" NOT NULL,
    quantita FLOAT NOT NULL,
    descrizione TEXT,
    commessa_id UUID REFERENCES commesse(id),
    ordine_id UUID REFERENCES ordini_fornitori(id),
    richiesta_id UUID UNIQUE REFERENCES richieste_materiale(id),
    note TEXT,
    data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('movimenti_magazzino')) console.log('  ✓ movimenti_magazzino OK')

// fatture_attive
await ensureTable('fatture_attive', `
  CREATE TABLE fatture_attive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT NOT NULL, anno INT NOT NULL, data DATE NOT NULL, data_scadenza DATE,
    cliente_id UUID REFERENCES clienti(id),
    commessa_id UUID REFERENCES commesse(id),
    stato stato_fattura_attiva NOT NULL DEFAULT 'da_incassare',
    aliquota_iva INT NOT NULL DEFAULT 22, note TEXT,
    data_incasso DATE, importo_incassato INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(numero, anno)
  )
`)
if (tables.has('fatture_attive')) console.log('  ✓ fatture_attive OK')

// fattura_attiva_righe
await ensureTable('fattura_attiva_righe', `
  CREATE TABLE fattura_attiva_righe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fattura_id UUID NOT NULL REFERENCES fatture_attive(id) ON DELETE CASCADE,
    descrizione TEXT NOT NULL,
    quantita FLOAT NOT NULL DEFAULT 1,
    prezzo_unitario INT NOT NULL DEFAULT 0,
    ordine INT NOT NULL DEFAULT 0
  )
`)
if (tables.has('fattura_attiva_righe')) console.log('  ✓ fattura_attiva_righe OK')

// fatture_passive
await ensureTable('fatture_passive', `
  CREATE TABLE fatture_passive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornitore_id UUID REFERENCES fornitori(id),
    commessa_id UUID REFERENCES commesse(id),
    ordine_id UUID REFERENCES ordini_fornitori(id),
    numero TEXT, data DATE NOT NULL, data_scadenza DATE,
    importo INT NOT NULL,
    stato stato_fattura_passiva NOT NULL DEFAULT 'da_pagare',
    data_pagamento DATE, importo_pagato INT, note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('fatture_passive')) console.log('  ✓ fatture_passive OK')

// dichiarazioni_conformita
await ensureTable('dichiarazioni_conformita', `
  CREATE TABLE dichiarazioni_conformita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID REFERENCES commesse(id),
    ragione_sociale TEXT NOT NULL, partita_iva TEXT, indirizzo_impresa TEXT,
    committente_nome TEXT NOT NULL, committente_indirizzo TEXT, committente_codice_fisc TEXT,
    indirizzo_impianto TEXT NOT NULL, tipo_impianto TEXT NOT NULL,
    descrizione_lavori TEXT NOT NULL, tipologia_lavori TEXT,
    normativa TEXT DEFAULT 'CEI 64-8 / DM 37/2008', materiali_componenti TEXT,
    potenza_impegnata TEXT, tecnico_nome TEXT NOT NULL, tecnico_abilitazione TEXT,
    data DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('dichiarazioni_conformita')) console.log('  ✓ dichiarazioni_conformita OK')

// offerte_catalogo
await ensureTable('offerte_catalogo', `
  CREATE TABLE offerte_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titolo TEXT NOT NULL, categoria TEXT, descrizione TEXT,
    foto_url TEXT, foto_path TEXT, prezzo_da INT, attiva BOOLEAN NOT NULL DEFAULT TRUE, ordine INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('offerte_catalogo')) console.log('  ✓ offerte_catalogo OK')

// richieste_offerte
await ensureTable('richieste_offerte', `
  CREATE TABLE richieste_offerte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offerta_id UUID NOT NULL REFERENCES offerte_catalogo(id),
    cliente_id UUID NOT NULL REFERENCES clienti(id),
    commessa_id UUID REFERENCES commesse(id),
    note TEXT, stato stato_richiesta_offerta NOT NULL DEFAULT 'nuova',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('richieste_offerte')) console.log('  ✓ richieste_offerte OK')

// suggerimenti_cantiere (Fase 10)
await ensureTable('suggerimenti_cantiere', `
  CREATE TABLE suggerimenti_cantiere (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testo TEXT NOT NULL, categoria TEXT, ordine INT NOT NULL DEFAULT 0, attivo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
if (tables.has('suggerimenti_cantiere')) console.log('  ✓ suggerimenti_cantiere OK')

// suggerimenti_spunte (Fase 10)
await ensureTable('suggerimenti_spunte', `
  CREATE TABLE suggerimenti_spunte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggerimento_id UUID NOT NULL REFERENCES suggerimenti_cantiere(id) ON DELETE CASCADE,
    giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
    completato BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(suggerimento_id, giornata_id)
  )
`)
if (tables.has('suggerimenti_spunte')) console.log('  ✓ suggerimenti_spunte OK')

// configurazione_orari
await ensureTable('configurazione_orari', `
  CREATE TABLE configurazione_orari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    durata_mattina_minuti INT NOT NULL DEFAULT 240,
    durata_pausa_minuti INT NOT NULL DEFAULT 60,
    durata_pomeriggio_minuti INT NOT NULL DEFAULT 240
  )
`)
if (tables.has('configurazione_orari')) console.log('  ✓ configurazione_orari OK')

// ─── 3. RIEPILOGO ──────────────────────────────────────────────────────────

console.log('\n═══ COMPLETATO ═══')
console.log('Audit e migrazione completati.')

await client.end()
