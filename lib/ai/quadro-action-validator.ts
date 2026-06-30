import { prisma } from '@/lib/prisma'

export type ValidazioneRisultato = {
  valid: boolean
  reason?: string
  campoDaCorreggere?: string
  suggerimento?: string
}

export type AzioneAI =
  | { tipo: 'crea_promemoria'; commessaId?: string; strutturaNodoId?: string; titolo?: string; dataOra?: string }
  | { tipo: 'collega_rapportino_zona'; rapportinoId: string; strutturaNodoId: string; commessaId: string }
  | { tipo: 'crea_nodo_struttura'; commessaId: string; nome?: string }

/**
 * Validator deterministico (no AI call) per azioni proposte dall'AI.
 * Verifica coerenza dati prima di qualsiasi save.
 */
export async function validaAzioneAI(
  azione: AzioneAI,
  ruolo: string
): Promise<ValidazioneRisultato> {

  if (azione.tipo === 'crea_promemoria') {
    if (!azione.titolo?.trim()) {
      return { valid: false, reason: 'Titolo mancante', campoDaCorreggere: 'titolo', suggerimento: 'Inserisci un titolo per il promemoria.' }
    }
    if (!azione.dataOra) {
      return { valid: false, reason: 'Data mancante', campoDaCorreggere: 'dataOra', suggerimento: 'Specifica la data e l\'ora del promemoria.' }
    }
    // Verifica commessa se fornita
    if (azione.commessaId) {
      const commessa = await prisma.commessa.findUnique({ where: { id: azione.commessaId }, select: { id: true } })
      if (!commessa) {
        return { valid: false, reason: 'Commessa non trovata', campoDaCorreggere: 'commessaId', suggerimento: 'La commessa indicata non esiste.' }
      }
    }
    // Verifica zona se fornita
    if (azione.strutturaNodoId && azione.commessaId) {
      const nodo = await prisma.cantiereStrutturaNodo.findUnique({
        where: { id: azione.strutturaNodoId },
        select: { commessaId: true, attivo: true },
      })
      if (!nodo) {
        return { valid: false, reason: 'Zona non trovata', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'Seleziona manualmente la zona o crea una nuova zona.' }
      }
      if (nodo.commessaId !== azione.commessaId) {
        return { valid: false, reason: 'Zona non appartiene a questa commessa', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'La zona indicata appartiene a un\'altra commessa.' }
      }
      if (!nodo.attivo) {
        return { valid: false, reason: 'Zona disattivata', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'La zona selezionata è disattivata. Scegline un\'altra.' }
      }
    }
    return { valid: true }
  }

  if (azione.tipo === 'collega_rapportino_zona') {
    if (!['impresa', 'ufficio', 'operaio'].includes(ruolo)) {
      return { valid: false, reason: 'Ruolo non autorizzato', suggerimento: 'Solo impresa, ufficio e operaio possono collegare zone ai rapportini.' }
    }
    const nodo = await prisma.cantiereStrutturaNodo.findUnique({
      where: { id: azione.strutturaNodoId },
      select: { commessaId: true, attivo: true },
    })
    if (!nodo) {
      return { valid: false, reason: 'Zona non trovata', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'Seleziona manualmente la zona o crea una nuova zona.' }
    }
    if (nodo.commessaId !== azione.commessaId) {
      return { valid: false, reason: 'Zona non coerente con la commessa', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'La zona indicata appartiene a un\'altra commessa.' }
    }
    if (!nodo.attivo) {
      return { valid: false, reason: 'Zona disattivata', campoDaCorreggere: 'strutturaNodoId', suggerimento: 'La zona selezionata è disattivata. Scegline un\'altra.' }
    }
    return { valid: true }
  }

  if (azione.tipo === 'crea_nodo_struttura') {
    if (!['impresa', 'ufficio'].includes(ruolo)) {
      return { valid: false, reason: 'Ruolo non autorizzato', suggerimento: 'Solo impresa e ufficio possono creare zone cantiere.' }
    }
    if (!azione.nome?.trim()) {
      return { valid: false, reason: 'Nome zona mancante', campoDaCorreggere: 'nome', suggerimento: 'Inserisci un nome per la zona.' }
    }
    const commessa = await prisma.commessa.findUnique({ where: { id: azione.commessaId }, select: { id: true } })
    if (!commessa) {
      return { valid: false, reason: 'Commessa non trovata', campoDaCorreggere: 'commessaId', suggerimento: 'La commessa indicata non esiste.' }
    }
    return { valid: true }
  }

  return { valid: false, reason: 'Tipo azione sconosciuto' }
}

/**
 * Suggerisce nodi struttura corrispondenti a un testo libero.
 * Usato dall'AI per proporre zone senza hardcodare logica fuzzy nel prompt.
 */
export async function suggerisciNodoDaTestoLibero(
  testo: string,
  commessaId: string
): Promise<{ nodi: { id: string; nome: string; tipo: string }[]; ambiguo: boolean }> {
  const nodi = await prisma.cantiereStrutturaNodo.findMany({
    where: { commessaId, attivo: true },
    select: { id: true, nome: true, tipo: true },
    orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
  })

  const testoNorm = testo.toLowerCase()
  const trovati = nodi.filter(n => {
    const nomeNorm = n.nome.toLowerCase()
    return nomeNorm.includes(testoNorm) || testoNorm.includes(nomeNorm)
  })

  return {
    nodi: trovati,
    ambiguo: trovati.length > 1,
  }
}
