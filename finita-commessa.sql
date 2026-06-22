-- Migrazione: aggiunge valore 'finita' all'enum StatoCommessa
-- Eseguire su Supabase SQL Editor prima del deploy
-- PostgreSQL non permette IF NOT EXISTS su ADD VALUE, quindi usiamo DO/EXCEPTION

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'finita'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatoCommessa')
  ) THEN
    ALTER TYPE "StatoCommessa" ADD VALUE 'finita';
  END IF;
END$$;
