-- Migrazione: Varianti Lavori e Richieste Preventivi Fornitori
-- Esegui questo script in Supabase Dashboard > SQL Editor, oppure tramite script Node

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatoVariante') THEN
        CREATE TYPE "StatoVariante" AS ENUM ('bozza', 'inviata', 'approvata', 'rifiutata', 'annullata');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatoPreventivoFornitore') THEN
        CREATE TYPE "StatoPreventivoFornitore" AS ENUM ('in_attesa', 'ricevuto', 'approvato', 'scartato');
    END IF;
END$$;

-- 1. Tabella varianti_lavoro
CREATE TABLE IF NOT EXISTS "varianti_lavoro" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "commessa_id" UUID NOT NULL REFERENCES "commesse"("id") ON DELETE CASCADE,
  "titolo" TEXT NOT NULL,
  "descrizione" TEXT,
  "importo" INTEGER NOT NULL DEFAULT 0, -- in centesimi
  "costo_stimato" INTEGER NOT NULL DEFAULT 0, -- in centesimi
  "stato" "StatoVariante" NOT NULL DEFAULT 'bozza',
  "visibile_cliente" BOOLEAN NOT NULL DEFAULT false,
  "approvato_at" TIMESTAMPTZ,
  "note" TEXT,
  "file_url" TEXT,
  "file_path" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabella richieste_preventivi_fornitori
CREATE TABLE IF NOT EXISTS "richieste_preventivi_fornitori" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "commessa_id" UUID NOT NULL REFERENCES "commesse"("id") ON DELETE CASCADE,
  "variante_id" UUID REFERENCES "varianti_lavoro"("id") ON DELETE SET NULL,
  "fornitore_id" UUID NOT NULL REFERENCES "fornitori"("id") ON DELETE CASCADE,
  "descrizione" TEXT NOT NULL,
  "stato" "StatoPreventivoFornitore" NOT NULL DEFAULT 'in_attesa',
  "note" TEXT,
  "importo" FLOAT,
  "file_url" TEXT,
  "file_path" TEXT,
  "data_richiesta" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "data_scadenza" DATE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (per ora disattivate/libere o abilitate con select per tutti)
ALTER TABLE "varianti_lavoro" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_varianti" ON "varianti_lavoro" FOR SELECT USING (true);
CREATE POLICY "insert_varianti" ON "varianti_lavoro" FOR INSERT WITH CHECK (true);
CREATE POLICY "update_varianti" ON "varianti_lavoro" FOR UPDATE USING (true);
CREATE POLICY "delete_varianti" ON "varianti_lavoro" FOR DELETE USING (true);

ALTER TABLE "richieste_preventivi_fornitori" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_richieste_pref" ON "richieste_preventivi_fornitori" FOR SELECT USING (true);
CREATE POLICY "insert_richieste_pref" ON "richieste_preventivi_fornitori" FOR INSERT WITH CHECK (true);
CREATE POLICY "update_richieste_pref" ON "richieste_preventivi_fornitori" FOR UPDATE USING (true);
CREATE POLICY "delete_richieste_pref" ON "richieste_preventivi_fornitori" FOR DELETE USING (true);

-- Indici per ottimizzazione
CREATE INDEX IF NOT EXISTS "idx_varianti_commessa_id" ON "varianti_lavoro"("commessa_id");
CREATE INDEX IF NOT EXISTS "idx_richieste_pref_commessa_id" ON "richieste_preventivi_fornitori"("commessa_id");
CREATE INDEX IF NOT EXISTS "idx_richieste_pref_fornitore_id" ON "richieste_preventivi_fornitori"("fornitore_id");
CREATE INDEX IF NOT EXISTS "idx_richieste_pref_variante_id" ON "richieste_preventivi_fornitori"("variante_id");
