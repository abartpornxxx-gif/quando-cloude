require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Migrazione: manutenzioni programmate...')

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "TipoImpiantoManutenzione" AS ENUM ('Elettrico', 'Allarme', 'Automazioni', 'Altro');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('✓ Enum TipoImpiantoManutenzione')

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "IntervalloUnita" AS ENUM ('Giorni', 'Mesi');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('✓ Enum IntervalloUnita')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS manutenzioni_programmate (
      id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id               UUID NOT NULL REFERENCES clienti(id),
      titolo                   TEXT NOT NULL,
      tipo_impianto            "TipoImpiantoManutenzione" NOT NULL,
      tipo_impianto_altro      TEXT,
      intervallo_valore        INTEGER NOT NULL,
      intervallo_unita         "IntervalloUnita" NOT NULL,
      data_ultimo_intervento   DATE,
      data_prossimo_intervento DATE NOT NULL,
      note                     TEXT,
      attiva                   BOOLEAN NOT NULL DEFAULT true,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  console.log('✓ Tabella manutenzioni_programmate')

  await pool.end()
  console.log('\nMigrazione completata.')
}
main().catch(e => { console.error(e); process.exit(1) })
