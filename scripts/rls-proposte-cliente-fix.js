require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  console.log('Fix RLS: restringe UPDATE cliente su proposte_intervento...')

  // Sostituisce la policy cliente_update_own:
  // prima: stato NOT IN ('CommessaCreata', 'Annullata')  → troppo permissivo
  // dopo:  stato IN ('Inviata', 'VistaDalCliente')       → solo proposte aperte
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
        AND stato IN ('Inviata', 'VistaDalCliente')
      )
      WITH CHECK (
        cliente_id IN (
          SELECT id FROM clienti WHERE email = auth.jwt() ->> 'email'
        )
      );
  `)
  console.log('✓ Policy cliente_update_own: ora limitata a Inviata|VistaDalCliente')

  await pool.end()
  console.log('\nFix RLS proposte completato.')
}

main().catch(e => { console.error(e); process.exit(1) })
