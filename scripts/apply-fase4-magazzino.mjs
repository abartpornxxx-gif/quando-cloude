// scripts/apply-fase4-magazzino.mjs
// Fase 4: Ordini materiale e magazzino

import pg from 'pg'

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const queries = [
  // Enum StatoOrdine
  `DO $$ BEGIN
    CREATE TYPE public."StatoOrdine" AS ENUM ('richiesto','ordinato','consegnato','usato');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Enum TipoMovimento
  `DO $$ BEGIN
    CREATE TYPE public."TipoMovimento" AS ENUM ('carico','scarico','reso');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Tabella ordini_fornitori
  `CREATE TABLE IF NOT EXISTS public.ordini_fornitori (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornitore_id  UUID REFERENCES public.fornitori(id) ON DELETE SET NULL,
    commessa_id   UUID REFERENCES public.commesse(id) ON DELETE SET NULL,
    stato         public."StatoOrdine" NOT NULL DEFAULT 'richiesto',
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Tabella ordini_righe
  `CREATE TABLE IF NOT EXISTS public.ordini_righe (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ordine_id       UUID NOT NULL REFERENCES public.ordini_fornitori(id) ON DELETE CASCADE,
    materiale_id    UUID REFERENCES public.materiali(id) ON DELETE SET NULL,
    descrizione     TEXT NOT NULL,
    quantita        DOUBLE PRECISION NOT NULL DEFAULT 1,
    prezzo_unitario INTEGER NOT NULL DEFAULT 0
  )`,

  // Tabella movimenti_magazzino
  `CREATE TABLE IF NOT EXISTS public.movimenti_magazzino (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    materiale_id  UUID REFERENCES public.materiali(id) ON DELETE SET NULL,
    tipo          public."TipoMovimento" NOT NULL,
    quantita      DOUBLE PRECISION NOT NULL,
    descrizione   TEXT,
    commessa_id   UUID REFERENCES public.commesse(id) ON DELETE SET NULL,
    ordine_id     UUID REFERENCES public.ordini_fornitori(id) ON DELETE SET NULL,
    richiesta_id  UUID UNIQUE REFERENCES public.richieste_materiale(id) ON DELETE SET NULL,
    note          TEXT,
    data          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  // Colonna materiale_id su richieste_materiale (collegamento al listino)
  `ALTER TABLE public.richieste_materiale
    ADD COLUMN IF NOT EXISTS materiale_id UUID REFERENCES public.materiali(id) ON DELETE SET NULL`,

  // RLS: ordini_fornitori — solo impresa legge e scrive
  `ALTER TABLE public.ordini_fornitori ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "ordini_impresa" ON public.ordini_fornitori`,
  `CREATE POLICY "ordini_impresa" ON public.ordini_fornitori
    USING (auth.jwt()->>'role' = 'impresa' OR (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR (auth.jwt()->'app_metadata'->>'role') = 'impresa')
    WITH CHECK (auth.jwt()->>'role' = 'impresa' OR (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR (auth.jwt()->'app_metadata'->>'role') = 'impresa')`,

  // RLS: ordini_righe
  `ALTER TABLE public.ordini_righe ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "ordini_righe_impresa" ON public.ordini_righe`,
  `CREATE POLICY "ordini_righe_impresa" ON public.ordini_righe
    USING (auth.jwt()->>'role' = 'impresa' OR (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR (auth.jwt()->'app_metadata'->>'role') = 'impresa')
    WITH CHECK (auth.jwt()->>'role' = 'impresa' OR (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR (auth.jwt()->'app_metadata'->>'role') = 'impresa')`,

  // RLS: movimenti_magazzino — impresa e magazziniere leggono; impresa scrive
  `ALTER TABLE public.movimenti_magazzino ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "movimenti_read" ON public.movimenti_magazzino`,
  `CREATE POLICY "movimenti_read" ON public.movimenti_magazzino FOR SELECT
    USING (
      (auth.jwt()->'user_metadata'->>'role') IN ('impresa','magazziniere') OR
      (auth.jwt()->'app_metadata'->>'role') IN ('impresa','magazziniere')
    )`,
  `DROP POLICY IF EXISTS "movimenti_write" ON public.movimenti_magazzino`,
  `CREATE POLICY "movimenti_write" ON public.movimenti_magazzino FOR ALL
    USING (
      (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR
      (auth.jwt()->'app_metadata'->>'role') = 'impresa' OR
      (auth.jwt()->'user_metadata'->>'role') = 'magazziniere' OR
      (auth.jwt()->'app_metadata'->>'role') = 'magazziniere'
    )
    WITH CHECK (
      (auth.jwt()->'user_metadata'->>'role') = 'impresa' OR
      (auth.jwt()->'app_metadata'->>'role') = 'impresa' OR
      (auth.jwt()->'user_metadata'->>'role') = 'magazziniere' OR
      (auth.jwt()->'app_metadata'->>'role') = 'magazziniere'
    )`,

  // Indici per performance
  `CREATE INDEX IF NOT EXISTS idx_ordini_commessa ON public.ordini_fornitori(commessa_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ordini_righe_ordine ON public.ordini_righe(ordine_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movimenti_materiale ON public.movimenti_magazzino(materiale_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movimenti_commessa ON public.movimenti_magazzino(commessa_id)`,
]

let ok = 0
let err = 0
for (const q of queries) {
  try {
    await client.query(q)
    ok++
    process.stdout.write('.')
  } catch (e) {
    err++
    console.error('\nERRORE:', e.message, '\nQuery:', q.slice(0, 120))
  }
}

await client.end()
console.log(`\nFase 4 DB: ${ok} ok, ${err} errori`)
