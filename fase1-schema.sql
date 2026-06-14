-- ============================================================
-- QUADRO — Fase 1: Schema tabelle principali
-- Supabase Dashboard > SQL Editor > New query > Incolla e "Run"
-- ============================================================

-- ─── Enumerazioni ────────────────────────────────────────────

CREATE TYPE stato_mezzo AS ENUM ('disponibile', 'in_uso', 'in_manutenzione', 'fuori_servizio');
CREATE TYPE stato_attrezzatura AS ENUM ('disponibile', 'in_uso', 'in_manutenzione', 'fuori_servizio');
CREATE TYPE stato_commessa AS ENUM ('aperta', 'chiusa');
CREATE TYPE stato_preventivo AS ENUM ('bozza', 'inviato', 'accettato', 'rifiutato');

-- ─── Funzione updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ─── Clienti ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clienti (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT        NOT NULL,
  partita_iva         TEXT,
  codice_fiscale      TEXT,
  indirizzo           TEXT,
  citta               TEXT,
  cap                 TEXT,
  provincia           TEXT,
  email               TEXT,
  telefono            TEXT,
  pec                 TEXT,
  codice_destinatario TEXT,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_clienti_updated_at BEFORE UPDATE ON public.clienti
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Fornitori ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fornitori (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL,
  partita_iva     TEXT,
  codice_fiscale  TEXT,
  indirizzo       TEXT,
  citta           TEXT,
  cap             TEXT,
  provincia       TEXT,
  email           TEXT,
  telefono        TEXT,
  pec             TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_fornitori_updated_at BEFORE UPDATE ON public.fornitori
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Operai ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operai (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT        NOT NULL,
  ruolo        TEXT,
  costo_orario INTEGER     NOT NULL DEFAULT 0,  -- centesimi/ora
  zona         TEXT,
  skills       JSONB       NOT NULL DEFAULT '[]',
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_operai_updated_at BEFORE UPDATE ON public.operai
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Mezzi ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mezzi (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   TEXT        NOT NULL,
  targa                  TEXT,
  stato                  stato_mezzo NOT NULL DEFAULT 'disponibile',
  scadenza_bollo         DATE,
  scadenza_revisione     DATE,
  scadenza_assicurazione DATE,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_mezzi_updated_at BEFORE UPDATE ON public.mezzi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Attrezzature ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.attrezzature (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT              NOT NULL,
  stato        stato_attrezzatura NOT NULL DEFAULT 'disponibile',
  assegnatario TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_attrezzature_updated_at BEFORE UPDATE ON public.attrezzature
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Materiali ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.materiali (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codice      TEXT,
  descrizione TEXT        NOT NULL,
  prezzo      INTEGER     NOT NULL DEFAULT 0,  -- centesimi
  unita       TEXT        DEFAULT 'pz',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_materiali_updated_at BEFORE UPDATE ON public.materiali
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Preventivi ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.preventivi (
  id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID            REFERENCES public.clienti(id) ON DELETE SET NULL,
  data       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  stato      stato_preventivo NOT NULL DEFAULT 'bozza',
  note       TEXT,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_preventivi_updated_at BEFORE UPDATE ON public.preventivi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.preventivo_righe (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  preventivo_id   UUID        NOT NULL REFERENCES public.preventivi(id) ON DELETE CASCADE,
  descrizione     TEXT        NOT NULL,
  quantita        FLOAT       NOT NULL DEFAULT 1,
  prezzo_unitario INTEGER     NOT NULL DEFAULT 0,  -- centesimi
  ordine          INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Commesse ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commesse (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT          NOT NULL,
  cliente_id         UUID          REFERENCES public.clienti(id) ON DELETE SET NULL,
  indirizzo_cantiere TEXT,
  stato              stato_commessa NOT NULL DEFAULT 'aperta',
  preventivato       INTEGER       NOT NULL DEFAULT 0,  -- centesimi
  costi_materiali    INTEGER       NOT NULL DEFAULT 0,  -- centesimi
  costi_manodopera   INTEGER       NOT NULL DEFAULT 0,  -- centesimi
  costi_mezzi        INTEGER       NOT NULL DEFAULT 0,  -- centesimi
  fatturato          INTEGER       NOT NULL DEFAULT 0,  -- centesimi
  preventivo_id      UUID          UNIQUE REFERENCES public.preventivi(id) ON DELETE SET NULL,
  note               TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_commesse_updated_at BEFORE UPDATE ON public.commesse
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security (tutte le tabelle: solo impresa) ─────

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clienti','fornitori','operai','mezzi','attrezzature','materiali','preventivi','preventivo_righe','commesse']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($$
      CREATE POLICY "Solo impresa può accedere" ON public.%I
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'impresa'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'impresa'
        )
      )
    $$, t, t);
  END LOOP;
END $$;

-- ============================================================
-- Fine script Fase 1
-- Dopo aver eseguito questo script, copia la password del DB
-- da Supabase > Settings > Database e aggiornala in .env.local
-- poi avvia il server con: npm run dev
-- ============================================================
