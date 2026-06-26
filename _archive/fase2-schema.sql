-- ============================================================
-- QUADRO — Fase 2: Giornata lavorativa, checklist, foto
-- Supabase Dashboard > SQL Editor > New query > Incolla e "Run"
-- ============================================================

-- ─── 1. Aggiungi campo email agli operai (per login app) ─────

ALTER TABLE public.operai ADD COLUMN IF NOT EXISTS email TEXT;

-- ─── 2. Nuovi enum (PascalCase richiesto da Prisma) ──────────

DO $$ BEGIN
  CREATE TYPE "StatoGiornata" AS ENUM ('bozza', 'inviata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoOra" AS ENUM ('ordinaria', 'straordinaria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 3. Tabelle Fase 2 ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commessa_operai (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID        NOT NULL REFERENCES public.commesse(id) ON DELETE CASCADE,
  operaio_id  UUID        NOT NULL REFERENCES public.operai(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(commessa_id, operaio_id)
);

CREATE TABLE IF NOT EXISTS public.checklist_template (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domanda    TEXT        NOT NULL,
  ordine     INTEGER     NOT NULL DEFAULT 0,
  attiva     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_checklist_template_updated_at BEFORE UPDATE ON public.checklist_template
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.giornate (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id    UUID           NOT NULL REFERENCES public.commesse(id),
  operaio_id     UUID           NOT NULL REFERENCES public.operai(id),
  data           DATE           NOT NULL,
  mezzo_id       UUID           REFERENCES public.mezzi(id),
  lavoro_svolto  TEXT,
  note           TEXT,
  stato          "StatoGiornata" NOT NULL DEFAULT 'bozza',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_giornate_updated_at BEFORE UPDATE ON public.giornate
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.giornata_ore (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  giornata_id UUID      NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
  tipo        "TipoOra" NOT NULL DEFAULT 'ordinaria',
  quantita    FLOAT     NOT NULL
);

CREATE TABLE IF NOT EXISTS public.giornata_materiali (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  giornata_id     UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
  materiale_id    UUID        REFERENCES public.materiali(id),
  descrizione     TEXT        NOT NULL,
  quantita        FLOAT       NOT NULL DEFAULT 1,
  prezzo_unitario INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.giornata_foto (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  giornata_id UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_risposte (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  giornata_id UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
  template_id UUID        NOT NULL REFERENCES public.checklist_template(id),
  risposta    BOOLEAN     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(giornata_id, template_id)
);

-- ─── 4. Row Level Security ────────────────────────────────────

-- Attiva RLS su tutte le nuove tabelle
ALTER TABLE public.commessa_operai     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giornate            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giornata_ore        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giornata_materiali  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giornata_foto       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_risposte  ENABLE ROW LEVEL SECURITY;

-- Impresa: accesso completo a tutto
CREATE POLICY "impresa_all_commessa_operai"    ON public.commessa_operai
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_checklist_template" ON public.checklist_template
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_giornate"           ON public.giornate
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_giornata_ore"       ON public.giornata_ore
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_giornata_materiali" ON public.giornata_materiali
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_giornata_foto"      ON public.giornata_foto
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

CREATE POLICY "impresa_all_checklist_risposte" ON public.checklist_risposte
  USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'));

-- Operaio: legge le proprie assegnazioni
CREATE POLICY "operaio_read_commessa_operai" ON public.commessa_operai
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operai o
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'
    )
  );

-- Operaio: legge il checklist template (per compilarlo)
CREATE POLICY "operaio_read_checklist_template" ON public.checklist_template
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'operaio')
  );

-- Operaio: accesso completo alle proprie giornate
CREATE POLICY "operaio_own_giornate" ON public.giornate
  USING (
    EXISTS (
      SELECT 1 FROM public.operai o
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operai o
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'
    )
  );

-- ─── 5. Storage bucket per le foto ────────────────────────────
-- Eseguire separatamente da Supabase Dashboard > Storage > New bucket
-- Nome: foto-cantiere | Visibilità: Public
-- Oppure eseguire questa query (richiede permessi storage):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('foto-cantiere', 'foto-cantiere', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Fine script Fase 2
-- Dopo l'esecuzione: crea il bucket "foto-cantiere" in Supabase
-- Storage (public), poi avvia con npm run dev
-- ============================================================
