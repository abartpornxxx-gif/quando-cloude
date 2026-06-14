import { describe, it, expect } from 'vitest'
import { calcolaTotalePreventivo, calcolaMargine, percentualeAvanzamento } from '../calcoli'

// ─── calcolaTotalePreventivo ────────────────────────────────────────────────

describe('calcolaTotalePreventivo', () => {
  it('somma quantità × prezzo unitario per ogni riga', () => {
    const righe = [
      { quantita: 2, prezzoUnitario: 1000 },  // 2 × €10.00 = €20.00
      { quantita: 1, prezzoUnitario: 500 },   // 1 × €5.00  = €5.00
    ]
    expect(calcolaTotalePreventivo(righe)).toBe(2500) // €25.00 in centesimi
  })

  it('restituisce 0 per lista vuota', () => {
    expect(calcolaTotalePreventivo([])).toBe(0)
  })

  it('gestisce quantità decimali (1.5 ore × €20.00)', () => {
    const righe = [{ quantita: 1.5, prezzoUnitario: 2000 }]
    expect(calcolaTotalePreventivo(righe)).toBe(3000) // €30.00
  })

  it('arrotonda correttamente i centesimi', () => {
    // 3 × €0.67 = €2.01 → 201 centesimi
    const righe = [{ quantita: 3, prezzoUnitario: 67 }]
    expect(calcolaTotalePreventivo(righe)).toBe(201)
  })
})

// ─── preventivo → commessa ───────────────────────────────────────────────────

describe('trasformazione preventivo → commessa (logica)', () => {
  it('il totale del preventivo diventa il preventivato della commessa', () => {
    const righe = [
      { quantita: 10, prezzoUnitario: 5000 }, // 10 × €50 = €500
      { quantita: 2, prezzoUnitario: 25000 }, // 2  × €250 = €500
    ]
    const totale = calcolaTotalePreventivo(righe)
    expect(totale).toBe(100000) // €1.000,00

    // La commessa eredita questo valore come preventivato
    const commessa = {
      preventivato: totale,
      costiMateriali: 0,
      costiManodopera: 0,
      costiMezzi: 0,
      fatturato: 0,
    }
    // MARGINE = fatturato − (costiMateriali + costiManodopera + costiMezzi)
    // Con tutti i valori a 0 il margine è 0 (la commessa non ha ancora costi né fatturato)
    expect(calcolaMargine(commessa)).toBe(0)
  })
})

// ─── calcolaMargine ──────────────────────────────────────────────────────────

describe('calcolaMargine', () => {
  it('fatturato − (materiali + manodopera + mezzi)', () => {
    const commessa = {
      fatturato: 100000,
      costiMateriali: 20000,
      costiManodopera: 30000,
      costiMezzi: 5000,
    }
    expect(calcolaMargine(commessa)).toBe(45000) // €450,00
  })

  it('il margine può essere negativo', () => {
    const commessa = { fatturato: 10000, costiMateriali: 50000, costiManodopera: 0, costiMezzi: 0 }
    expect(calcolaMargine(commessa)).toBe(-40000)
  })

  it('margine zero se fatturato uguale ai costi', () => {
    const commessa = { fatturato: 10000, costiMateriali: 5000, costiManodopera: 3000, costiMezzi: 2000 }
    expect(calcolaMargine(commessa)).toBe(0)
  })
})

// ─── percentualeAvanzamento ───────────────────────────────────────────────────

describe('percentualeAvanzamento', () => {
  it('calcola fatturato / preventivato × 100', () => {
    expect(percentualeAvanzamento({ fatturato: 50000, preventivato: 100000 })).toBe(50)
  })

  it('non supera 100%', () => {
    expect(percentualeAvanzamento({ fatturato: 200000, preventivato: 100000 })).toBe(100)
  })

  it('restituisce 0 se preventivato è zero', () => {
    expect(percentualeAvanzamento({ fatturato: 5000, preventivato: 0 })).toBe(0)
  })
})
