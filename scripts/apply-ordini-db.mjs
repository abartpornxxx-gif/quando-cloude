// Applica le tabelle DB mancanti per gli ORDINI 1-6
import pg from 'pg'
const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString: DATABASE_URL })

const queries = [
  // Enum FaseGiornata
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FaseGiornata') THEN
      CREATE TYPE "FaseGiornata" AS ENUM ('inizio','mattina','pausa','pomeriggio','fine','completata');
    END IF;
  END $$`,

  // Colonne Giornata (aggiunge se non esistono)
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS pianificazione_id UUID UNIQUE REFERENCES public.pianificazioni(id)`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS fase TEXT NOT NULL DEFAULT 'inizio'`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS inizio_mattina TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS fine_mattina TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS inizio_pomeriggio TIMESTAMPTZ`,
  `ALTER TABLE public.giornate ADD COLUMN IF NOT EXISTS fine_pomeriggio TIMESTAMPTZ`,

  // Colonne Pianificazione
  `ALTER TABLE public.pianificazioni ADD COLUMN IF NOT EXISTS lavoro_da_fare TEXT`,
  `ALTER TABLE public.pianificazioni ADD COLUMN IF NOT EXISTS note_materiale TEXT`,

  // Tabella attrezzatura_usi
  `CREATE TABLE IF NOT EXISTS public.attrezzatura_usi (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    attrezzatura_id  UUID        NOT NULL REFERENCES public.attrezzature(id),
    operaio_id       UUID        NOT NULL REFERENCES public.operai(id),
    commessa_id      UUID        NOT NULL REFERENCES public.commesse(id),
    mezzo_id         UUID        REFERENCES public.mezzi(id),
    giornata_id      UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    riconsegnata     BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE public.attrezzatura_usi ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "impresa_all_attrezzatura_usi" ON public.attrezzatura_usi`,
  `CREATE POLICY "impresa_all_attrezzatura_usi" ON public.attrezzatura_usi
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,
  `DROP POLICY IF EXISTS "operaio_own_attrezzatura_usi" ON public.attrezzatura_usi`,
  `CREATE POLICY "operaio_own_attrezzatura_usi" ON public.attrezzatura_usi
    USING (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))`,

  // StatoRichiesta enum
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatoRichiesta') THEN
      CREATE TYPE "StatoRichiesta" AS ENUM ('richiesta','in_preparazione','consegnata');
    END IF;
  END $$`,

  // Tabella richieste_materiale
  `CREATE TABLE IF NOT EXISTS public.richieste_materiale (
    id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id  UUID            NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    commessa_id  UUID            NOT NULL REFERENCES public.commesse(id),
    operaio_id   UUID            NOT NULL REFERENCES public.operai(id),
    descrizione  TEXT            NOT NULL,
    urgente      BOOLEAN         NOT NULL DEFAULT false,
    stato        TEXT            NOT NULL DEFAULT 'richiesta',
    foto_url     TEXT,
    foto_path    TEXT,
    note         TEXT,
    created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE public.richieste_materiale ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "impresa_all_richieste" ON public.richieste_materiale`,
  `CREATE POLICY "impresa_all_richieste" ON public.richieste_materiale
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,
  `DROP POLICY IF EXISTS "operaio_own_richieste" ON public.richieste_materiale`,
  `CREATE POLICY "operaio_own_richieste" ON public.richieste_materiale
    USING (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))`,

  // Tabella magazzinieri
  `CREATE TABLE IF NOT EXISTS public.magazzinieri (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       TEXT        NOT NULL,
    email      TEXT        UNIQUE,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE public.magazzinieri ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "impresa_all_magazzinieri" ON public.magazzinieri`,
  `CREATE POLICY "impresa_all_magazzinieri" ON public.magazzinieri
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,
  `DROP POLICY IF EXISTS "magazziniere_own" ON public.magazzinieri`,
  `CREATE POLICY "magazziniere_own" ON public.magazzinieri
    USING (EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'
        AND p.email = email
    ))`,

  // Tabella rapportini
  `CREATE TABLE IF NOT EXISTS public.rapportini (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    giornata_id             UUID        UNIQUE NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    lavoro_eseguito         TEXT        NOT NULL,
    lavori_extra            TEXT,
    note_attrezzatura       TEXT,
    note_giorno_successivo  TEXT,
    ore_ordinarie           FLOAT       NOT NULL DEFAULT 0,
    ore_straordinarie       FLOAT       NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE public.rapportini ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "impresa_all_rapportini" ON public.rapportini`,
  `CREATE POLICY "impresa_all_rapportini" ON public.rapportini
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,
  `DROP POLICY IF EXISTS "operaio_own_rapportini" ON public.rapportini`,
  `CREATE POLICY "operaio_own_rapportini" ON public.rapportini
    USING (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.giornate g
      JOIN public.operai o ON o.id = g.operaio_id
      JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND g.id = giornata_id
    ))`,

  // Tabella configurazione_orari
  `CREATE TABLE IF NOT EXISTS public.configurazione_orari (
    id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    durata_mattina_minuti    INT     NOT NULL DEFAULT 240,
    durata_pausa_minuti      INT     NOT NULL DEFAULT 60,
    durata_pomeriggio_minuti INT     NOT NULL DEFAULT 240
  )`,
  `ALTER TABLE public.configurazione_orari ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "impresa_all_config" ON public.configurazione_orari`,
  `CREATE POLICY "impresa_all_config" ON public.configurazione_orari
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'impresa'))`,
  `DROP POLICY IF EXISTS "all_read_config" ON public.configurazione_orari`,
  `CREATE POLICY "all_read_config" ON public.configurazione_orari
    FOR SELECT USING (auth.role() = 'authenticated')`,

  // Colonne assegnatario su attrezzature (per blocco condivisione)
  `ALTER TABLE public.attrezzature ADD COLUMN IF NOT EXISTS assegnatario TEXT`,
]

async function main() {
  await client.connect()
  let ok = 0, errors = 0

  for (const q of queries) {
    const preview = q.trim().slice(0, 80).replace(/\s+/g, ' ')
    try {
      await client.query(q)
      console.log(`✅ ${preview}…`)
      ok++
    } catch (err) {
      const msg = err.message ?? String(err)
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('column') && msg.includes('of relation') && msg.includes('already exists')
      ) {
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
