-- Migrazione: Conteggio Cantiere (consuntivo lavori)
-- Eseguire su Supabase Dashboard → SQL Editor

-- 1. Enum stato conteggio
DO $$ BEGIN
  CREATE TYPE stato_conteggio AS ENUM (
    'richiesto', 'in_compilazione', 'inviato', 'approvato', 'riaperto'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabella principale
CREATE TABLE IF NOT EXISTS conteggi_cantiere (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id       UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  operaio_id        UUID REFERENCES operai(id) ON DELETE SET NULL,
  stato             stato_conteggio NOT NULL DEFAULT 'richiesto',
  tipo_lavorazione  TEXT,
  serie_civile      TEXT,
  placche_montate   BOOLEAN NOT NULL DEFAULT FALSE,
  placche_calcolate INTEGER NOT NULL DEFAULT 0,
  placche_manuali   INTEGER,
  note_impresa      TEXT,
  note_operaio      TEXT,
  visibile_cliente  BOOLEAN NOT NULL DEFAULT FALSE,
  inviato_at        TIMESTAMPTZ,
  approvato_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabella righe
CREATE TABLE IF NOT EXISTS conteggio_cantiere_righe (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conteggio_id UUID NOT NULL REFERENCES conteggi_cantiere(id) ON DELETE CASCADE,
  categoria    TEXT NOT NULL,
  codice       TEXT,
  descrizione  TEXT NOT NULL,
  quantita     FLOAT NOT NULL DEFAULT 0,
  unita        TEXT DEFAULT 'pz',
  note         TEXT,
  dati_extra   JSONB,
  ordinamento  INTEGER NOT NULL DEFAULT 0
);

-- 4. Tabella foto
CREATE TABLE IF NOT EXISTS conteggio_cantiere_foto (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conteggio_id UUID NOT NULL REFERENCES conteggi_cantiere(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  path         TEXT NOT NULL,
  descrizione  TEXT,
  categoria    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION update_conteggi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_conteggi_updated_at ON conteggi_cantiere;
CREATE TRIGGER trg_conteggi_updated_at
  BEFORE UPDATE ON conteggi_cantiere
  FOR EACH ROW EXECUTE FUNCTION update_conteggi_updated_at();

-- 6. RLS
ALTER TABLE conteggi_cantiere ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteggio_cantiere_righe ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteggio_cantiere_foto ENABLE ROW LEVEL SECURITY;

-- Nota: i controlli di accesso avvengono a livello applicativo (requireImpresa, requireOperaio, etc.)
-- Le policy RLS sono permissive per gli utenti autenticati; il filtro specifico è in Prisma.
CREATE POLICY "auth_conteggi" ON conteggi_cantiere
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_righe" ON conteggio_cantiere_righe
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_foto" ON conteggio_cantiere_foto
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Storage bucket (eseguire separatamente dalla dashboard Supabase se necessario)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('conteggi-cantiere', 'conteggi-cantiere', false)
-- ON CONFLICT (id) DO NOTHING;
