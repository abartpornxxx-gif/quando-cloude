-- Fase 13: Stato lettura notifiche
-- Eseguire in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS notifiche_lette (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL,
  tipo      TEXT        NOT NULL,
  ref_id    TEXT        NOT NULL,
  letto_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT notifiche_lette_unique UNIQUE (user_id, tipo, ref_id)
);

-- RLS: ogni utente vede e scrive solo le proprie righe
ALTER TABLE notifiche_lette ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifiche_lette_own" ON notifiche_lette
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
