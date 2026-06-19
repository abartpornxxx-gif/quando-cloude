-- FASE 12 — Creazione Accessi Utente
-- Eseguire in: Supabase Dashboard > SQL Editor > Run
-- ================================================================

-- 1. Aggiunge 'magazziniere' all'enum user_role se non esiste già.
--    Necessario per il trigger handle_new_user (crea il profilo dal ruolo nei user_metadata).
--    ATTENZIONE: ALTER TYPE ... ADD VALUE non può essere eseguito in una transazione.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'magazziniere';

-- ================================================================
-- Nessuna altra modifica DB richiesta.
-- La tabella 'profiles' è già presente e il trigger handle_new_user
-- la popola automaticamente quando si crea un utente via Admin API.
--
-- Se la colonna 'email' non esiste nella tabella profiles, aggiungila:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
-- ================================================================
