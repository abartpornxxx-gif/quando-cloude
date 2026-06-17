import pg from 'pg'
const { Client } = pg
const DB = 'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
const client = new Client({ connectionString: DB })

const queries = [
  // Enum
  `CREATE TYPE "StatoRichiestaOfferta" AS ENUM ('nuova', 'vista', 'in_preventivo', 'chiusa')`,

  // Tabella offerte catalogo
  `CREATE TABLE offerte_catalogo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titolo text NOT NULL,
    categoria text,
    descrizione text,
    foto_url text,
    foto_path text,
    prezzo_da integer,
    attiva boolean NOT NULL DEFAULT true,
    ordine integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Tabella richieste offerte
  `CREATE TABLE richieste_offerte (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offerta_id uuid NOT NULL REFERENCES offerte_catalogo(id),
    cliente_id uuid NOT NULL REFERENCES clienti(id),
    commessa_id uuid REFERENCES commesse(id),
    note text,
    stato "StatoRichiestaOfferta" NOT NULL DEFAULT 'nuova',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Trigger updated_at
  `CREATE TRIGGER set_offerte_catalogo_updated_at
    BEFORE UPDATE ON offerte_catalogo
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at)`,

  `CREATE TRIGGER set_richieste_offerte_updated_at
    BEFORE UPDATE ON richieste_offerte
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at)`,

  // Indici
  `CREATE INDEX idx_offerte_catalogo_attiva ON offerte_catalogo(attiva)`,
  `CREATE INDEX idx_richieste_offerte_cliente ON richieste_offerte(cliente_id)`,
  `CREATE INDEX idx_richieste_offerte_stato ON richieste_offerte(stato)`,

  // RLS
  `ALTER TABLE offerte_catalogo ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE richieste_offerte ENABLE ROW LEVEL SECURITY`,

  // Policy offerte_catalogo: impresa può tutto, cliente può solo leggere offerte attive
  `CREATE POLICY "Impresa gestisce offerte" ON offerte_catalogo
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'impresa')
    WITH CHECK (auth.jwt() ->> 'role' = 'impresa')`,

  `CREATE POLICY "Cliente vede offerte attive" ON offerte_catalogo
    FOR SELECT
    USING (attiva = true AND auth.role() = 'authenticated')`,

  // Policy richieste_offerte: impresa vede tutte, cliente vede solo le proprie
  `CREATE POLICY "Impresa vede tutte le richieste" ON richieste_offerte
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'impresa')
    WITH CHECK (auth.jwt() ->> 'role' = 'impresa')`,

  `CREATE POLICY "Cliente vede proprie richieste" ON richieste_offerte
    FOR SELECT
    USING (
      cliente_id IN (
        SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
      )
    )`,

  `CREATE POLICY "Cliente crea proprie richieste" ON richieste_offerte
    FOR INSERT
    WITH CHECK (
      cliente_id IN (
        SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
      )
    )`,

  // Storage bucket foto-catalogo
  `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('foto-catalogo', 'foto-catalogo', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
    ON CONFLICT (id) DO NOTHING`,

  // Storage RLS
  `CREATE POLICY "Impresa upload foto-catalogo" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'foto-catalogo' AND auth.role() = 'authenticated'
    )`,

  `CREATE POLICY "Public read foto-catalogo" ON storage.objects
    FOR SELECT USING (bucket_id = 'foto-catalogo')`,

  `CREATE POLICY "Impresa update foto-catalogo" ON storage.objects
    FOR UPDATE USING (bucket_id = 'foto-catalogo' AND auth.role() = 'authenticated')`,

  `CREATE POLICY "Impresa delete foto-catalogo" ON storage.objects
    FOR DELETE USING (bucket_id = 'foto-catalogo' AND auth.role() = 'authenticated')`,
]

async function main() {
  await client.connect()
  let ok = 0, errors = 0
  for (const q of queries) {
    const preview = q.trim().replace(/\s+/g, ' ').slice(0, 70)
    try {
      await client.query(q)
      console.log(`✅ ${preview}…`)
      ok++
    } catch (err) {
      const msg = err.message ?? String(err)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
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
