-- Migrazione per la sicurezza degli accessi, le mascotte e il cockpit degli operai
-- Tabella: operai
ALTER TABLE public."operai"
  ADD COLUMN IF NOT EXISTS "avatar_mascotte" TEXT,
  ADD COLUMN IF NOT EXISTS "descrizione" TEXT,
  ADD COLUMN IF NOT EXISTS "frase_divertente" TEXT,
  ADD COLUMN IF NOT EXISTS "hobbies" TEXT,
  ADD COLUMN IF NOT EXISTS "colore_mascotte" VARCHAR(50) DEFAULT 'giallo',
  ADD COLUMN IF NOT EXISTS "auth_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "primo_accesso" BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "password_reset_richiesto" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_by" VARCHAR(255);

-- Tabella: magazzinieri
ALTER TABLE public."magazzinieri"
  ADD COLUMN IF NOT EXISTS "auth_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "primo_accesso" BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "password_reset_richiesto" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_by" VARCHAR(255);

-- Tabella: collaboratori_ufficio
ALTER TABLE public."collaboratori_ufficio"
  ADD COLUMN IF NOT EXISTS "auth_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "primo_accesso" BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "password_reset_richiesto" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "ultimo_reset_password_by" VARCHAR(255);
