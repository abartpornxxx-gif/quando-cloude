// Migrazione Fase 5: Fatture attive/passive, DiCo
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString:
    'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
})
await client.connect()

const queries = [
  // Enums
  `DO $$ BEGIN
    CREATE TYPE "StatoFatturaAttiva" AS ENUM ('da_incassare','incassata','scaduta');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "StatoFatturaPassiva" AS ENUM ('da_pagare','pagata');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Fatture attive
  `CREATE TABLE IF NOT EXISTS fatture_attive (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero           TEXT NOT NULL,
    anno             INTEGER NOT NULL,
    data             DATE NOT NULL,
    data_scadenza    DATE,
    cliente_id       UUID REFERENCES clienti(id),
    commessa_id      UUID REFERENCES commesse(id),
    stato            "StatoFatturaAttiva" NOT NULL DEFAULT 'da_incassare',
    aliquota_iva     INTEGER NOT NULL DEFAULT 22,
    note             TEXT,
    data_incasso     DATE,
    importo_incassato INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(numero, anno)
  )`,

  `CREATE TABLE IF NOT EXISTS fattura_attiva_righe (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fattura_id       UUID NOT NULL REFERENCES fatture_attive(id) ON DELETE CASCADE,
    descrizione      TEXT NOT NULL,
    quantita         DOUBLE PRECISION NOT NULL DEFAULT 1,
    prezzo_unitario  INTEGER NOT NULL DEFAULT 0,
    ordine           INTEGER NOT NULL DEFAULT 0
  )`,

  // Fatture passive
  `CREATE TABLE IF NOT EXISTS fatture_passive (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornitore_id     UUID REFERENCES fornitori(id),
    commessa_id      UUID REFERENCES commesse(id),
    ordine_id        UUID REFERENCES ordini_fornitori(id),
    numero           TEXT,
    data             DATE NOT NULL,
    data_scadenza    DATE,
    importo          INTEGER NOT NULL,
    stato            "StatoFatturaPassiva" NOT NULL DEFAULT 'da_pagare',
    data_pagamento   DATE,
    importo_pagato   INTEGER,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Dichiarazioni di conformità
  `CREATE TABLE IF NOT EXISTS dichiarazioni_conformita (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id             UUID REFERENCES commesse(id),
    ragione_sociale         TEXT NOT NULL,
    partita_iva             TEXT,
    indirizzo_impresa       TEXT,
    committente_nome        TEXT NOT NULL,
    committente_indirizzo   TEXT,
    committente_codice_fisc TEXT,
    indirizzo_impianto      TEXT NOT NULL,
    tipo_impianto           TEXT NOT NULL,
    descrizione_lavori      TEXT NOT NULL,
    tipologia_lavori        TEXT,
    normativa               TEXT DEFAULT 'CEI 64-8 / DM 37/2008',
    materiali_componenti    TEXT,
    potenza_impegnata       TEXT,
    tecnico_nome            TEXT NOT NULL,
    tecnico_abilitazione    TEXT,
    data                    DATE NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // RLS
  `ALTER TABLE fatture_attive ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE fattura_attiva_righe ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE fatture_passive ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE dichiarazioni_conformita ENABLE ROW LEVEL SECURITY`,

  // Policies (service role bypassa RLS — policy permissive per sicurezza futura)
  `DO $$ BEGIN
    CREATE POLICY "service_all_fatture_attive" ON fatture_attive FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE POLICY "service_all_fattura_attiva_righe" ON fattura_attiva_righe FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE POLICY "service_all_fatture_passive" ON fatture_passive FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE POLICY "service_all_dichiarazioni_conformita" ON dichiarazioni_conformita FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Trigger updated_at
  `DO $$ BEGIN
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $t$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $t$ LANGUAGE plpgsql;
  EXCEPTION WHEN duplicate_function THEN NULL; END $$`,

  `DROP TRIGGER IF EXISTS fatture_attive_updated_at ON fatture_attive;
   CREATE TRIGGER fatture_attive_updated_at BEFORE UPDATE ON fatture_attive
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS fatture_passive_updated_at ON fatture_passive;
   CREATE TRIGGER fatture_passive_updated_at BEFORE UPDATE ON fatture_passive
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS dichiarazioni_conformita_updated_at ON dichiarazioni_conformita;
   CREATE TRIGGER dichiarazioni_conformita_updated_at BEFORE UPDATE ON dichiarazioni_conformita
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  // Indici
  `CREATE INDEX IF NOT EXISTS idx_fatture_attive_cliente ON fatture_attive(cliente_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fatture_attive_commessa ON fatture_attive(commessa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fatture_attive_stato ON fatture_attive(stato)`,
  `CREATE INDEX IF NOT EXISTS idx_fatture_passive_fornitore ON fatture_passive(fornitore_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fatture_passive_commessa ON fatture_passive(commessa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fatture_passive_stato ON fatture_passive(stato)`,
  `CREATE INDEX IF NOT EXISTS idx_dico_commessa ON dichiarazioni_conformita(commessa_id)`,
]

let ok = 0
for (const q of queries) {
  try {
    await client.query(q)
    ok++
    process.stdout.write('.')
  } catch (err) {
    console.error('\nERRORE:', err.message, '\nQuery:', q.slice(0, 80))
  }
}
console.log(`\nFase 5 completata: ${ok}/${queries.length} query ok`)
await client.end()
