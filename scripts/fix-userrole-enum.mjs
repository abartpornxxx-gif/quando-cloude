// ORDINE 0 — Fix: crea enum "UserRole" (PascalCase) che Prisma cerca, distinto da user_role (lowercase)
// Prisma genera query con ::public."UserRole" ma il DB ha solo user_role

import pg from 'pg'
const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString: DATABASE_URL })

const queries = [
  // Crea l'enum PascalCase che Prisma si aspetta
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
      CREATE TYPE public."UserRole" AS ENUM ('impresa', 'operaio', 'cliente', 'magazziniere');
    END IF;
  END $$`,

  // Porta chat_messaggi.ruolo al tipo che Prisma genera
  `ALTER TABLE public.chat_messaggi
    ALTER COLUMN ruolo TYPE public."UserRole"
    USING ruolo::text::public."UserRole"`,

  // Tabella push_subscriptions per notifiche push (struttura pronta, attivabile con VAPID key)
  `CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    operaio_id   UUID        NOT NULL REFERENCES public.operai(id) ON DELETE CASCADE,
    endpoint     TEXT        NOT NULL,
    subscription JSONB       NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(operaio_id, endpoint)
  )`,
  `ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "operaio_own_push" ON public.push_subscriptions`,
  `CREATE POLICY "operaio_own_push" ON public.push_subscriptions
    USING (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.operai o JOIN public.profiles p ON p.email = o.email
      WHERE p.id = auth.uid() AND o.id = operaio_id
    ))`,
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
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
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
