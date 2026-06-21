require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  console.log('\n=== GIORNATE APERTE (stato=bozza, fase!=completata) ===\n')

  const { rows: aperte } = await pool.query(`
    SELECT
      g.id,
      g.data,
      g.fase,
      g.stato,
      g.inizio_mattina,
      g.inizio_pomeriggio,
      o.nome AS operaio,
      c.nome AS commessa,
      NOW() - g.created_at AS eta
    FROM giornate g
    JOIN operai o ON o.id = g.operaio_id
    JOIN commesse c ON c.id = g.commessa_id
    WHERE g.stato = 'bozza' AND g.fase <> 'completata'
    ORDER BY g.data DESC, o.nome
  `)

  if (aperte.length === 0) {
    console.log('Nessuna giornata aperta trovata.')
  } else {
    console.log(`Totale: ${aperte.length} giornate aperte\n`)
    for (const r of aperte) {
      const data = new Date(r.data)
      const isOggi = data >= oggi
      const giorni = Math.floor(r.eta.days ?? 0)
      let oreDisplay = ''
      if (r.inizio_mattina) {
        const ms = Date.now() - new Date(r.inizio_mattina).getTime()
        const h = Math.floor(ms / 3600000)
        oreDisplay = ` | avviata ${h}h fa`
      }
      console.log(`  [${isOggi ? 'OGGI' : 'VECCHIA'}] ${r.operaio} — ${r.commessa}`)
      console.log(`    data: ${data.toLocaleDateString('it-IT')} | fase: ${r.fase}${oreDisplay}`)
    }
  }

  console.log('\n=== DOPPIONI: stessa data+operaio con più bozze ===\n')

  const { rows: doppioni } = await pool.query(`
    SELECT
      g.data,
      o.nome AS operaio,
      COUNT(*) AS quante
    FROM giornate g
    JOIN operai o ON o.id = g.operaio_id
    WHERE g.stato = 'bozza' AND g.fase <> 'completata'
    GROUP BY g.data, o.nome
    HAVING COUNT(*) > 1
    ORDER BY g.data DESC
  `)

  if (doppioni.length === 0) {
    console.log('Nessun doppione trovato.')
  } else {
    console.log(`Trovati ${doppioni.length} casi di doppione:`)
    for (const r of doppioni) {
      console.log(`  ${r.operaio} — ${new Date(r.data).toLocaleDateString('it-IT')}: ${r.quante} giornate aperte`)
    }
  }

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
