// Script to fix invoice states based on real payment/incasso amounts.
// Run with: node scripts/fix-invoice-states.js
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL non trovata.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connesso al DB...');

  // 1. Allineamento FATTURE ATTIVE
  console.log('Controllo fatture attive...');
  const activeRes = await client.query(`
    SELECT f.id, f.numero, f.anno, f.stato, f.aliquota_iva as "aliquotaIva", f.importo_incassato as "importoIncassato"
    FROM fatture_attive f
  `);

  for (const f of activeRes.rows) {
    const righeRes = await client.query(`
      SELECT quantita, prezzo_unitario as "prezzoUnitario"
      FROM fattura_attiva_righe
      WHERE fattura_id = $1
    `, [f.id]);

    const imponibile = righeRes.rows.reduce(
      (acc, r) => acc + Math.round(Number(r.quantita) * Number(r.prezzoUnitario)),
      0
    );
    const iva = Math.round((imponibile * Number(f.aliquotaIva)) / 100);
    const totalAmount = imponibile + iva;
    const paid = Number(f.importoIncassato ?? 0);

    let calculatedState = 'da_incassare';
    if (paid >= totalAmount) {
      calculatedState = 'incassata';
    } else if (paid > 0) {
      calculatedState = 'parzialmente_incassata';
    }

    // Se lo stato corrente nel DB è 'scaduta' e non è incassata, possiamo lasciarlo o rimetterlo secondo la scadenza,
    // ma la cosa più sicura è mantenere 'scaduta' se non è incassata e se era già scaduta o scade in passato.
    if (calculatedState !== 'incassata' && f.stato === 'scaduta') {
      calculatedState = 'scaduta';
    }

    if (f.stato !== calculatedState) {
      console.log(`Aggiorno fattura attiva ${f.numero}/${f.anno}: ${f.stato} -> ${calculatedState} (totale: ${totalAmount}, incassato: ${paid})`);
      await client.query(`
        UPDATE fatture_attive
        SET stato = $1
        WHERE id = $2
      `, [calculatedState, f.id]);
    }
  }

  // 2. Allineamento FATTURE PASSIVE
  console.log('Controllo fatture passive...');
  const passiveRes = await client.query(`
    SELECT id, numero, importo, importo_pagato as "importoPagato", stato
    FROM fatture_passive
  `);

  for (const f of passiveRes.rows) {
    const totalAmount = Number(f.importo);
    const paid = Number(f.importoPagato ?? 0);

    let calculatedState = 'da_pagare';
    if (paid >= totalAmount) {
      calculatedState = 'pagata';
    } else if (paid > 0) {
      calculatedState = 'parzialmente_pagata';
    }

    if (f.stato !== calculatedState) {
      console.log(`Aggiorno fattura passiva ${f.numero ?? 'n.d.'} (id: ${f.id}): ${f.stato} -> ${calculatedState} (totale: ${totalAmount}, pagato: ${paid})`);
      await client.query(`
        UPDATE fatture_passive
        SET stato = $1
        WHERE id = $2
      `, [calculatedState, f.id]);
    }
  }

  console.log('Allineamento completato!');
  await client.end();
}

main().catch(err => {
  console.error('Errore:', err);
  client.end().catch(() => {});
  process.exit(1);
});
