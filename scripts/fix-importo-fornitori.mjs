import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERRORE: DATABASE_URL non trovato in .env.local');
    process.exit(1);
  }

  console.log('🔄 Connessione al database...');
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('🛠️ Esecuzione alter table per allineare importo a DOUBLE PRECISION...');
    
    // Altera la colonna in postgresql da INT a FLOAT (DOUBLE PRECISION)
    await client.query(`
      ALTER TABLE richieste_preventivi_fornitori 
      ALTER COLUMN importo TYPE DOUBLE PRECISION 
      USING importo::double precision;
    `);

    console.log('✅ Migrazione completata con successo!');
  } catch (error) {
    console.error('❌ ERRORE durante la migrazione:', error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
