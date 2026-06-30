-- Migrazione: struttura fisica del cantiere
-- Eseguire su Supabase → SQL Editor (session pooler porta 5432, non pgBouncer 6543)
-- Data: 2026-06-30
--
-- NOTA IMPORTANTE (Prisma v7 + @prisma/adapter-pg):
-- Gli enum PostgreSQL DEVONO essere creati con nome PascalCase tra virgolette.
-- snake_case senza virgolette causa errori "type does not exist" al runtime.

-- 1. Enum tipo nodo struttura
CREATE TYPE "TipoNodoStruttura" AS ENUM (
  'SCALA',
  'APPARTAMENTO',
  'BOX',
  'ESTERNO',
  'AREA_COMUNE',
  'LOCALE_TECNICO',
  'QUADRO_ELETTRICO',
  'GARAGE',
  'CORTILE',
  'COPERTURA',
  'ALTRO'
);

-- 2. Tabella nodi struttura cantiere (albero auto-referenziale)
CREATE TABLE cantiere_struttura_nodi (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id   UUID      NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  parent_id     UUID      REFERENCES cantiere_struttura_nodi(id) ON DELETE CASCADE,
  tipo          "TipoNodoStruttura" NOT NULL DEFAULT 'ALTRO',
  nome          TEXT      NOT NULL,
  codice        TEXT,
  descrizione   TEXT,
  piano         TEXT,
  interno       TEXT,
  ordinamento   INT       NOT NULL DEFAULT 0,
  attivo        BOOLEAN   NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Trigger updated_at per cantiere_struttura_nodi
CREATE TRIGGER set_updated_at_cantiere_struttura_nodi
  BEFORE UPDATE ON cantiere_struttura_nodi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Indici per performance
CREATE INDEX idx_cantiere_struttura_nodi_commessa ON cantiere_struttura_nodi(commessa_id);
CREATE INDEX idx_cantiere_struttura_nodi_parent ON cantiere_struttura_nodi(parent_id);

-- 5. Aggiunta struttura_nodo_id ai rapportini (nullable per backward compat)
ALTER TABLE rapportini
  ADD COLUMN struttura_nodo_id UUID REFERENCES cantiere_struttura_nodi(id) ON DELETE SET NULL;

-- 6. Aggiunta struttura_nodo_id alle righe conteggio (nullable per backward compat)
ALTER TABLE conteggio_cantiere_righe
  ADD COLUMN struttura_nodo_id UUID REFERENCES cantiere_struttura_nodi(id) ON DELETE SET NULL;

-- 7. Aggiunta struttura_nodo_id ai promemoria (nullable per backward compat)
ALTER TABLE promemoria
  ADD COLUMN struttura_nodo_id UUID REFERENCES cantiere_struttura_nodi(id) ON DELETE SET NULL;

-- 8. RLS policies per cantiere_struttura_nodi
ALTER TABLE cantiere_struttura_nodi ENABLE ROW LEVEL SECURITY;

-- Impresa: accesso completo (via relazione commesse)
CREATE POLICY "impresa_struttura_full" ON cantiere_struttura_nodi
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM commesse c
      WHERE c.id = cantiere_struttura_nodi.commessa_id
    )
  );

-- Nota: la verifica ruolo avviene lato applicazione (requireImpresa, requireOperaio ecc.)
-- Le RLS qui garantiscono che i nodi siano sempre legati a commesse esistenti.

-- 9. Verifica finale
SELECT 'cantiere_struttura_nodi creata' AS status,
       COUNT(*) AS righe
FROM cantiere_struttura_nodi;
