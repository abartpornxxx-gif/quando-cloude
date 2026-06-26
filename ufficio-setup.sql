-- ─── QUADRO — Fase: Ruolo Ufficio ─────────────────────────────────────────────

-- 1. Aggiungi valore all'enum DB (idempotente)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ufficio';

-- 2. Tabella collaboratori ufficio
CREATE TABLE IF NOT EXISTS collaboratori_ufficio (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT         NOT NULL,
  email      TEXT         UNIQUE,
  auth_user_id UUID,
  primo_accesso BOOLEAN DEFAULT true,
  password_reset_richiesto BOOLEAN DEFAULT false,
  note       TEXT,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_collaboratori_ufficio_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collaboratori_ufficio_updated_at ON collaboratori_ufficio;
CREATE TRIGGER trg_collaboratori_ufficio_updated_at
  BEFORE UPDATE ON collaboratori_ufficio
  FOR EACH ROW EXECUTE FUNCTION update_collaboratori_ufficio_updated_at();

-- 3. RLS
ALTER TABLE collaboratori_ufficio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "impresa_manage_collaboratori_ufficio" ON collaboratori_ufficio;
CREATE POLICY "impresa_manage_collaboratori_ufficio" ON collaboratori_ufficio
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'impresa')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'impresa');

-- Ufficio può leggere la propria riga (per lookup email)
DROP POLICY IF EXISTS "ufficio_read_own" ON collaboratori_ufficio;
CREATE POLICY "ufficio_read_own" ON collaboratori_ufficio
  FOR SELECT
  USING (
    email = (auth.jwt() -> 'user_metadata' ->> 'email')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'ufficio'
  );
