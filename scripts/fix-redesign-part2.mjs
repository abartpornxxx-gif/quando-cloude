// Corregge le parti fallite: enum user_role (lowercase) + chat_messaggi

import pg from 'pg'
const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString: DATABASE_URL })

const queries = [
  // Enum user_role (come si chiama REALMENTE in questo DB)
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'magazziniere'`,

  // Tabella chat_messaggi con user_role (lowercase)
  `CREATE TABLE IF NOT EXISTS public.chat_messaggi (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    commessa_id UUID        NOT NULL REFERENCES public.commesse(id),
    giornata_id UUID        NOT NULL REFERENCES public.giornate(id) ON DELETE CASCADE,
    autore_nome TEXT        NOT NULL,
    ruolo       user_role   NOT NULL,
    testo       TEXT,
    foto_url    TEXT,
    foto_path   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `ALTER TABLE public.chat_messaggi ENABLE ROW LEVEL SECURITY`,

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

  // Re-applica la policy magazziniere su richieste_materiale
  `DROP POLICY IF EXISTS "magazziniere_all_richieste" ON public.richieste_materiale`,
  `CREATE POLICY "magazziniere_all_richieste" ON public.richieste_materiale
    USING   (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'magazziniere'))`,
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

main().catch(err => { console.error(err); process.exit(1) })
