import type { ActionId } from './types'
import { getActionsForRole } from './registry'

// ─── QUADRO AI — Permessi per ruolo ─────────────────────────────────────────

export const ROLE_CAPABILITIES: Record<string, string> = {
  impresa:      'Accesso completo: commesse, promemoria, clienti, documenti, rapportini, materiali, conteggi, audit.',
  ufficio:      'Promemoria, clienti, documenti, bozze commesse/preventivi, rapportini. No azioni distruttive.',
  operaio:      'Rapportini, note cantiere, materiali mancanti, promemoria assegnati. No contabilità, no commesse definitive.',
  magazziniere: 'Materiali, richieste urgenti, zona/commessa necessaria. No dati economici.',
  cliente:      'Solo dati approvati della propria commessa. No note interne, no costi, no margini, no audit.',
  libero:       'Interventi propri, clienti propri, preventivi propri.',
}

// Cosa l'AI NON PUÒ MAI FARE, indipendentemente dal ruolo
export const AI_HARD_LIMITS = [
  'Eseguire azioni DB senza conferma umana esplicita.',
  'Mostrare token, password, chiavi API, DATABASE_URL o dati di autenticazione.',
  'Accedere a dati di altre aziende (multi-tenancy non ancora attiva).',
  'Cancellare record (solo bozze di aggiornamento stato).',
  'Modificare ruoli utente o permessi.',
  'Esporre margini, costi interni o dati finanziari al ruolo cliente.',
  'Esporre dati di operai o note interne al ruolo cliente.',
  'Inventare ID di commesse, clienti, operai, zone.',
  'Eseguire azioni su commesse a cui l\'utente non ha accesso.',
  'Bypassare il validator anche se il confidence è alto.',
]

export function canUseAction(role: string, actionId: ActionId): boolean {
  const actions = getActionsForRole(role)
  return actions.some(a => a.actionId === actionId)
}

export function getReadablePermissions(role: string): string[] {
  return getActionsForRole(role).map(a => `${a.actionId}: ${a.description}`)
}

// Azioni di sola lettura (non modificano il DB, non richiedono conferma)
export const READ_ONLY_ACTIONS: ActionId[] = [
  'COMMESSA_SUMMARY',
  'CLIENTE_FIND_OR_SUGGEST',
]
