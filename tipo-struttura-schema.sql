-- Migrazione: aggiunge tipo_struttura alle commesse
-- Eseguire su Supabase → SQL Editor
-- Idempotente: sicuro da eseguire più volte

ALTER TABLE commesse
  ADD COLUMN IF NOT EXISTS tipo_struttura TEXT NOT NULL DEFAULT 'commessa_semplice';

-- Verifica
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'commesse' AND column_name = 'tipo_struttura';
