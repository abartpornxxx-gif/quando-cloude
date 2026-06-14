const FMT = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

/** Converte centesimi → stringa euro formattata ("€ 1.250,00") */
export function formatEuro(cents: number): string {
  return FMT.format(cents / 100)
}

/** Converte stringa euro ("1250.00" o "1250,00") → centesimi */
export function euroToCents(value: string): number {
  const n = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

/** Centesimi → stringa con 2 decimali per gli <input> ("1250.00") */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** Formatta una data ISO in formato italiano "gg/mm/aaaa" */
export function formatData(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('it-IT').format(new Date(date))
}

/** ISO string → "yyyy-MM-dd" per gli <input type="date"> */
export function dateToInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}
