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

// ── 9. Promemoria — orario timezone (bug fix: +2h) ─────────────────────────
// Simula la stessa logica del browser Italy (UTC+2 estate, CEST)
// Il browser invia new Date("2024-06-30T12:16").toISOString() prima della server action.
// Sul server Vercel (UTC), new Date("2024-06-30T12:16:00.000Z") = UTC 10:16.
// Il client (Italy) mostra toLocaleTimeString('it-IT', {timeZone:'Europe/Rome'}) = 12:16.

function simulaStoragePromemoriaFromBrowser(localDateTimeStr, browserOffsetMinutes) {
  // Simula: browser interpreta stringa locale, converte in UTC ISO
  // localDateTimeStr: "2024-06-30T12:16" (orario Italy)
  // browserOffsetMinutes: JS getTimezoneOffset() — negativo per UTC+ (Italy CEST = -120)
  // Formula: UTC = local + (offsetMinutes * 60000)
  // Esempio Italy CEST: UTC = 12:16 + (-120 * 60000) = 12:16 - 7200000ms = 10:16 UTC ✓
  const [datePart, timePart] = localDateTimeStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) + (browserOffsetMinutes * 60000)
  return new Date(utcMs)
}

function visualizzaOraItaly(utcDate) {
  return utcDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
}

// Italy estate = CEST = UTC+2 → browserOffset = -120
const ITALY_CEST_OFFSET = -120

// Test 1: 12:16 Italy → salva UTC → visualizza 12:16
{
  const utc = simulaStoragePromemoriaFromBrowser('2024-06-30T12:16', ITALY_CEST_OFFSET)
  const ora = visualizzaOraItaly(utc)
  assert.equal(ora, '12:16', `Atteso 12:16, ottenuto ${ora}`)
}

// Test 2: 08:30 Italy → salva UTC → visualizza 08:30
{
  const utc = simulaStoragePromemoriaFromBrowser('2024-06-30T08:30', ITALY_CEST_OFFSET)
  const ora = visualizzaOraItaly(utc)
  assert.equal(ora, '08:30', `Atteso 08:30, ottenuto ${ora}`)
}

// Test 3: 23:45 Italy → salva UTC → visualizza 23:45
{
  const utc = simulaStoragePromemoriaFromBrowser('2024-06-30T23:45', ITALY_CEST_OFFSET)
  const ora = visualizzaOraItaly(utc)
  assert.equal(ora, '23:45', `Atteso 23:45, ottenuto ${ora}`)
}

// Test 4: modifica da 12:16 a 13:20 → visualizza 13:20
{
  const utc = simulaStoragePromemoriaFromBrowser('2024-06-30T13:20', ITALY_CEST_OFFSET)
  const ora = visualizzaOraItaly(utc)
  assert.equal(ora, '13:20', `Atteso 13:20, ottenuto ${ora}`)
}

// Test 5: Nessun +2 ore — conferma che il vecchio bug (storare UTC diretto) dava +2h
{
  // BUG vecchio: server riceveva "12:16" senza TZ, lo interpretava come UTC 12:16
  const utcOldBug = new Date('2024-06-30T12:16:00.000Z') // UTC 12:16
  const oraVecchia = visualizzaOraItaly(utcOldBug) // Italy: 14:16 ← BUG
  assert.equal(oraVecchia, '14:16', 'conferma che il vecchio bug dava +2h')
  // FIX: browser converte in UTC 10:16
  const utcFix = new Date('2024-06-30T10:16:00.000Z') // UTC 10:16
  const oraFix = visualizzaOraItaly(utcFix) // Italy: 12:16 ← CORRETTO
  assert.equal(oraFix, '12:16', `Fix: atteso 12:16, ottenuto ${oraFix}`)
}

// Test 6: Nessun arrotondamento a 15 minuti — 12:16 resta 12:16
{
  const utc = simulaStoragePromemoriaFromBrowser('2024-06-30T12:16', ITALY_CEST_OFFSET)
  const ora = visualizzaOraItaly(utc)
  assert.notEqual(ora, '12:15', '12:16 NON deve essere arrotondato a 12:15')
  assert.equal(ora, '12:16')
}

console.log('✓ promemoria orario timezone (no +2h, no arrotondamento)')

console.log('\n✅ Tutti i test superati.')

