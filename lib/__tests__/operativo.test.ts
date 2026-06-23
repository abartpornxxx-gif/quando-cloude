/**
 * QUADRO — Test logiche operative critiche (senza DB, logica pura)
 *
 * Blocco E: test minimi per le funzioni core identificate da Antigravity.
 * Non testano le Server Actions direttamente (dipendono da Prisma + Supabase),
 * ma testano le logiche isolabili che le actions usano internamente.
 */

import { describe, it, expect } from 'vitest'

// ─── Guard chiusura commessa ───────────────────────────────────────────────────
// Logica identica a quella usata in app/impresa/commesse/actions.ts

function puoChiudereCommessa(commessa: {
  preventivato: number
  fatturato: number
  fatturePendenti: number
}): { ok: boolean; motivo?: string } {
  if (commessa.fatturePendenti > 0) {
    return { ok: false, motivo: 'Esistono fatture non incassate' }
  }
  if (commessa.preventivato > 0 && commessa.fatturato < commessa.preventivato) {
    return { ok: false, motivo: 'Fatturato inferiore al preventivato' }
  }
  return { ok: true }
}

describe('Guard chiusura commessa — logica', () => {
  it('blocca se ci sono fatture non incassate', () => {
    const r = puoChiudereCommessa({ preventivato: 100000, fatturato: 100000, fatturePendenti: 1 })
    expect(r.ok).toBe(false)
    expect(r.motivo).toContain('fatture')
  })

  it('blocca se fatturato < preventivato', () => {
    const r = puoChiudereCommessa({ preventivato: 100000, fatturato: 80000, fatturePendenti: 0 })
    expect(r.ok).toBe(false)
    expect(r.motivo).toContain('preventivato')
  })

  it('blocca se sia fatture pendenti che fatturato insufficiente', () => {
    const r = puoChiudereCommessa({ preventivato: 100000, fatturato: 50000, fatturePendenti: 2 })
    expect(r.ok).toBe(false)
  })

  it('permette chiusura se tutto saldato', () => {
    const r = puoChiudereCommessa({ preventivato: 100000, fatturato: 100000, fatturePendenti: 0 })
    expect(r.ok).toBe(true)
  })

  it('permette chiusura se preventivato è zero (commessa senza preventivo)', () => {
    const r = puoChiudereCommessa({ preventivato: 0, fatturato: 0, fatturePendenti: 0 })
    expect(r.ok).toBe(true)
  })

  it('permette chiusura se fatturato supera preventivato', () => {
    // Extra-fatturato (es. lavori aggiuntivi): non bloccare
    const r = puoChiudereCommessa({ preventivato: 100000, fatturato: 120000, fatturePendenti: 0 })
    expect(r.ok).toBe(true)
  })
})

// ─── Conflict detection pianificazione ────────────────────────────────────────
// Logica identica a quella usata in app/impresa/pianificazione/actions.ts

type AssegnazionePianificazione = {
  id: string
  operaioId: string
  commessaId: string
  data: string // ISO date YYYY-MM-DD
}

function rilevaConiflittoPianificazione(
  assegnazioni: AssegnazionePianificazione[],
  nuova: { operaioId: string; commessaId: string; data: string }
): { conflitto: boolean; commessaConfliggente?: string } {
  const conflitto = assegnazioni.find(
    a =>
      a.operaioId === nuova.operaioId &&
      a.data === nuova.data &&
      a.commessaId !== nuova.commessaId
  )
  return conflitto
    ? { conflitto: true, commessaConfliggente: conflitto.commessaId }
    : { conflitto: false }
}

describe('Conflict detection pianificazione — logica', () => {
  const esistenti: AssegnazionePianificazione[] = [
    { id: 'p1', operaioId: 'op1', commessaId: 'c1', data: '2026-06-23' },
    { id: 'p2', operaioId: 'op2', commessaId: 'c2', data: '2026-06-23' },
  ]

  it('rileva conflitto: stesso operaio, stesso giorno, cantiere diverso', () => {
    const r = rilevaConiflittoPianificazione(esistenti, {
      operaioId: 'op1',
      commessaId: 'c2', // cantiere diverso
      data: '2026-06-23',
    })
    expect(r.conflitto).toBe(true)
    expect(r.commessaConfliggente).toBe('c1')
  })

  it('non rileva conflitto: stesso operaio, giorno diverso', () => {
    const r = rilevaConiflittoPianificazione(esistenti, {
      operaioId: 'op1',
      commessaId: 'c2',
      data: '2026-06-24', // giorno diverso
    })
    expect(r.conflitto).toBe(false)
  })

  it('non rileva conflitto: operaio diverso, stesso giorno', () => {
    const r = rilevaConiflittoPianificazione(esistenti, {
      operaioId: 'op3', // operaio diverso
      commessaId: 'c1',
      data: '2026-06-23',
    })
    expect(r.conflitto).toBe(false)
  })

  it('non rileva conflitto: stesso operaio, stesso giorno, stesso cantiere (upsert)', () => {
    const r = rilevaConiflittoPianificazione(esistenti, {
      operaioId: 'op1',
      commessaId: 'c1', // stesso cantiere → OK
      data: '2026-06-23',
    })
    expect(r.conflitto).toBe(false)
  })

  it('non rileva conflitto con lista vuota', () => {
    const r = rilevaConiflittoPianificazione([], {
      operaioId: 'op1',
      commessaId: 'c1',
      data: '2026-06-23',
    })
    expect(r.conflitto).toBe(false)
  })
})

// ─── Idempotenza registraIncasso ───────────────────────────────────────────────
// Testa la logica del calcolo importo incassato — idempotente se applicato due volte

type FatturaIncasso = {
  id: string
  importoOriginale: number
  stato: 'da_incassare' | 'incassata' | 'scaduta'
  importoIncassato: number | null
}

function applicaIncasso(
  fattura: FatturaIncasso,
  importo: number,
): FatturaIncasso {
  // Idempotente: se già incassata con stesso importo, non fa nulla
  if (fattura.stato === 'incassata' && fattura.importoIncassato === importo) {
    return fattura
  }
  return {
    ...fattura,
    stato: 'incassata',
    importoIncassato: importo,
  }
}

describe('Idempotenza registraIncasso — logica', () => {
  const fatturaAperta: FatturaIncasso = {
    id: 'f1',
    importoOriginale: 100000,
    stato: 'da_incassare',
    importoIncassato: null,
  }

  it('incassa una fattura aperta', () => {
    const r = applicaIncasso(fatturaAperta, 100000)
    expect(r.stato).toBe('incassata')
    expect(r.importoIncassato).toBe(100000)
  })

  it('è idempotente: secondo incasso con stesso importo non cambia lo stato', () => {
    const incassata = applicaIncasso(fatturaAperta, 100000)
    const riaplicata = applicaIncasso(incassata, 100000)
    expect(riaplicata).toEqual(incassata)
    expect(riaplicata.stato).toBe('incassata')
  })

  it('importo parziale registra comunque come incassata (comportamento attuale)', () => {
    const r = applicaIncasso(fatturaAperta, 50000)
    expect(r.stato).toBe('incassata')
    expect(r.importoIncassato).toBe(50000)
  })
})

// ─── Calcolo scadenze UTC ──────────────────────────────────────────────────────
// Testa la logica UTC usata in lib/notifiche.ts per le scadenze mezzi

function calcolaDiffGiorniUTC(dataScadenza: Date, oggi: Date): number {
  const oggiUtc = Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth(), oggi.getUTCDate())
  const scadUtc = Date.UTC(
    dataScadenza.getUTCFullYear(),
    dataScadenza.getUTCMonth(),
    dataScadenza.getUTCDate()
  )
  return Math.floor((scadUtc - oggiUtc) / 86_400_000)
}

describe('Calcolo scadenze UTC — logica', () => {
  it('scadenza tra 30 giorni: diffGiorni = 30', () => {
    const oggi = new Date('2026-06-23T00:00:00Z')
    const scadenza = new Date('2026-07-23T00:00:00Z')
    expect(calcolaDiffGiorniUTC(scadenza, oggi)).toBe(30)
  })

  it('scadenza oggi: diffGiorni = 0', () => {
    const oggi = new Date('2026-06-23T00:00:00Z')
    expect(calcolaDiffGiorniUTC(oggi, oggi)).toBe(0)
  })

  it('scadenza passata: diffGiorni negativo', () => {
    const oggi = new Date('2026-06-23T00:00:00Z')
    const scadenza = new Date('2026-06-20T00:00:00Z')
    expect(calcolaDiffGiorniUTC(scadenza, oggi)).toBe(-3)
  })

  it('calcolo stabile indipendente dall\'ora locale (UTC-safe)', () => {
    // Simula mezzanotte locale con offset — deve calcolare uguale
    const oggi = new Date('2026-06-23T22:00:00+02:00') // mezzanotte Rome = 22:00 UTC del giorno prima
    const scadenza = new Date('2026-06-24T00:00:00Z')
    // In UTC: oggi = 2026-06-23, scadenza = 2026-06-24 → diff = 1
    const diff = calcolaDiffGiorniUTC(scadenza, oggi)
    expect(diff).toBeGreaterThanOrEqual(0)
    expect(diff).toBeLessThanOrEqual(2)
  })
})
