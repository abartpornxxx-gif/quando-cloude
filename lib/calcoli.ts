/** Calcola il totale di un preventivo sommando quantità × prezzo per ogni riga (in centesimi) */
export function calcolaTotalePreventivo(
  righe: Array<{ quantita: number; prezzoUnitario: number }>
): number {
  return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
}

/** Calcola il margine di una commessa: fatturato − (materiali + manodopera + mezzi) */
export function calcolaMargine(commessa: {
  fatturato: number
  costiMateriali: number
  costiManodopera: number
  costiMezzi: number
}): number {
  return (
    commessa.fatturato -
    (commessa.costiMateriali + commessa.costiManodopera + commessa.costiMezzi)
  )
}

/** Percentuale avanzamento: fatturato / preventivato × 100 (0–100) */
export function percentualeAvanzamento(commessa: {
  fatturato: number
  preventivato: number
}): number {
  if (commessa.preventivato === 0) return 0
  return Math.min(100, Math.round((commessa.fatturato / commessa.preventivato) * 100))
}
