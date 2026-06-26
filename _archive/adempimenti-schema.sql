-- Migrazione: Checklist Adempimenti di Cantiere
-- Da eseguire in Supabase SQL Editor

-- ─── Tipi di lavoro ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipi_lavoro (
  id          uuid DEFAULT gen_random_uuid() NOT NULL,
  nome        text NOT NULL,
  descrizione text,
  attivo      boolean NOT NULL DEFAULT true,
  ordine      int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipi_lavoro_pkey PRIMARY KEY (id)
);

-- ─── Modelli di adempimento (template per tipo lavoro) ────────────────────────
CREATE TABLE IF NOT EXISTS adempimenti_modello (
  id              uuid DEFAULT gen_random_uuid() NOT NULL,
  tipo_lavoro_id  uuid NOT NULL,
  testo           text NOT NULL,
  note            text,
  collegamento    text,
  ordine          int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adempimenti_modello_pkey PRIMARY KEY (id),
  CONSTRAINT adempimenti_modello_tipo_lavoro_id_fkey
    FOREIGN KEY (tipo_lavoro_id) REFERENCES tipi_lavoro(id) ON DELETE CASCADE
);

-- ─── Adempimenti assegnati a una commessa ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS adempimenti_commessa (
  id           uuid DEFAULT gen_random_uuid() NOT NULL,
  commessa_id  uuid NOT NULL,
  modello_id   uuid,
  testo        text NOT NULL,
  note         text,
  collegamento text,
  ordine       int NOT NULL DEFAULT 0,
  fatto        boolean NOT NULL DEFAULT false,
  fatto_da     text,
  fatto_at     timestamptz,
  nota_spunta  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adempimenti_commessa_pkey PRIMARY KEY (id),
  CONSTRAINT adempimenti_commessa_commessa_id_fkey
    FOREIGN KEY (commessa_id) REFERENCES commesse(id) ON DELETE CASCADE,
  CONSTRAINT adempimenti_commessa_modello_id_fkey
    FOREIGN KEY (modello_id) REFERENCES adempimenti_modello(id) ON DELETE SET NULL
);

-- ─── Colonna tipo_lavoro_id su commesse ───────────────────────────────────────
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS tipo_lavoro_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'commesse_tipo_lavoro_id_fkey' AND table_name = 'commesse'
  ) THEN
    ALTER TABLE commesse
      ADD CONSTRAINT commesse_tipo_lavoro_id_fkey
      FOREIGN KEY (tipo_lavoro_id) REFERENCES tipi_lavoro(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tipi_lavoro_updated_at ON tipi_lavoro;
CREATE TRIGGER update_tipi_lavoro_updated_at
  BEFORE UPDATE ON tipi_lavoro
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_adempimenti_modello_updated_at ON adempimenti_modello;
CREATE TRIGGER update_adempimenti_modello_updated_at
  BEFORE UPDATE ON adempimenti_modello
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_adempimenti_commessa_updated_at ON adempimenti_commessa;
CREATE TRIGGER update_adempimenti_commessa_updated_at
  BEFORE UPDATE ON adempimenti_commessa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Dati di esempio (modificabili/eliminabili dall'impresa) ──────────────────
-- AVVISO: Le voci di esempio sotto sono generiche. Gli adempimenti di sicurezza
-- obbligatori vanno verificati con il proprio RSPP/consulente di sicurezza
-- (riferimento D.Lgs. 81/2008). Non costituiscono consulenza legale.

INSERT INTO tipi_lavoro (nome, descrizione, ordine) VALUES
  ('Civile', 'Impianti elettrici civili (abitazioni, uffici)', 1),
  ('Industriale', 'Impianti elettrici industriali', 2),
  ('Fotovoltaico', 'Impianti fotovoltaici e connessioni GSE', 3)
ON CONFLICT DO NOTHING;
