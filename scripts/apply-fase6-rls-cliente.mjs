// Fase 6: aggiunge policy RLS SELECT-only per il portale cliente.
// Il cliente può leggere SOLO i propri dati tramite REST API Supabase.
// Prisma usa service role e bypassa RLS — questo è defense-in-depth.
import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString:
    'postgresql://postgres.kzpmpeedpdamtpjmrqoa:toschiatttuttindepacc99@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
})
await client.connect()

const queries = [
  // -----------------------------------------------------------------
  // clienti: il cliente vede solo il proprio record (email match)
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprio_record" ON clienti
      FOR SELECT
      USING (auth.jwt() ->> 'email' = email);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // commesse: il cliente vede solo le commesse collegate al proprio id
  // (sub-select invece di JOIN perché RLS non supporta JOIN diretti)
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_commesse" ON commesse
      FOR SELECT
      USING (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // giornate: visibili se la commessa appartiene al cliente
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_giornate" ON giornate
      FOR SELECT
      USING (
        commessa_id IN (
          SELECT c.id FROM commesse c
          JOIN clienti cl ON cl.id = c.cliente_id
          WHERE cl.email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // giornata_foto: visibili se la giornata appartiene al cliente
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_foto" ON giornata_foto
      FOR SELECT
      USING (
        giornata_id IN (
          SELECT g.id FROM giornate g
          JOIN commesse c ON c.id = g.commessa_id
          JOIN clienti cl ON cl.id = c.cliente_id
          WHERE cl.email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // rapportini: visibili se la giornata appartiene al cliente
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_propri_rapportini" ON rapportini
      FOR SELECT
      USING (
        giornata_id IN (
          SELECT g.id FROM giornate g
          JOIN commesse c ON c.id = g.commessa_id
          JOIN clienti cl ON cl.id = c.cliente_id
          WHERE cl.email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // fatture_attive: il cliente vede solo le proprie
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_fatture" ON fatture_attive
      FOR SELECT
      USING (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // fattura_attiva_righe: visibili se la fattura appartiene al cliente
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_righe_fattura" ON fattura_attiva_righe
      FOR SELECT
      USING (
        fattura_id IN (
          SELECT f.id FROM fatture_attive f
          JOIN clienti cl ON cl.id = f.cliente_id
          WHERE cl.email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // dichiarazioni_conformita: visibili se la commessa appartiene al cliente
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_proprie_dico" ON dichiarazioni_conformita
      FOR SELECT
      USING (
        commessa_id IN (
          SELECT c.id FROM commesse c
          JOIN clienti cl ON cl.id = c.cliente_id
          WHERE cl.email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // -----------------------------------------------------------------
  // preventivi: il cliente vede i propri preventivi
  // -----------------------------------------------------------------
  `DO $$ BEGIN
    CREATE POLICY "cliente_legge_propri_preventivi" ON preventivi
      FOR SELECT
      USING (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
]

let ok = 0
for (const q of queries) {
  try {
    await client.query(q)
    ok++
    process.stdout.write('.')
  } catch (err) {
    console.error('\nERRORE:', err.message, '\nQuery:', q.slice(0, 100))
  }
}
console.log(`\nRLS Fase 6 completata: ${ok}/${queries.length} query ok`)
await client.end()
