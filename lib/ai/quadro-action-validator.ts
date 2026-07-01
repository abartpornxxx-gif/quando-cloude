import { prisma } from '@/lib/prisma'
import { getAction, isValidActionId } from './actions/registry'
import { canUseAction } from './actions/permissions'
import type { ActionId, ValidationResult } from './actions/types'

export type ValidazioneRisultato = ValidationResult

// ─── Validator centrale — registry-aware ────────────────────────────────────
// Input:  actionId, payload, role
// Output: { valid, reason, field, suggestion, safePayload }

export async function validateAction(
  actionId: string,
  payload: Record<string, unknown>,
  role: string
): Promise<ValidationResult> {
  // 1. actionId valido nel registry
  if (!isValidActionId(actionId)) {
    return { valid: false, reason: `Azione non registrata: ${actionId}` }
  }

  const def = getAction(actionId as ActionId)!

  // 2. Ruolo autorizzato
  if (!canUseAction(role, actionId as ActionId)) {
    return {
      valid: false,
      reason: `Il ruolo "${role}" non può eseguire questa azione.`,
      suggestion: `Azioni disponibili per il ruolo ${role}: ${def.allowedRoles.join(', ')}`,
    }
  }

  // 3. Campi obbligatori presenti
  for (const field of def.requiredFields) {
    const val = payload[field]
    if (val === undefined || val === null || String(val).trim() === '') {
      return {
        valid: false,
        reason: `Campo obbligatorio mancante: ${field}`,
        field,
        suggestion: `Fornisci il campo "${field}" per procedere.`,
      }
    }
  }

  // 4. Validazioni specifiche per azione
  return runActionSpecificValidation(actionId as ActionId, payload, role)
}

// ─── Validazioni specifiche ──────────────────────────────────────────────────

async function runActionSpecificValidation(
  actionId: ActionId,
  payload: Record<string, unknown>,
  role: string
): Promise<ValidationResult> {
  switch (actionId) {

    case 'PROMEMORIA_CREATE':
    case 'FOLLOWUP_CREATE': {
      const dataOra = payload.dataOra ? new Date(String(payload.dataOra)) : null
      if (!dataOra || isNaN(dataOra.getTime())) {
        return { valid: false, reason: 'Data/ora non valida', field: 'dataOra', suggestion: 'Usa il formato ISO 8601, es: 2026-07-02T09:00:00' }
      }
      // commessa opzionale: se fornita deve esistere
      if (payload.commessaId) {
        const c = await prisma.commessa.findUnique({ where: { id: String(payload.commessaId) }, select: { id: true } })
        if (!c) return { valid: false, reason: 'Commessa non trovata', field: 'commessaId' }
      }
      // cliente opzionale: se fornito deve esistere
      if (payload.clienteId) {
        const cl = await prisma.cliente.findUnique({ where: { id: String(payload.clienteId) }, select: { id: true } })
        if (!cl) return { valid: false, reason: 'Cliente non trovato', field: 'clienteId' }
      }
      return { valid: true, safePayload: payload }
    }

    case 'PROMEMORIA_COMPLETE':
    case 'PROMEMORIA_RESCHEDULE': {
      const pid = String(payload.promemoriaId || '')
      const p = await prisma.promemoria.findUnique({ where: { id: pid }, select: { id: true, stato: true } })
      if (!p) return { valid: false, reason: 'Promemoria non trovato', field: 'promemoriaId' }
      if (p.stato === 'completato') return { valid: false, reason: 'Promemoria già completato', field: 'promemoriaId' }
      if (actionId === 'PROMEMORIA_RESCHEDULE') {
        const nuova = new Date(String(payload.nuovaDataOra || ''))
        if (isNaN(nuova.getTime())) return { valid: false, reason: 'Nuova data non valida', field: 'nuovaDataOra' }
      }
      return { valid: true, safePayload: payload }
    }

    case 'RAPPORTINO_LINK_ZONA':
    case 'RAPPORTINO_ADD_NOTA': {
      if (payload.rapportinoId) {
        const r = await prisma.rapportino.findUnique({ where: { id: String(payload.rapportinoId) }, select: { id: true } })
        if (!r) return { valid: false, reason: 'Rapportino non trovato', field: 'rapportinoId' }
      }
      if (actionId === 'RAPPORTINO_LINK_ZONA' && payload.strutturaNodoId && payload.commessaId) {
        const nodo = await prisma.cantiereStrutturaNodo.findUnique({
          where: { id: String(payload.strutturaNodoId) },
          select: { commessaId: true, attivo: true },
        })
        if (!nodo) return { valid: false, reason: 'Zona non trovata', field: 'strutturaNodoId' }
        if (nodo.commessaId !== String(payload.commessaId)) {
          return { valid: false, reason: 'Zona non appartiene a questa commessa', field: 'strutturaNodoId' }
        }
        if (!nodo.attivo) return { valid: false, reason: 'Zona disattivata', field: 'strutturaNodoId' }
      }
      return { valid: true, safePayload: payload }
    }

    case 'MATERIALE_REQUEST_DRAFT':
    case 'MATERIALE_MARK_MANCANTE': {
      const desc = String(payload.descrizione || '').trim()
      if (!desc) return { valid: false, reason: 'Descrizione materiale mancante', field: 'descrizione' }
      if (payload.commessaId) {
        const c = await prisma.commessa.findUnique({ where: { id: String(payload.commessaId) }, select: { id: true } })
        if (!c) return { valid: false, reason: 'Commessa non trovata', field: 'commessaId' }
      }
      return { valid: true, safePayload: payload }
    }

    case 'COMMESSA_CREATE_DRAFT':
    case 'CLIENTE_CREATE_DRAFT': {
      const nome = String(payload.nome || '').trim()
      if (!nome) return { valid: false, reason: 'Nome obbligatorio', field: 'nome' }
      return { valid: true, safePayload: payload }
    }

    case 'COMMESSA_SUMMARY': {
      if (!payload.commessaId) return { valid: false, reason: 'commessaId obbligatorio', field: 'commessaId' }
      const c = await prisma.commessa.findUnique({ where: { id: String(payload.commessaId) }, select: { id: true } })
      if (!c) return { valid: false, reason: 'Commessa non trovata', field: 'commessaId' }
      return { valid: true, safePayload: payload }
    }

    case 'CLIENTE_FIND_OR_SUGGEST': {
      const q = String(payload.query || '').trim()
      if (q.length < 2) return { valid: false, reason: 'Query troppo breve (min 2 caratteri)', field: 'query' }
      return { valid: true, safePayload: payload }
    }

    default:
      return { valid: true, safePayload: payload }
  }
}

// ─── Backward compat: vecchia API ───────────────────────────────────────────

export type AzioneAI =
  | { tipo: 'crea_promemoria'; commessaId?: string; strutturaNodoId?: string; titolo?: string; dataOra?: string }
  | { tipo: 'collega_rapportino_zona'; rapportinoId: string; strutturaNodoId: string; commessaId: string }
  | { tipo: 'crea_nodo_struttura'; commessaId: string; nome?: string }

export async function validaAzioneAI(azione: AzioneAI, ruolo: string): Promise<ValidazioneRisultato> {
  if (azione.tipo === 'crea_promemoria') {
    return validateAction('PROMEMORIA_CREATE', {
      titolo: azione.titolo, dataOra: azione.dataOra,
      commessaId: azione.commessaId, strutturaNodoId: azione.strutturaNodoId,
    }, ruolo)
  }
  if (azione.tipo === 'collega_rapportino_zona') {
    return validateAction('RAPPORTINO_LINK_ZONA', {
      rapportinoId: azione.rapportinoId, strutturaNodoId: azione.strutturaNodoId, commessaId: azione.commessaId,
    }, ruolo)
  }
  if (azione.tipo === 'crea_nodo_struttura') {
    if (!['impresa', 'ufficio'].includes(ruolo)) {
      return { valid: false, reason: 'Ruolo non autorizzato', suggestion: 'Solo impresa e ufficio possono creare zone cantiere.' }
    }
    if (!azione.nome?.trim()) return { valid: false, reason: 'Nome zona mancante', field: 'nome' }
    const commessa = await prisma.commessa.findUnique({ where: { id: azione.commessaId }, select: { id: true } })
    if (!commessa) return { valid: false, reason: 'Commessa non trovata', field: 'commessaId' }
    return { valid: true }
  }
  return { valid: false, reason: 'Tipo azione sconosciuto' }
}

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
  return { nodi: trovati, ambiguo: trovati.length > 1 }
}
