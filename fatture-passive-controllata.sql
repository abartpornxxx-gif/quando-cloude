-- Migrazione: aggiunge campo controllata a fatture_passive
-- Eseguire su Supabase Dashboard > SQL Editor

ALTER TABLE fatture_passive
  ADD COLUMN IF NOT EXISTS controllata boolean NOT NULL DEFAULT false;
