import { describe, it, expect } from 'vitest'
import {
  calculateActiveInvoiceTotals,
  getInvoiceAmounts,
  deriveInvoiceStatus,
  isDeadlineOpen,
  calculateCommessaAggregates,
} from '../finance'

describe('Finance Domain Unit Tests', () => {
  describe('calculateActiveInvoiceTotals', () => {
    it('should correctly sum lines and apply IVA', () => {
      const righe = [
        { quantita: 2, prezzoUnitario: 5000 }, // 100.00 EUR
        { quantita: 1.5, prezzoUnitario: 10000 }, // 150.00 EUR
      ]
      const { imponibile, iva, totalAmount } = calculateActiveInvoiceTotals(righe, 22)
      expect(imponibile).toBe(25000)
      expect(iva).toBe(5500)
      expect(totalAmount).toBe(30500)
    })

    it('should return zero when no lines are present', () => {
      const { imponibile, iva, totalAmount } = calculateActiveInvoiceTotals([], 22)
      expect(imponibile).toBe(0)
      expect(iva).toBe(0)
      expect(totalAmount).toBe(0)
    })
  })

  describe('getInvoiceAmounts', () => {
    it('should return amounts for active invoices', () => {
      const invoice = {
        type: 'attiva' as const,
        aliquotaIva: 22,
        importoIncassato: 10000,
        righe: [{ quantita: 1, prezzoUnitario: 20000 }],
      }
      const { totalAmount, paidOrCollectedAmount, residualAmount } = getInvoiceAmounts(invoice)
      expect(totalAmount).toBe(24400) // 20000 + 4400 IVA
      expect(paidOrCollectedAmount).toBe(10000)
      expect(residualAmount).toBe(14400)
    })

    it('should return amounts for passive invoices', () => {
      const invoice = {
        type: 'passiva' as const,
        importo: 5000,
        importoPagato: 1000,
      }
      const { totalAmount, paidOrCollectedAmount, residualAmount } = getInvoiceAmounts(invoice)
      expect(totalAmount).toBe(5000)
      expect(paidOrCollectedAmount).toBe(1000)
      expect(residualAmount).toBe(4000)
    })
  })

  describe('deriveInvoiceStatus', () => {
    const dataScadenzaPassata = new Date('2026-06-01')
    const dataScadenzaFutura = new Date('2026-07-01')
    const referenceDate = new Date('2026-06-15')

    it('should derive correct statuses for active invoices', () => {
      // 1. Incassata
      expect(
        deriveInvoiceStatus({
          type: 'attiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 10000,
        })
      ).toBe('incassata')

      // 2. Scaduta
      expect(
        deriveInvoiceStatus({
          type: 'attiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 5000,
          dataScadenza: dataScadenzaPassata,
          referenceDate,
        })
      ).toBe('scaduta')

      // 3. Parzialmente incassata
      expect(
        deriveInvoiceStatus({
          type: 'attiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 5000,
          dataScadenza: dataScadenzaFutura,
          referenceDate,
        })
      ).toBe('parzialmente_incassata')

      // 4. Da incassare
      expect(
        deriveInvoiceStatus({
          type: 'attiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 0,
          dataScadenza: dataScadenzaFutura,
          referenceDate,
        })
      ).toBe('da_incassare')
    })

    it('should derive correct statuses for passive invoices', () => {
      // 1. Pagata
      expect(
        deriveInvoiceStatus({
          type: 'passiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 10000,
        })
      ).toBe('pagata')

      // 2. Scaduta (overdue debito)
      expect(
        deriveInvoiceStatus({
          type: 'passiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 5000,
          dataScadenza: dataScadenzaPassata,
          referenceDate,
        })
      ).toBe('scaduta')

      // 3. Parzialmente pagata
      expect(
        deriveInvoiceStatus({
          type: 'passiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 2000,
          dataScadenza: dataScadenzaFutura,
          referenceDate,
        })
      ).toBe('parzialmente_pagata')

      // 4. Da pagare
      expect(
        deriveInvoiceStatus({
          type: 'passiva',
          totalAmount: 10000,
          paidOrCollectedAmount: 0,
          dataScadenza: dataScadenzaFutura,
          referenceDate,
        })
      ).toBe('da_pagare')
    })
  })

  describe('isDeadlineOpen', () => {
    it('should return true when residualAmount > 0', () => {
      expect(isDeadlineOpen(100)).toBe(true)
      expect(isDeadlineOpen(0)).toBe(false)
    })
  })

  describe('calculateCommessaAggregates', () => {
    const commessa = {
      preventivato: 500000, // 5000 EUR
      costiManodopera: 100000,
      costiMezzi: 50000,
      costiMateriali: 80000,
    }

    const fattureAttive = [
      {
        id: '1',
        numero: '1',
        anno: 2026,
        data: '2026-06-10',
        aliquotaIva: 22,
        importoIncassato: 122000, // 1000 EUR + 220 EUR IVA
        stato: 'parzialmente_incassata',
        righe: [{ quantita: 2, prezzoUnitario: 100000 }], // 2000 EUR imponibile
      },
    ]

    const fatturePassive = [
      {
        importo: 60000, // 600 EUR
        importoPagato: 20000, // 200 EUR
      },
    ]

    const giornate = [
      {
        ore: [{ tipo: 'ordinaria', quantita: 8 }, { tipo: 'straordinaria', quantita: 2 }],
        operaio: { costoOrario: 2000 }, // 20 EUR/h
      },
    ]

    const varianti = [
      {
        importo: 100000, // 1000 EUR
        costoStimato: 40000, // 400 EUR
        stato: 'approvata',
      },
      {
        importo: 50000,
        costoStimato: 20000,
        stato: 'bozza', // Non approvata, ignorata
      },
    ]

    it('should correctly calculate aggregates including labour rates, variants, net collections, and margins', () => {
      const res = calculateCommessaAggregates(
        commessa,
        fattureAttive,
        fatturePassive,
        giornate,
        varianti
      )

      // Preventivato: base (5000) + variante approvata (1000) = 6000 EUR (600000)
      expect(res.preventivato).toBe(600000)

      // Fatturato (imponibile delle fatture attive): 2000 EUR (200000)
      expect(res.fatturato).toBe(200000)

      // Da fatturare: preventivato (6000) - fatturato (2000) = 4000 EUR (400000)
      expect(res.daFatturare).toBe(400000)

      // Costi manodopera dinamici: 8h * 20 EUR + 2h * 20 EUR * 1.5 = 160 + 60 = 220 EUR (22000)
      expect(res.costiManodopera).toBe(22000)

      // Costi materiali (da fatture passive): 600 EUR (60000)
      expect(res.costiFornitori).toBe(60000)

      // Costi totali: fornitori (600) + manodopera (220) + mezzi (500) + costo varianti (400) = 1720 EUR (172000)
      expect(res.costiTotali).toBe(172000)

      // Margine stimato: preventivato (6000) - costi totali (1720) = 4280 EUR (428000)
      expect(res.margineStimato).toBe(428000)

      // Margine maturato: fatturato (2000) - costi totali (1720) = 280 EUR (28000)
      expect(res.margineMaturato).toBe(28000)
    })
  })
})
