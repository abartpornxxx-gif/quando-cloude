-- Migrazione Fase 10 — QUADRO
-- Esegui questo script in Supabase Dashboard > SQL Editor > Run

-- 1. Archiviazione commesse
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS archiviata BOOLEAN NOT NULL DEFAULT false;

-- 2. Pianificazione giorno successivo nel rapportino
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS cosa_fare_domani TEXT;
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS urgenza_domani INTEGER;
ALTER TABLE rapportini ADD COLUMN IF NOT EXISTS stima_ore_domani FLOAT;

-- 3. Stima impresa e conferma nella pianificazione
ALTER TABLE pianificazioni ADD COLUMN IF NOT EXISTS stima_impresa_ore FLOAT;
ALTER TABLE pianificazioni ADD COLUMN IF NOT EXISTS confermata BOOLEAN NOT NULL DEFAULT false;

-- 4. Tabella suggerimenti cantiere (promemoria interattivi)
CREATE TABLE IF NOT EXISTS suggerimenti_cantiere (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  testo TEXT NOT NULL,
  categoria TEXT,
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Spunte operai sui suggerimenti per giornata
CREATE TABLE IF NOT EXISTS suggerimenti_spunte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggerimento_id UUID NOT NULL REFERENCES suggerimenti_cantiere(id) ON DELETE CASCADE,
  giornata_id UUID NOT NULL REFERENCES giornate(id) ON DELETE CASCADE,
  completato BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(suggerimento_id, giornata_id)
);

-- RLS per suggerimenti_cantiere (lettura a tutti, scrittura solo impresa — gestito lato app)
ALTER TABLE suggerimenti_cantiere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_suggerimenti" ON suggerimenti_cantiere FOR SELECT USING (true);

ALTER TABLE suggerimenti_spunte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_spunte" ON suggerimenti_spunte FOR SELECT USING (true);
CREATE POLICY "insert_spunte" ON suggerimenti_spunte FOR INSERT WITH CHECK (true);
CREATE POLICY "update_spunte" ON suggerimenti_spunte FOR UPDATE USING (true);
