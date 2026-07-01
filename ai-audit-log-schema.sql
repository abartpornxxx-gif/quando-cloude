-- QUADRO AI Operating Layer — Migration
-- Eseguire su Supabase → SQL Editor
-- Idempotente: sicuro da eseguire più volte

-- 1. Enum AiActionStatus
DO $$ BEGIN
  CREATE TYPE "AiActionStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'EXECUTED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enum AiRiskLevel
DO $$ BEGIN
  CREATE TYPE "AiRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabella ai_audit_log
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT        NOT NULL,
  role             TEXT        NOT NULL,
  action_id        TEXT        NOT NULL,
  status           "AiActionStatus" NOT NULL DEFAULT 'DRAFT',
  risk_level       "AiRiskLevel"    NOT NULL,
  input_text       TEXT,
  proposed_payload JSONB       NOT NULL DEFAULT '{}',
  final_payload    JSONB,
  result           JSONB,
  error_message    TEXT,
  commessa_id      UUID,
  cliente_id       UUID,
  rapportino_id    UUID,
  promemoria_id    UUID,
  struttura_nodo_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ,
  executed_at      TIMESTAMPTZ
);

-- 4. Indici per query frequenti
CREATE INDEX IF NOT EXISTS ai_audit_log_user_id_idx   ON ai_audit_log (user_id);
CREATE INDEX IF NOT EXISTS ai_audit_log_action_id_idx ON ai_audit_log (action_id);
CREATE INDEX IF NOT EXISTS ai_audit_log_status_idx    ON ai_audit_log (status);
CREATE INDEX IF NOT EXISTS ai_audit_log_created_at_idx ON ai_audit_log (created_at DESC);

-- 5. RLS: ogni utente vede solo i propri log; impresa/ufficio vedono tutto
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: utente vede i propri log
DROP POLICY IF EXISTS "ai_audit_log_own" ON ai_audit_log;
CREATE POLICY "ai_audit_log_own" ON ai_audit_log
  FOR ALL USING (user_id = auth.uid()::text);

-- Verifica
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ai_audit_log' ORDER BY ordinal_position;
