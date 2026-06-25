// Test minimi QUADRO — logica pura, zero dipendenze DB/framework
// Eseguire con: node scripts/test-minimal.mjs
import assert from 'node:assert/strict'

// ── 1. calcolaTotalePreventivo ───────────────────────────────────────────────
function calcolaTotalePreventivo(righe) {
  return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
}

assert.equal(calcolaTotalePreventivo([{ quantita: 2, prezzoUnitario: 5000 }]), 10000)
assert.equal(calcolaTotalePreventivo([]), 0)
assert.equal(calcolaTotalePreventivo([{ quantita: 1.5, prezzoUnitario: 10000 }]), 15000)
assert.equal(
  calcolaTotalePreventivo([{ quantita: 3, prezzoUnitario: 100 }, { quantita: 2, prezzoUnitario: 200 }]),
  700
)
console.log('✓ calcolaTotalePreventivo')

// ── 2. Guard idempotenza incasso ─────────────────────────────────────────────
function guardIncasso(fattura) {
  if (fattura.stato === 'incassata') throw new Error('Fattura già registrata come incassata')
}

assert.doesNotThrow(() => guardIncasso({ stato: 'da_incassare' }))
assert.doesNotThrow(() => guardIncasso({ stato: 'scaduta' }))
assert.throws(() => guardIncasso({ stato: 'incassata' }), /già registrata/)
console.log('✓ guardIncasso (idempotenza)')

// ── 3. Guard conversione preventivo in commessa ──────────────────────────────
function guardConversione(preventivo) {
  if (preventivo.stato !== 'accettato') {
    throw new Error(`Preventivo non accettato (stato: ${preventivo.stato})`)
  }
}

assert.doesNotThrow(() => guardConversione({ stato: 'accettato' }))
assert.throws(() => guardConversione({ stato: 'bozza' }), /non accettato/)
assert.throws(() => guardConversione({ stato: 'rifiutato' }), /non accettato/)
assert.throws(() => guardConversione({ stato: 'scaduto' }), /non accettato/)
assert.throws(() => guardConversione({ stato: 'inviato' }), /non accettato/)
console.log('✓ guardConversione preventivo (incl. scaduto)')

// ── 4. Conflict detection pianificazione ────────────────────────────────────
function haConflitto(pians, operaioId, data, commessaId) {
  return pians.some(p => p.operaioId === operaioId && p.data === data && p.commessaId !== commessaId)
}

const pians = [
  { id: '1', operaioId: 'op1', data: '2026-06-10', commessaId: 'c1' },
  { id: '2', operaioId: 'op2', data: '2026-06-10', commessaId: 'c1' },
]
// stessa commessa → no conflitto (upsert)
assert.ok(!haConflitto(pians, 'op1', '2026-06-10', 'c1'))
// cantiere diverso → conflitto
assert.ok(haConflitto(pians, 'op1', '2026-06-10', 'c2'))
// giorno diverso → ok
assert.ok(!haConflitto(pians, 'op1', '2026-06-11', 'c2'))
// operaio diverso → ok
assert.ok(!haConflitto(pians, 'op3', '2026-06-10', 'c2'))
// op2 su c1 stesso giorno → no conflitto (già assegnato a c1)
assert.ok(!haConflitto(pians, 'op2', '2026-06-10', 'c1'))
console.log('✓ conflict detection pianificazione')

// ── 5. Date UTC — confronto giorno senza drift fuso orario ──────────────────
function isoToUtcDay(iso) {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Data CEST (UTC+2): '2026-06-10T23:00:00+02:00' → UTC 21:00 → giugno 10
assert.equal(isoToUtcDay('2026-06-10T23:00:00+02:00'), Date.UTC(2026, 5, 10))
// UTC diretto
assert.equal(isoToUtcDay('2026-06-10T01:00:00Z'), Date.UTC(2026, 5, 10))
// Midnight UTC
assert.equal(isoToUtcDay('2026-06-10T00:00:00Z'), Date.UTC(2026, 5, 10))

const oggi = Date.UTC(2026, 5, 23)
assert.ok(Date.UTC(2026, 5, 20) < oggi, 'scadenza passata')
assert.ok(Date.UTC(2026, 5, 30) > oggi, 'scadenza futura')
console.log('✓ date UTC (no drift fuso)')

// ── 6. Sicurezza Password Temporanea (Fase Profili Accesso) ──────────────────
function validateTempPassword(pass) {
  return typeof pass === 'string' && pass.startsWith('QDR-') && pass.length === 12
}
const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function mockGenerateTempPassword() {
  let pass = 'QDR-'
  for (let i = 0; i < 8; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}
assert.ok(validateTempPassword(mockGenerateTempPassword()))
console.log('✓ sicurezza password temporanea')

// ── 7. Generatore Bio Mascotte ──────────────────────────────────────────────
function mockGeneraBioMascotte(nome, mascotteId, colore) {
  const nomePulito = nome.split(' ')[0] || 'L\'operaio'
  const coloreTradotto = colore.toLowerCase()
  const templates = {
    leone: `${nomePulito} ruggisce in cantiere con un casco ${coloreTradotto}, ma si commuove davanti a un cornetto caldo prima di iniziare!`,
    volpe: `${nomePulito} risolve i problemi elettrici più complessi con un casco ${coloreTradotto} e l'astuzia di una volpe, anche se si perde a cercare il metro.`
  }
  return templates[mascotteId] || `${nomePulito} con casco ${coloreTradotto} ed avatar ${mascotteId}`
}
assert.match(mockGeneraBioMascotte('Mario Rossi', 'leone', 'verde'), /Mario ruggisce in cantiere con un casco verde/)
assert.match(mockGeneraBioMascotte('Antonio Sacco', 'volpe', 'rosso'), /Antonio risolve i problemi/)
console.log('✓ generatore bio mascotte')

// ── 8. Unicità Mascotte + Colore ───────────────────────────────────────────
function isMascotteColorUnique(occupate, mascotte, colore) {
  const pair = `${mascotte}_${colore}`
  return !occupate.includes(pair)
}
const occupied = ['leone_giallo', 'volpe_verde', 'bulldog_rosso']
assert.ok(isMascotteColorUnique(occupied, 'leone', 'verde')) // Libera
assert.ok(!isMascotteColorUnique(occupied, 'leone', 'giallo')) // Occupata
assert.ok(!isMascotteColorUnique(occupied, 'volpe', 'verde')) // Occupata
console.log('✓ unicità mascotte + colore')

console.log('\n✅ Tutti i test superati.')

