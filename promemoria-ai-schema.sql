-- Migrazione: AI Promemoria — nuovi campi su tabella promemoria
-- Eseguire su Supabase Dashboard → SQL Editor

ALTER TABLE promemoria
  ADD COLUMN IF NOT EXISTS priorita            TEXT NOT NULL DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS cliente_id          UUID REFERENCES clienti(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commessa_id         UUID REFERENCES commesse(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origine_ai          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS testo_originale_ai  TEXT,
  ADD COLUMN IF NOT EXISTS esito_testo         TEXT,
  ADD COLUMN IF NOT EXISTS esito_registrato_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_richiesto BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS azione_suggerita_ai TEXT;
