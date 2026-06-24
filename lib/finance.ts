/**
 * QUADRO — Servizio e helper per il dominio Finance (Single Source of Truth)
 */

export interface ActiveInvoiceLine {
  quantita: number
  prezzoUnitario: number
}

export interface ActiveInvoiceInput {
  id: string
  numero: string
  anno: number
  data: Date | string
  dataScadenza?: Date | string | null
  aliquotaIva: number
  importoIncassato?: number | null
  stato: string
  righe: ActiveInvoiceLine[]
}

export interface PassiveInvoiceInput {
  id: string
  numero?: string | null
  data: Date | string
  dataScadenza?: Date | string | null
  importo: number
  importoPagato?: number | null
  stato: string
}

export interface CommessaInput {
  preventivato: number
  costiManodopera: number
  costiMezzi: number
  costiMateriali: number // Usato come fallback se non ci sono fatture passive
}

/**
 * Calcola i totali di una fattura attiva a partire dalle sue righe.
 * Restituisce imponibile, IVA e importo totale comprensivo di IVA (in centesimi).
 */
export function calculateActiveInvoiceTotals(
  righe: ActiveInvoiceLine[],
  aliquotaIva: number
) {
  const imponibile = righe.reduce(
    (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
    0
  )
  const iva = Math.round((imponibile * aliquotaIva) / 100)
  const totalAmount = imponibile + iva
  return { imponibile, iva, totalAmount }
}

/**
 * Calcola gli importi (totale, pagato/incassato e residuo) per qualsiasi fattura (attiva o passiva).
 */
export function getInvoiceAmounts(
  invoice:
    | { type: 'attiva'; aliquotaIva: number; importoIncassato?: number | null; righe: ActiveInvoiceLine[] }
    | { type: 'passiva'; importo: number; importoPagato?: number | null }
) {
  if (invoice.type === 'attiva') {
    const { totalAmount } = calculateActiveInvoiceTotals(
      invoice.righe || [],
      invoice.aliquotaIva
    )
    const paidOrCollectedAmount = invoice.importoIncassato ?? 0
    const residualAmount = Math.max(0, totalAmount - paidOrCollectedAmount)
    return {
      totalAmount,
      paidOrCollectedAmount,
      residualAmount,
    }
  } else {
    const totalAmount = invoice.importo
    const paidOrCollectedAmount = invoice.importoPagato ?? 0
    const residualAmount = Math.max(0, totalAmount - paidOrCollectedAmount)
    return {
      totalAmount,
      paidOrCollectedAmount,
      residualAmount,
    }
  }
}

/**
 * Deriva lo stato visualizzato di una fattura.
 * Risolve l'incoerenza tra attive e passive calcolando lo stato sulla base del residuo e della scadenza.
 */
export function deriveInvoiceStatus(params: {
  type: 'attiva' | 'passiva'
  totalAmount: number
  paidOrCollectedAmount: number
  dataScadenza?: Date | string | null
  referenceDate?: Date
}) {
  const { totalAmount, paidOrCollectedAmount, dataScadenza } = params
  const isPaid = paidOrCollectedAmount >= totalAmount
  const isPartial = paidOrCollectedAmount > 0 && paidOrCollectedAmount < totalAmount

  const refDate = params.referenceDate || new Date()
  refDate.setHours(0, 0, 0, 0)
  const refTime = refDate.getTime()

  let isOverdue = false
  if (dataScadenza) {
    const dScad = new Date(dataScadenza)
    dScad.setHours(0, 0, 0, 0)
    isOverdue = dScad.getTime() < refTime
  }

  if (params.type === 'attiva') {
    if (isPaid) return 'incassata'
    if (isOverdue) return 'scaduta'
    if (isPartial) return 'parzialmente_incassata'
    return 'da_incassare'
  } else {
    if (isPaid) return 'pagata'
    if (isOverdue) return 'scaduta' // Per renderizzazione e scadenzario
    if (isPartial) return 'parzialmente_pagata'
    return 'da_pagare'
  }
}

/**
 * Determina se una scadenza è aperta (residuo > 0).
 */
export function isDeadlineOpen(residualAmount: number): boolean {
  return residualAmount > 0
}

export interface GiornataInput {
  ore: { tipo: string; quantita: number }[]
  operaio: { costoOrario: number }
}

export interface VarianteInput {
  importo: number
  costoStimato: number
  stato: string
}

/**
 * Calcola tutti gli aggregati finanziari per una commessa.
 */
export function calculateCommessaAggregates(
  commessa: CommessaInput,
  fattureAttive: ActiveInvoiceInput[],
  fatturePassive: { importo: number; importoPagato?: number | null }[],
  giornate?: GiornataInput[] | null,
  varianti?: VarianteInput[] | null
) {
  let fatturato = 0
  let incassato = 0
  let incassatoNett = 0
  let daIncassare = 0

  for (const f of fattureAttive) {
    const { imponibile, totalAmount } = calculateActiveInvoiceTotals(f.righe, f.aliquotaIva)
    const collected = f.importoIncassato ?? 0
    fatturato += imponibile
    incassato += collected
    daIncassare += Math.max(0, totalAmount - collected)
    
    // Calcola la quota imponibile dell'incassato
    if (totalAmount > 0) {
      incassatoNett += Math.round((collected * imponibile) / totalAmount)
    }
  }

  let costiFornitori = 0
  let costiFornitoriPagati = 0
  let costiFornitoriDaPagare = 0

  for (const f of fatturePassive) {
    const tot = f.importo
    const pag = f.importoPagato ?? 0
    costiFornitori += tot
    costiFornitoriPagati += pag
    costiFornitoriDaPagare += Math.max(0, tot - pag)
  }

  // Costi manodopera dinamici
  let costiManodopera = commessa.costiManodopera
  if (giornate && giornate.length > 0) {
    const dinamici = giornate.reduce((sum, g) => {
      const oreOrd = g.ore.filter(o => o.tipo === 'ordinaria').reduce((acc, o) => acc + o.quantita, 0)
      const oreStr = g.ore.filter(o => o.tipo === 'straordinaria').reduce((acc, o) => acc + o.quantita, 0)
      const costoOrario = g.operaio?.costoOrario ?? 0
      return sum + Math.round(oreOrd * costoOrario + oreStr * costoOrario * 1.5)
    }, 0)
    if (dinamici > 0) {
      costiManodopera = dinamici
    }
  }

  // Varianti approvate
  let totaleVariantiApprovate = 0
  let costoStimatoVarianti = 0
  if (varianti && varianti.length > 0) {
    for (const v of varianti) {
      if (v.stato === 'approvata') {
        totaleVariantiApprovate += v.importo
        costoStimatoVarianti += v.costoStimato
      }
    }
  }

  const preventivato = commessa.preventivato + totaleVariantiApprovate
  const daFatturare = Math.max(0, preventivato - fatturato)
  const costiMezzi = commessa.costiMezzi

  // Se non ci sono fatture passive, usiamo il costoMateriali di fallback
  const costiMaterialiEffettivi = costiFornitori > 0 ? costiFornitori : commessa.costiMateriali
  const costiTotali = costiMaterialiEffettivi + costiManodopera + costiMezzi + costoStimatoVarianti

  const margineStimato = preventivato - costiTotali
  const margineMaturato = fatturato - costiTotali
  const margineIncassato = incassatoNett - costiTotali

  return {
    preventivato,
    fatturato,
    daFatturare,
    incassato,
    incassatoNett,
    daIncassare,
    costiFornitori,
    costiFornitoriPagati,
    costiFornitoriDaPagare,
    costiManodopera,
    costiMezzi,
    costiTotali,
    margineStimato,
    margineMaturato,
    margineIncassato,
    totaleVariantiApprovate,
    costoStimatoVarianti,
  }
}
