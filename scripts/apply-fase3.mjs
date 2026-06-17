// Script idempotente per applicare la migrazione Fase 3 (Pianificazione + Assenze)
// Esegui con: node scripts/apply-fase3.mjs

import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString: DATABASE_URL })

const queries = [
  // ─── Enums (PascalCase richiesto da Prisma) ──────────────────────────────
  `DO $$ BEGIN CREATE TYPE "TipoAssenza" AS ENUM ('ferie','permesso','malattia','altro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "StatoAssenza" AS ENUM ('in_attesa','approvata','rifiutata'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ─── Tabella pianificazioni ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.pianificazioni (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    data        DATE         NOT NULL,
    commessa_id UUID         NOT NULL REFERENCES public.commesse(id) ON DELETE CASCADE,
    operaio_id  UUID         NOT NULL REFERENCES public.operai(id) ON DELETE CASCADE,
    mezzo_id    UUID         REFERENCES public.mezzi(id),
    note        TEXT,
    sostituito  BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(commessa_id, operaio_id, data)
  )`,

  `CREATE TRIGGER set_pianificazioni_updated_at BEFORE UPDATE ON public.pianificazioni
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,

  // ─── Tabella assenze ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.assenze (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    operaio_id  UUID           NOT NULL REFERENCES public.operai(id) ON DELETE CASCADE,
    data_inizio DATE           NOT NULL,
    data_fine   DATE           NOT NULL,
    tipo        "TipoAssenza"  NOT NULL DEFAULT 'ferie',
    stato       "StatoAssenza" NOT NULL DEFAULT 'in_attesa',
    note        TEXT,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
  )`,

  `CREATE TRIGGER set_assenze_updated_at BEFORE UPDATE ON public.assenze
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,

  // ─── RLS ─────────────────────────────────────────────────────────────────
  `ALTER TABLE public.pianificazioni ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.assenze        ENABLE ROW LEVEL SECURITY`,

  // Pianificazioni — impresa: full access
  `DROP POLICY IF EXISTS "impresa_all_pianificazioni" ON public.pianificazioni`,
  `CREATE POLICY "impresa_all_pianificazioni" ON public.pianificazioni
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  // Pianificazioni — operaio: read proprie
  `DROP POLICY IF EXISTS "operaio_read_pianificazioni" ON public.pianificazioni`,
  `CREATE POLICY "operaio_read_pianificazioni" ON public.pianificazioni
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.operai o
        JOIN public.profiles p ON p.email = o.email
        WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'
      )
    )`,

  // Assenze — impresa: full access
  `DROP POLICY IF EXISTS "impresa_all_assenze" ON public.assenze`,
  `CREATE POLICY "impresa_all_assenze" ON public.assenze
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  // Assenze — operaio: full access alle proprie
  `DROP POLICY IF EXISTS "operaio_own_assenze" ON public.assenze`,
  `CREATE POLICY "operaio_own_assenze" ON public.assenze
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
    )`,
]

async function main() {
  await client.connect()
  let ok = 0
  let errors = 0

  for (const q of queries) {
    const preview = q.trim().slice(0, 60).replace(/\s+/g, ' ')
    try {
      await client.query(q)
      console.log(`✅ ${preview}…`)
      ok++
    } catch (err) {
      const msg = err.message ?? String(err)
      // Trigger "already exists" è accettabile
      if (msg.includes('already exists')) {
        console.log(`⚠️  già esistente: ${preview}…`)
        ok++
      } else {
        console.error(`❌ ${preview}…\n   ${msg}`)
        errors++
      }
    }
  }

  await client.end()
  console.log(`\nRisultato: ${ok} ok, ${errors} errori`)
  if (errors > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
