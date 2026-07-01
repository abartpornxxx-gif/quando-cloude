-- Migrazione: aggiunge categoria_lavoro alle commesse
-- Eseguire su Supabase → SQL Editor
-- Idempotente: sicuro da eseguire più volte

ALTER TABLE commesse
  ADD COLUMN IF NOT EXISTS categoria_lavoro TEXT NOT NULL DEFAULT 'altro';

-- Verifica
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'commesse' AND column_name = 'categoria_lavoro';
