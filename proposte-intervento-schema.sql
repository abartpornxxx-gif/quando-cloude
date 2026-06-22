-- =====================================================================
-- QUADRO — Proposte di intervento per manutenzioni programmate
-- Eseguire con: node run-sql.js proposte-intervento-schema.sql
-- =====================================================================

-- 1. Enum StatoPropostaIntervento
-- Nota: PascalCase come da convenzione progetto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatoPropostaIntervento') THEN
    CREATE TYPE "StatoPropostaIntervento" AS ENUM (
      'Inviata',
      'VistaDalCliente',
      'Accettata',
      'RifiutataCliente',
      'ConfermataManuale',
      'CommessaCreata',
      'Annullata'
    );
  END IF;
END $$;

-- 2. Tabella proposte_intervento
CREATE TABLE IF NOT EXISTS "proposte_intervento" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "manutenzione_id"       UUID NOT NULL REFERENCES "manutenzioni_programmate"("id") ON DELETE CASCADE,
  "cliente_id"            UUID NOT NULL REFERENCES "clienti"("id"),
  "stato"                 "StatoPropostaIntervento" NOT NULL DEFAULT 'Inviata',
  "messaggio_impresa"     TEXT,
  "data_proposta_prevista" DATE NOT NULL,
  "risposta_cliente"      TEXT,
  "confermata_da_impresa" BOOLEAN NOT NULL DEFAULT FALSE,
  "commessa_id"           UUID REFERENCES "commesse"("id") ON DELETE SET NULL,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trigger updated_at (pattern usato nel resto del progetto)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposte_intervento_updated_at ON "proposte_intervento";
CREATE TRIGGER proposte_intervento_updated_at
  BEFORE UPDATE ON "proposte_intervento"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Indice parziale anti-duplicazione
-- Impedisce di avere più di una proposta "aperta" (Inviata o VistaDalCliente)
-- per la stessa manutenzione nello stesso momento.
-- Questo è più sicuro di un unique constraint completo perché lascia libero
-- di creare nuove proposte dopo che la precedente è stata chiusa/annullata.
CREATE UNIQUE INDEX IF NOT EXISTS "proposte_intervento_unica_aperta"
  ON "proposte_intervento" ("manutenzione_id")
  WHERE "stato" IN ('Inviata', 'VistaDalCliente');

-- 5. Indice per query cliente (usato dalla RLS e dalle query portale cliente)
CREATE INDEX IF NOT EXISTS "proposte_intervento_cliente_idx"
  ON "proposte_intervento" ("cliente_id");

-- 6. Abilita RLS sulla tabella
ALTER TABLE "proposte_intervento" ENABLE ROW LEVEL SECURITY;

-- 7. Policy impresa: accesso completo
-- L'impresa è autenticata con ruolo 'impresa' in user_metadata
DROP POLICY IF EXISTS "impresa_full_access" ON "proposte_intervento";
CREATE POLICY "impresa_full_access"
  ON "proposte_intervento"
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'impresa'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'impresa'
  );

-- 8. Policy cliente: SELECT solo sulle proprie proposte
-- Collega tramite email → clienti.email (stesso pattern usato da requireCliente())
DROP POLICY IF EXISTS "cliente_select_own" ON "proposte_intervento";
CREATE POLICY "cliente_select_own"
  ON "proposte_intervento"
  FOR SELECT
  TO authenticated
  USING (
    "cliente_id" IN (
      SELECT id FROM "clienti"
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- 9. Policy cliente: UPDATE limitato (solo stato e risposta_cliente, sulle proprie proposte)
-- Postgres RLS non supporta restrizione per colonna nelle policy direttamente,
-- ma la limitazione è garantita a livello applicativo (server action rispondiProposta).
-- La policy garantisce che il cliente possa aggiornare SOLO le proprie proposte.
-- Nota: lo stato che il cliente può impostare (Accettata/RifiutataCliente) va
-- validato nella server action prima dell'UPDATE.
DROP POLICY IF EXISTS "cliente_update_own" ON "proposte_intervento";
CREATE POLICY "cliente_update_own"
  ON "proposte_intervento"
  FOR UPDATE
  TO authenticated
  USING (
    "cliente_id" IN (
      SELECT id FROM "clienti"
      WHERE email = auth.jwt() ->> 'email'
    )
    AND "stato" NOT IN ('CommessaCreata', 'Annullata')
  )
  WITH CHECK (
    "cliente_id" IN (
      SELECT id FROM "clienti"
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Sicurezza: il cliente NON ha accesso a manutenzioni_programmate
-- (nessuna policy SELECT per il ruolo cliente su quella tabella)
-- Verificare che non esista già una policy SELECT aperta su manutenzioni_programmate:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'manutenzioni_programmate'
    AND policyname LIKE '%cliente%'
  ) THEN
    RAISE WARNING 'ATTENZIONE: esiste già una policy cliente su manutenzioni_programmate — verificare manualmente!';
  END IF;
END $$;

-- Fine migrazione
SELECT 'proposte_intervento: migrazione completata' AS status;
