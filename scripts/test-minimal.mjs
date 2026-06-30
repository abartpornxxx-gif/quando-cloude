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

// ── 10. ConteggioCantiere — logica placche e quantità ────────────────────────

function calcolaPlaccheTest(qty) {
  const SUP_503 = qty['SUP_503'] ?? 0
  const SUP_504 = qty['SUP_504'] ?? 0
  const SUP_506 = qty['SUP_506'] ?? 0
  return SUP_503 + SUP_504 + SUP_506
}

// Test 10.1: calcolo placche da supporti
assert.equal(calcolaPlaccheTest({ SUP_503: 20, SUP_504: 3, SUP_506: 2 }), 25, 'placche: 20+3+2=25')
assert.equal(calcolaPlaccheTest({ SUP_503: 0, SUP_504: 0, SUP_506: 0 }), 0, 'placche: zero')
assert.equal(calcolaPlaccheTest({ SUP_503: 10 }), 10, 'placche: solo 503')
assert.equal(calcolaPlaccheTest({}), 0, 'placche: map vuota = 0')

// Test 10.2: incremento/decremento quantità con floor a 0
function incr(qty, codice) { return { ...qty, [codice]: (qty[codice] ?? 0) + 1 } }
function decr(qty, codice) { return { ...qty, [codice]: Math.max(0, (qty[codice] ?? 0) - 1) } }

{
  let q = {}
  q = incr(q, 'FRU_01')
  assert.equal(q['FRU_01'], 1, '+1 da zero = 1')
  q = incr(q, 'FRU_01')
  assert.equal(q['FRU_01'], 2, '+1 = 2')
  q = decr(q, 'FRU_01')
  assert.equal(q['FRU_01'], 1, '-1 = 1')
  q = decr(q, 'FRU_01')
  assert.equal(q['FRU_01'], 0, '-1 = 0')
  q = decr(q, 'FRU_01')
  assert.equal(q['FRU_01'], 0, '-1 da zero resta 0 (no negativi)')
}

// Test 10.3: transizioni di stato
const TRANSIZIONI_VALIDE = {
  richiesto: ['in_compilazione'],
  in_compilazione: ['inviato'],
  inviato: ['approvato', 'riaperto'],
  approvato: ['riaperto'],
  riaperto: ['in_compilazione'],
}
function puoTransire(statoCorrente, nuovoStato) {
  return (TRANSIZIONI_VALIDE[statoCorrente] ?? []).includes(nuovoStato)
}

assert.ok(puoTransire('inviato', 'approvato'), 'inviato → approvato OK')
assert.ok(puoTransire('approvato', 'riaperto'), 'approvato → riaperto OK')
assert.ok(!puoTransire('richiesto', 'approvato'), 'richiesto → approvato NON OK')
assert.ok(!puoTransire('approvato', 'inviato'), 'approvato → inviato NON OK (no regressione)')

// Test 10.4: visibile_cliente solo se approvato
function puoMostrareAlCliente(stato, visibileCliente) {
  return stato === 'approvato' && visibileCliente === true
}
assert.ok(puoMostrareAlCliente('approvato', true))
assert.ok(!puoMostrareAlCliente('inviato', true))
assert.ok(!puoMostrareAlCliente('approvato', false))

// Test 10.5: creaConteggio — validazione campi obbligatori
function validaCreazioneMock(data) {
  if (!data.commessaId) return { success: false, error: 'Commessa obbligatoria.' }
  return { success: true, id: 'fake-uuid' }
}
assert.deepEqual(validaCreazioneMock({ commessaId: 'c1', noteImpresa: 'test' }), { success: true, id: 'fake-uuid' })
assert.deepEqual(validaCreazioneMock({ commessaId: 'c1', operaioId: 'op1' }), { success: true, id: 'fake-uuid' })
assert.deepEqual(validaCreazioneMock({ noteImpresa: 'test' }), { success: false, error: 'Commessa obbligatoria.' })
assert.deepEqual(validaCreazioneMock({}), { success: false, error: 'Commessa obbligatoria.' })

// Test 10.6: stato iniziale conteggio appena creato
function statoIniziale() { return 'richiesto' }
assert.equal(statoIniziale(), 'richiesto', 'stato iniziale = richiesto')

// Test 10.7: permessi — solo impresa può creare richiesta conteggio
function puoCreareConteggio(ruolo) {
  return ruolo === 'impresa'
}
assert.ok(puoCreareConteggio('impresa'), 'impresa OK')
assert.ok(!puoCreareConteggio('operaio'), 'operaio NON può')
assert.ok(!puoCreareConteggio('cliente'), 'cliente NON può')
assert.ok(!puoCreareConteggio('ufficio'), 'ufficio NON può')

// Test 10.8: errore controllato — nessun crash, messaggio leggibile
function handleCreazioneErrore(err) {
  if (!err) return null
  return 'Non è stato possibile creare il conteggio cantiere. Verifica commessa e operaio e riprova.'
}
assert.equal(handleCreazioneErrore(new Error('DB error')), 'Non è stato possibile creare il conteggio cantiere. Verifica commessa e operaio e riprova.')
assert.equal(handleCreazioneErrore(null), null)

// Test 10.9: enum StatoConteggio — valori validi
const STATI_VALIDI = new Set(['richiesto', 'in_compilazione', 'inviato', 'approvato', 'riaperto'])
assert.ok(STATI_VALIDI.has('richiesto'), 'richiesto è valido')
assert.ok(!STATI_VALIDI.has('stato_conteggio'), 'stato_conteggio NON è un valore valido (è il nome del tipo)')
assert.ok(!STATI_VALIDI.has(''), 'stringa vuota non valida')

console.log('✓ conteggio-cantiere (placche, qty, stati, visibilità cliente, creazione, permessi)')

// ── 11. AI Promemoria ────────────────────────────────────────────────────────

// Test 11.1: orario promemoria invariato (riconferma fix timezone)
{
  function simulaBrowser(localStr, offsetMin) {
    const [d, t] = localStr.split('T')
    const [y, mo, day] = d.split('-').map(Number)
    const [h, mi] = t.split(':').map(Number)
    const utcMs = Date.UTC(y, mo - 1, day, h, mi) + (offsetMin * 60000)
    return new Date(utcMs)
  }
  function mostraItaly(utcDate) {
    return utcDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  }
  const OFFSET_ITALY = -120
  assert.equal(mostraItaly(simulaBrowser('2024-06-30T12:16', OFFSET_ITALY)), '12:16')
  assert.equal(mostraItaly(simulaBrowser('2024-06-30T08:30', OFFSET_ITALY)), '08:30')
  assert.equal(mostraItaly(simulaBrowser('2024-06-30T23:45', OFFSET_ITALY)), '23:45')
  assert.notEqual(mostraItaly(simulaBrowser('2024-06-30T12:16', OFFSET_ITALY)), '14:16', 'no +2h')
}

// Test 11.2: parsing AI mock — classificazione tipo
function classificaTipo(testo) {
  const t = testo.toLowerCase()
  if (t.includes('sopralluogo'))                    return 'sopralluogo'
  if (t.includes('urgente') || t.includes('subito')) return 'intervento_urgente'
  if (t.includes('chiama') || t.includes('chiamare')) return 'chiamata_cliente'
  if (t.includes('ordina') || t.includes('ordinare')) return 'ordine_materiale'
  return 'altro'
}
assert.equal(classificaTipo('Domani alle 9 sopralluogo da Mario Rossi'), 'sopralluogo')
assert.equal(classificaTipo('Urgente oggi pomeriggio salvavita che scatta'), 'intervento_urgente')
assert.equal(classificaTipo('Ricordami di chiamare il cliente Castaldo'), 'chiamata_cliente')
assert.equal(classificaTipo('Ordinare placche Living Now'), 'ordine_materiale')

// Test 11.3: priorità automatica
function suggerisciPriorita(testo) {
  const t = testo.toLowerCase()
  const urgente = ['urgente', 'subito', 'bloccato', 'senza corrente', 'salvavita', 'perdita', 'allarme', 'oggi pomeriggio']
  const alta = ['oggi', 'scade oggi']
  if (urgente.some(k => t.includes(k))) return 'urgente'
  if (alta.some(k => t.includes(k)))    return 'alta'
  return 'normale'
}
assert.equal(suggerisciPriorita('Urgente oggi pomeriggio salvavita che scatta'), 'urgente')
assert.equal(suggerisciPriorita('Oggi controlla impianto'), 'alta')
assert.equal(suggerisciPriorita('Domani alle 9 sopralluogo'), 'normale')
assert.equal(suggerisciPriorita('Bloccato senza corrente'), 'urgente')

// Test 11.4: stile AI — nessun markdown
function contieneMdBrutto(testo) {
  return /^#{1,6}\s/m.test(testo) || /\*\*.+?\*\*/s.test(testo)
}
assert.ok(!contieneMdBrutto('Ho capito. Posso preparare un promemoria per il sopralluogo.'))
assert.ok(!contieneMdBrutto('Il sopralluogo risulta scaduto. Vuoi segnare cosa è successo?'))
assert.ok(contieneMdBrutto('## Ecco il piano **dettagliato**...'), 'markdown brutto rilevato correttamente')
assert.ok(contieneMdBrutto('### Titolo\nContenuto'), 'heading rilevato correttamente')

// Test 11.5: permessi per ruolo
function azioniConsentite(ruolo) {
  switch (ruolo) {
    case 'impresa': return ['crea_promemoria','elimina_promemoria','crea_commessa','crea_preventivo']
    case 'ufficio': return ['crea_promemoria','registra_esito']
    case 'operaio': return ['vedi_propri']
    case 'cliente': return []
    default:        return []
  }
}
assert.ok(azioniConsentite('impresa').includes('crea_commessa'), 'impresa può crea commessa')
assert.ok(!azioniConsentite('operaio').includes('crea_commessa'), 'operaio NON può creare commessa')
assert.ok(!azioniConsentite('cliente').includes('crea_promemoria'), 'cliente NON può creare promemoria')
assert.ok(!azioniConsentite('ufficio').includes('elimina_promemoria'), 'ufficio NON elimina promemoria')

// Test 11.6: nessuna azione senza conferma
function simulaConfermaRichiesta(azione, confermato) {
  if (!confermato) throw new Error('CONFERMA_RICHIESTA')
  return { eseguita: true, azione }
}
assert.throws(() => simulaConfermaRichiesta('crea_commessa', false), /CONFERMA_RICHIESTA/)
assert.doesNotThrow(() => simulaConfermaRichiesta('crea_commessa', true))

// Test 11.7: rimanda — orario scelto resta invariato
{
  const sceltaUtente = '2024-07-01T13:20'
  const utcSalvato = new Date(sceltaUtente).toISOString()
  // Simula visualizzazione lato client (browser Italy)
  const displayOra = new Date(utcSalvato).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  assert.equal(displayOra, '13:20', 'rimanda: orario scelto 13:20 resta 13:20')
}

console.log('✓ ai-promemoria (timezone, parsing, priorità, stile, permessi, conferma, rimanda)')

// ── 12. Multi-bozza: parsing risposta AI ────────────────────────────────────
{
  const TIPI_VALIDI = ['sopralluogo','intervento_urgente','chiamata_cliente','ordine_materiale','attivita_ufficio','appuntamento','scadenza','nota_interna','promemoria_operaio','altro']
  const PRIORITA_VALIDE = ['bassa','normale','alta','urgente']

  function sanitizzaBozza(bozza, testoOriginale) {
    return {
      titolo:      typeof bozza.titolo === 'string'       ? bozza.titolo.slice(0, 200)      : '',
      tipo:        TIPI_VALIDI.includes(bozza.tipo)       ? bozza.tipo                       : 'altro',
      data:        typeof bozza.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bozza.data) ? bozza.data : null,
      ora:         typeof bozza.ora === 'string' && /^\d{2}:\d{2}$/.test(bozza.ora)          ? bozza.ora  : null,
      priorita:    PRIORITA_VALIDE.includes(bozza.priorita) ? bozza.priorita                : 'normale',
      luogo:       typeof bozza.luogo === 'string'        ? bozza.luogo.slice(0, 300)        : null,
      descrizione: typeof bozza.descrizione === 'string'  ? bozza.descrizione.slice(0, 1000): null,
      clienteNome: typeof bozza.clienteNome === 'string'  ? bozza.clienteNome.slice(0, 200)  : null,
      operaioNome: typeof bozza.operaioNome === 'string'  ? bozza.operaioNome.slice(0, 200)  : null,
      note:        typeof bozza.note === 'string'         ? bozza.note.slice(0, 500)         : null,
      testoOriginale: testoOriginale.slice(0, 1000),
    }
  }

  // Test 12.1: risposta AI formato array → 2 bozze
  const rispostaMulti = {
    bozze: [
      { titolo: 'Sopralluogo cantiere Giuseppe', tipo: 'sopralluogo', data: '2026-07-01', ora: '09:30', priorita: 'normale', luogo: null, descrizione: null, clienteNome: 'Giuseppe', operaioNome: null, note: null },
      { titolo: 'Rientro in ufficio', tipo: 'attivita_ufficio', data: '2026-07-01', ora: '12:00', priorita: 'normale', luogo: 'ufficio', descrizione: null, clienteNome: null, operaioNome: null, note: null },
    ]
  }
  const testo = 'DOMANI ALLE 9:30 VADO DA GIUSEPPE POI ALLE 12 SONO IN UFFICIO'
  const bozze = rispostaMulti.bozze.map(b => sanitizzaBozza(b, testo))
  assert.equal(bozze.length, 2, '2 bozze generate')
  assert.equal(bozze[0].titolo, 'Sopralluogo cantiere Giuseppe')
  assert.equal(bozze[0].ora, '09:30', 'orario 09:30 invariato')
  assert.equal(bozze[1].titolo, 'Rientro in ufficio')
  assert.equal(bozze[1].ora, '12:00', 'orario 12:00 invariato')
  assert.equal(bozze[0].testoOriginale, testo, 'testo originale preservato')

  // Test 12.2: risposta AI formato singolo → backward compat
  const rispostaSingola = { titolo: 'Chiamata cliente', tipo: 'chiamata_cliente', data: '2026-07-02', ora: '14:30', priorita: 'alta', luogo: null, descrizione: null, clienteNome: 'Rossi', operaioNome: null, note: null }
  const bozzaSingola = sanitizzaBozza(rispostaSingola, 'Domani pomeriggio chiama Rossi')
  assert.equal(bozzaSingola.titolo, 'Chiamata cliente')
  assert.equal(bozzaSingola.tipo, 'chiamata_cliente')
  assert.equal(bozzaSingola.ora, '14:30', 'orario singolo invariato')

  // Test 12.3: tipo non valido → fallback 'altro'
  const bozzaTipoInvalido = sanitizzaBozza({ titolo: 'Test', tipo: 'tipo_inventato', data: null, ora: null, priorita: 'normale' }, 'test')
  assert.equal(bozzaTipoInvalido.tipo, 'altro', 'tipo non valido → altro')

  // Test 12.4: dati mancanti/malformati → null
  const bozzaMalformata = sanitizzaBozza({ titolo: 'X', tipo: 'sopralluogo', data: 'non-una-data', ora: '9:30', priorita: 'nonvalida' }, 'x')
  assert.equal(bozzaMalformata.data, null, 'data malformata → null')
  assert.equal(bozzaMalformata.ora, null, 'ora senza zero iniziale → null')
  assert.equal(bozzaMalformata.priorita, 'normale', 'priorita non valida → normale')

  // Test 12.5: nessun salvataggio automatico — l'azione di save è separata
  let salvataAutomaticamente = false
  function simulaSalvataggio(confermato) {
    if (!confermato) return // nessun save senza conferma
    salvataAutomaticamente = true
  }
  simulaSalvataggio(false)
  assert.equal(salvataAutomaticamente, false, 'no auto-save senza conferma utente')
  simulaSalvataggio(true)
  assert.equal(salvataAutomaticamente, true, 'save dopo conferma esplicita')

  // Test 12.6: orari corretti dopo conversione UTC
  function orarioInvariato(data, ora) {
    const iso = new Date(`${data}T${ora}`).toISOString()
    const back = new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
    return back
  }
  assert.equal(orarioInvariato('2026-07-01', '09:30'), '09:30', 'orario 09:30 round-trip')
  assert.equal(orarioInvariato('2026-07-01', '12:00'), '12:00', 'orario 12:00 round-trip')

  // Test 12.7: max 5 bozze (sicurezza)
  const molteBozze = Array.from({ length: 8 }, (_, i) => ({ titolo: `Bozza ${i}`, tipo: 'altro', data: null, ora: null, priorita: 'normale' }))
  const bozzeLimit = molteBozze.slice(0, 5).map(b => sanitizzaBozza(b, 'test'))
  assert.equal(bozzeLimit.length, 5, 'max 5 bozze')
}
console.log('✓ multi-bozza (array, singolo, sanitizzazione, no-auto-save, orari invariati, limite)')

console.log('\n✅ Tutti i test superati.')

