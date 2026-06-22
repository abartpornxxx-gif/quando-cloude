require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Migrazione: proposte di intervento per manutenzioni...')

  // 1. Enum StatoPropostaIntervento
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "StatoPropostaIntervento" AS ENUM (
        'Inviata',
        'VistaDalCliente',
        'Accettata',
        'RifiutataCliente',
        'ConfermataManuale',
        'CommessaCreata',
        'Annullata'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('✓ Enum StatoPropostaIntervento')

  // 2. Tabella proposte_intervento
  await pool.query(`
    CREATE TABLE IF NOT EXISTS proposte_intervento (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      manutenzione_id         UUID NOT NULL REFERENCES manutenzioni_programmate(id) ON DELETE CASCADE,
      cliente_id              UUID NOT NULL REFERENCES clienti(id),
      stato                   "StatoPropostaIntervento" NOT NULL DEFAULT 'Inviata',
      messaggio_impresa       TEXT,
      data_proposta_prevista  DATE NOT NULL,
      risposta_cliente        TEXT,
      confermata_da_impresa   BOOLEAN NOT NULL DEFAULT false,
      commessa_id             UUID REFERENCES commesse(id) ON DELETE SET NULL,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  console.log('✓ Tabella proposte_intervento')

  // 3. Trigger updated_at
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
  await pool.query(`
    DROP TRIGGER IF EXISTS proposte_intervento_updated_at ON proposte_intervento;
    CREATE TRIGGER proposte_intervento_updated_at
      BEFORE UPDATE ON proposte_intervento
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `)
  console.log('✓ Trigger updated_at')

  // 4. Indice parziale anti-duplicazione
  // Una sola proposta in stato aperto (Inviata o VistaDalCliente) per manutenzione
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS proposte_intervento_unica_aperta
      ON proposte_intervento (manutenzione_id)
      WHERE stato IN ('Inviata', 'VistaDalCliente');
  `)
  console.log('✓ Indice parziale anti-duplicazione (una proposta aperta per manutenzione)')

  // 5. Indice per query cliente
  await pool.query(`
    CREATE INDEX IF NOT EXISTS proposte_intervento_cliente_idx
      ON proposte_intervento (cliente_id);
  `)
  console.log('✓ Indice cliente_id')

  // 6. RLS
  await pool.query(`ALTER TABLE proposte_intervento ENABLE ROW LEVEL SECURITY;`)
  console.log('✓ RLS abilitata')

  // 7. Policy impresa: accesso completo
  await pool.query(`
    DROP POLICY IF EXISTS impresa_full_access ON proposte_intervento;
    CREATE POLICY impresa_full_access
      ON proposte_intervento
      FOR ALL
      TO authenticated
      USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'impresa'
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'impresa'
      );
  `)
  console.log('✓ Policy impresa: accesso completo')

  // 8. Policy cliente: SELECT sulle proprie proposte
  await pool.query(`
    DROP POLICY IF EXISTS cliente_select_own ON proposte_intervento;
    CREATE POLICY cliente_select_own
      ON proposte_intervento
      FOR SELECT
      TO authenticated
      USING (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  `)
  console.log('✓ Policy cliente: SELECT proprie proposte')

  // 9. Policy cliente: UPDATE sulle proprie proposte (non ancora CommessaCreata/Annullata)
  // La validazione delle colonne aggiornabili (solo stato + risposta_cliente) va
  // fatta nella server action lato applicativo.
  await pool.query(`
    DROP POLICY IF EXISTS cliente_update_own ON proposte_intervento;
    CREATE POLICY cliente_update_own
      ON proposte_intervento
      FOR UPDATE
      TO authenticated
      USING (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
        AND stato NOT IN ('CommessaCreata', 'Annullata')
      )
      WITH CHECK (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  `)
  console.log('✓ Policy cliente: UPDATE proprie proposte aperte')

  // 10. Verifica sicurezza: nessuna policy cliente su manutenzioni_programmate
  const check = await pool.query(`
    SELECT policyname FROM pg_policies
    WHERE tablename = 'manutenzioni_programmate'
    AND policyname LIKE '%cliente%';
  `)
  if (check.rows.length > 0) {
    console.warn('⚠️  ATTENZIONE: esiste una policy cliente su manutenzioni_programmate:')
    check.rows.forEach(r => console.warn('   -', r.policyname))
    console.warn('   Il cliente NON deve accedere a manutenzioni_programmate direttamente!')
  } else {
    console.log('✓ Sicurezza: nessuna policy cliente su manutenzioni_programmate')
  }

  await pool.end()
  console.log('\nMigrazione proposte_intervento completata.')
}

main().catch(e => { console.error(e); process.exit(1) })
