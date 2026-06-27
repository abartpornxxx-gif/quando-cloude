-- ============================================================
-- QUADRO — Migrazione: Portale Libero Professionista
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Aggiungi valore 'libero' all'enum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'libero';

-- 2. Crea tabella liberi_professionisti
CREATE TABLE IF NOT EXISTS liberi_professionisti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  partita_iva     TEXT,
  codice_fiscale  TEXT,
  indirizzo       TEXT,
  email           TEXT,
  telefono        TEXT,
  logo_url        TEXT,
  logo_path       TEXT,
  auth_user_id    UUID UNIQUE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enum StatoIntervento
DO $$ BEGIN
  CREATE TYPE "StatoIntervento" AS ENUM ('pianificato', 'in_corso', 'completato', 'annullato');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. Crea tabella interventi_libero
CREATE TABLE IF NOT EXISTS interventi_libero (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libero_id        UUID NOT NULL REFERENCES liberi_professionisti(id) ON DELETE CASCADE,
  cliente_id       UUID REFERENCES clienti(id) ON DELETE SET NULL,
  titolo           TEXT NOT NULL,
  descrizione      TEXT,
  indirizzo        TEXT,
  data_intervento  DATE,
  stato            "StatoIntervento" NOT NULL DEFAULT 'pianificato',
  ore_impiegate    FLOAT,
  importo          INT NOT NULL DEFAULT 0,
  note             TEXT,
  preventivo_id    UUID UNIQUE REFERENCES preventivi(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RLS policies
ALTER TABLE liberi_professionisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventi_libero ENABLE ROW LEVEL SECURITY;

-- Libero vede solo il proprio profilo
CREATE POLICY "libero_own_profile" ON liberi_professionisti
  FOR ALL USING (auth.uid() = auth_user_id);

-- Libero vede solo i propri interventi
CREATE POLICY "libero_own_interventi" ON interventi_libero
  FOR ALL USING (
    libero_id IN (
      SELECT id FROM liberi_professionisti WHERE auth_user_id = auth.uid()
    )
  );

-- 6. Indici
CREATE INDEX IF NOT EXISTS idx_interventi_libero_libero_id ON interventi_libero(libero_id);
CREATE INDEX IF NOT EXISTS idx_interventi_libero_stato ON interventi_libero(stato);
CREATE INDEX IF NOT EXISTS idx_interventi_libero_data ON interventi_libero(data_intervento);

-- ============================================================
-- NOTA: dopo aver eseguito questo SQL, tornare su QUADRO e
-- creare manualmente il primo account libero dal pannello
-- Admin → "Nuovo libero professionista".
-- ============================================================
