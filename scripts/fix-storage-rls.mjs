// Fix ORDINE 0: policy RLS per Supabase Storage bucket "foto-cantiere"
// Il problema: operaio autentico riceve "violates row-level security policy" sull'upload

import pg from 'pg'
const { Client } = pg

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({ connectionString: DATABASE_URL })

const queries = [
  // Prima: rimuovi eventuali policy vecchie (idempotente)
  `DROP POLICY IF EXISTS "Authenticated upload foto-cantiere" ON storage.objects`,
  `DROP POLICY IF EXISTS "Public read foto-cantiere" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated update foto-cantiere" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated delete foto-cantiere" ON storage.objects`,

  // Insert: qualsiasi utente autenticato può caricare nel bucket foto-cantiere
  `CREATE POLICY "Authenticated upload foto-cantiere" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'foto-cantiere'
      AND auth.role() = 'authenticated'
    )`,

  // Select: chiunque può leggere (bucket pubblico)
  `CREATE POLICY "Public read foto-cantiere" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'foto-cantiere')`,

  // Update: utente autenticato può aggiornare i propri upload
  `CREATE POLICY "Authenticated update foto-cantiere" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'foto-cantiere' AND auth.role() = 'authenticated')`,

  // Delete: utente autenticato può eliminare file
  `CREATE POLICY "Authenticated delete foto-cantiere" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'foto-cantiere' AND auth.role() = 'authenticated')`,
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
