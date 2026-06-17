import pg from 'pg'
const { Client } = pg
const DB = 'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
const client = new Client({ connectionString: DB })

const queries = [
  `CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
   BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS offerte_catalogo_updated_at ON offerte_catalogo;
   CREATE TRIGGER offerte_catalogo_updated_at BEFORE UPDATE ON offerte_catalogo
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `DROP TRIGGER IF EXISTS richieste_offerte_updated_at ON richieste_offerte;
   CREATE TRIGGER richieste_offerte_updated_at BEFORE UPDATE ON richieste_offerte
   FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
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
      console.error(`❌ ${preview}…\n   ${err.message}`)
      errors++
    }
  }
  await client.end()
  console.log(`\nRisultato: ${ok} ok, ${errors} errori`)
  if (errors > 0) process.exit(1)
}
main().catch(err => { console.error(err); process.exit(1) })
