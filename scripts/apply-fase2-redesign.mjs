// Migrazione DB per la riprogettazione Fase 2:
// ORDINI 1-6: attrezzatura tracking, flusso temporale, chat, materiale, rapportino

import pg from 'pg'
const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

// ALTER TYPE ADD VALUE non può girare dentro una transazione in PostgreSQL.
// Il client pg usa auto-commit per ogni query → ok.
const client = new Client({ connectionString: DATABASE_URL })

const queries = [

  // ─── 0. Enum: aggiungi magazziniere a UserRole ───────────────────────────
  // NB: ALTER TYPE ADD VALUE non è transazionale — deve girare fuori da BEGIN
  `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'magazziniere'`,

  // ─── 1. Nuovi enum ────────────────────────────────────────────────────────
  `DO $$ BEGIN
    CREATE TYPE "FaseGiornata" AS ENUM ('inizio','mattina','pausa','pomeriggio','fine','completata');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "StatoRichiesta" AS ENUM ('richiesta','in_preparazione','consegnata');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // ─── 2. Tabella magazzinieri ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.magazzinieri (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       TEXT        NOT NULL,
    email      TEXT        UNIQUE,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TRIGGER set_magazzinieri_updated_at BEFORE UPDATE ON public.magazzinieri
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,

  // ─── 3. Colonne nuove su pianificazioni ───────────────────────────────────
  `ALTER TABLE public.pianificazioni ADD COLUMN IF NOT EXISTS lavoro_da_fare TEXT`,
  `ALTER TABLE public.pianificazioni ADD COLUMN IF NOT EXISTS note_materiale TEXT`,

  // ─── 4. Colonne nuove su giornate (flusso temporale) ─────────────────────
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS
    fase "FaseGiornata" NOT NULL DEFAULT 'inizio'`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS inizio_mattina   TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS fine_mattina     TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS inizio_pomeriggio TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS fine_pomeriggio  TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS pianificazione_id UUID UNIQUE REFERENCES public.pianificazioni(id)`,

  // ─── 5. Tabella attrezzatura_usi ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.attrezzatura_usi (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attrezzatura_id  UUID        NOT NULL REFERENCES public.attrezzature(id) ON DELETE CASCADE,
    operaio_id       UUID        NOT NULL REFERENCES public.operai(id) ON DELETE CASCADE,
    commessa_id      UUID        NOT NULL REFERENCES public.commesse(id) ON DELETE CASCADE,
    mezzo_id         UUID        REFERENCES public.mezzi(id),
    giornata_id      UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    riconsegnata     BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── 6. Tabella richieste_materiale ──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.richieste_materiale (
    id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id UUID             NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    commessa_id UUID             NOT NULL REFERENCES public.commesse(id),
    operaio_id  UUID             NOT NULL REFERENCES public.operai(id),
    descrizione TEXT             NOT NULL,
    urgente     BOOLEAN          NOT NULL DEFAULT false,
    stato       "StatoRichiesta" NOT NULL DEFAULT 'richiesta',
    foto_url    TEXT,
    foto_path   TEXT,
    note        TEXT,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
  )`,
  `CREATE TRIGGER set_richieste_materiale_updated_at BEFORE UPDATE ON public.richieste_materiale
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()`,

  // ─── 7. Tabella chat_messaggi ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.chat_messaggi (
    id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID       NOT NULL REFERENCES public.commesse(id),
    giornata_id UUID       NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    autore_nome TEXT       NOT NULL,
    ruolo       "UserRole" NOT NULL,
    testo       TEXT,
    foto_url    TEXT,
    foto_path   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── 8. Tabella rapportini ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS public.rapportini (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id           UUID        UNIQUE NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    lavoro_eseguito       TEXT        NOT NULL,
    lavori_extra          TEXT,
    note_attrezzatura     TEXT,
    note_giorno_successivo TEXT,
    ore_ordinarie         FLOAT       NOT NULL DEFAULT 0,
    ore_straordinarie     FLOAT       NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ─── 9. Tabella configurazione_orari (singleton) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS public.configurazione_orari (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    durata_mattina_minuti   INTEGER NOT NULL DEFAULT 240,
    durata_pausa_minuti     INTEGER NOT NULL DEFAULT 60,
    durata_pomeriggio_minuti INTEGER NOT NULL DEFAULT 240
  )`,
  // Inserisci il record di default solo se non esiste
  `INSERT INTO public.configurazione_orari (durata_mattina_minuti, durata_pausa_minuti, durata_pomeriggio_minuti)
    SELECT 240, 60, 240
    WHERE NOT EXISTS (SELECT 1 FROM public.configurazione_orari)`,

  // ─── 10. RLS ──────────────────────────────────────────────────────────────
  `ALTER TABLE public.magazzinieri         ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.attrezzatura_usi     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.richieste_materiale  ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.chat_messaggi        ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.rapportini           ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.configurazione_orari ENABLE ROW LEVEL SECURITY`,

  // magazzinieri: impresa full access
  `DROP POLICY IF EXISTS "impresa_all_magazzinieri" ON public.magazzinieri`,
  `CREATE POLICY "impresa_all_magazzinieri" ON public.magazzinieri
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  // magazzinieri: magazziniere può leggere il proprio record
  `DROP POLICY IF EXISTS "magazziniere_read_own" ON public.magazzinieri`,
  `CREATE POLICY "magazziniere_read_own" ON public.magazzinieri
    FOR SELECT USING (
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )`,

  // attrezzatura_usi: impresa full
  `DROP POLICY IF EXISTS "impresa_all_attrezzatura_usi" ON public.attrezzatura_usi`,
  `CREATE POLICY "impresa_all_attrezzatura_usi" ON public.attrezzatura_usi
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  // attrezzatura_usi: operaio gestisce i propri
  `DROP POLICY IF EXISTS "operaio_own_attrezzatura_usi" ON public.attrezzatura_usi`,
  `CREATE POLICY "operaio_own_attrezzatura_usi" ON public.attrezzatura_usi
    USING (EXISTS (SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'))`,

  // attrezzatura_usi: read per tutti autenticati (per vedere chi ha cosa)
  `DROP POLICY IF EXISTS "authenticated_read_attrezzatura_usi" ON public.attrezzatura_usi`,
  `CREATE POLICY "authenticated_read_attrezzatura_usi" ON public.attrezzatura_usi
    FOR SELECT USING (auth.role() = 'authenticated')`,

  // richieste_materiale: impresa + magazziniere full; operaio proprie
  `DROP POLICY IF EXISTS "impresa_all_richieste_materiale" ON public.richieste_materiale`,
  `CREATE POLICY "impresa_all_richieste_materiale" ON public.richieste_materiale
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  `DROP POLICY IF EXISTS "magazziniere_all_richieste" ON public.richieste_materiale`,
  `CREATE POLICY "magazziniere_all_richieste" ON public.richieste_materiale
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))`,

  `DROP POLICY IF EXISTS "operaio_own_richieste_materiale" ON public.richieste_materiale`,
  `CREATE POLICY "operaio_own_richieste_materiale" ON public.richieste_materiale
    USING (EXISTS (SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id AND p.role = 'operaio'))`,

  // chat_messaggi: impresa + magazziniere full; operaio legge/scrive sulla propria giornata
  `DROP POLICY IF EXISTS "impresa_all_chat" ON public.chat_messaggi`,
  `CREATE POLICY "impresa_all_chat" ON public.chat_messaggi
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  `DROP POLICY IF EXISTS "magazziniere_all_chat" ON public.chat_messaggi`,
  `CREATE POLICY "magazziniere_all_chat" ON public.chat_messaggi
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))`,

  `DROP POLICY IF EXISTS "operaio_own_chat" ON public.chat_messaggi`,
  `CREATE POLICY "operaio_own_chat" ON public.chat_messaggi
    USING (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id AND p.role = 'operaio'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id AND p.role = 'operaio'
    ))`,

  // rapportini: impresa full; operaio propri
  `DROP POLICY IF EXISTS "impresa_all_rapportini" ON public.rapportini`,
  `CREATE POLICY "impresa_all_rapportini" ON public.rapportini
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  `DROP POLICY IF EXISTS "operaio_own_rapportini" ON public.rapportini`,
  `CREATE POLICY "operaio_own_rapportini" ON public.rapportini
    USING (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id AND p.role = 'operaio'
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id AND p.role = 'operaio'
    ))`,

  // configurazione_orari: impresa scrive; tutti leggono
  `DROP POLICY IF EXISTS "impresa_write_configurazione" ON public.configurazione_orari`,
  `CREATE POLICY "impresa_write_configurazione" ON public.configurazione_orari
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,

  `DROP POLICY IF EXISTS "authenticated_read_configurazione" ON public.configurazione_orari`,
  `CREATE POLICY "authenticated_read_configurazione" ON public.configurazione_orari
    FOR SELECT USING (auth.role() = 'authenticated')`,
]

async function main() {
  await client.connect()
  let ok = 0, errors = 0

  for (const q of queries) {
    const preview = q.trim().slice(0, 70).replace(/\s+/g, ' ')
    try {
      await client.query(q)
      console.log(`✅ ${preview}…`)
      ok++
    } catch (err) {
      const msg = err.message ?? String(err)
      if (msg.includes('already exists') || msg.includes('già esistente')) {
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

main().catch(err => { console.error(err); process.exit(1) })
