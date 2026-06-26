-- Migrazione: Libreria Task riutilizzabili
-- Da eseguire in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS task_libreria (
  id         uuid DEFAULT gen_random_uuid() NOT NULL,
  titolo     text NOT NULL,
  ordine     int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_libreria_pkey PRIMARY KEY (id)
);

-- Unique sul titolo (niente doppioni)
CREATE UNIQUE INDEX IF NOT EXISTS task_libreria_titolo_unique
  ON task_libreria (lower(trim(titolo)));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_libreria_updated_at ON task_libreria;
CREATE TRIGGER update_task_libreria_updated_at
  BEFORE UPDATE ON task_libreria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
