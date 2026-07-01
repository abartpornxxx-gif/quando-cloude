import type { ActionDefinition, ActionId } from './types'

// ─── QUADRO AI Action Registry ───────────────────────────────────────────────
// Ogni azione che l'AI può PROPORRE (mai eseguire direttamente senza conferma).

const REGISTRY: Record<ActionId, ActionDefinition> = {

  // ── PROMEMORIA ─────────────────────────────────────────────────────────────

  PROMEMORIA_CREATE: {
    actionId: 'PROMEMORIA_CREATE',
    label: 'Crea promemoria',
    description: 'Crea uno o più promemoria a partire da testo libero.',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: [],
    requiredFields: ['titolo', 'dataOra'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  PROMEMORIA_UPDATE: {
    actionId: 'PROMEMORIA_UPDATE',
    label: 'Modifica promemoria',
    description: 'Modifica titolo, data, orario o note di un promemoria esistente.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['promemoriaId'],
    requiredFields: ['promemoriaId'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  PROMEMORIA_COMPLETE: {
    actionId: 'PROMEMORIA_COMPLETE',
    label: 'Segna completato',
    description: 'Marca un promemoria come completato.',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: ['promemoriaId'],
    requiredFields: ['promemoriaId'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  PROMEMORIA_RESCHEDULE: {
    actionId: 'PROMEMORIA_RESCHEDULE',
    label: 'Rimanda promemoria',
    description: 'Sposta un promemoria a una nuova data/ora.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['promemoriaId'],
    requiredFields: ['promemoriaId', 'nuovaDataOra'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  FOLLOWUP_CREATE: {
    actionId: 'FOLLOWUP_CREATE',
    label: 'Crea follow-up',
    description: 'Crea un promemoria di follow-up collegato a un cliente o commessa.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: [],
    requiredFields: ['titolo', 'dataOra'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  // ── COMMESSA ────────────────────────────────────────────────────────────────

  COMMESSA_CREATE_DRAFT: {
    actionId: 'COMMESSA_CREATE_DRAFT',
    label: 'Bozza commessa',
    description: 'Prepara una bozza di nuova commessa da revisionare prima della creazione.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: [],
    requiredFields: ['nome'],
    riskLevel: 'HIGH',
    requiresConfirmation: true,
  },

  COMMESSA_LINK_CLIENTE: {
    actionId: 'COMMESSA_LINK_CLIENTE',
    label: 'Collega cliente a commessa',
    description: 'Associa un cliente a una commessa esistente.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['commessaId'],
    requiredFields: ['commessaId', 'clienteId'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  COMMESSA_LINK_STRUTTURA_NODO: {
    actionId: 'COMMESSA_LINK_STRUTTURA_NODO',
    label: 'Collega zona',
    description: 'Collega una zona del cantiere a una risorsa della commessa.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['commessaId'],
    requiredFields: ['commessaId', 'strutturaNodoId'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  COMMESSA_SUMMARY: {
    actionId: 'COMMESSA_SUMMARY',
    label: 'Riepilogo commessa',
    description: 'Produce una sintesi operativa della commessa: cosa manca, adempimenti aperti, materiali, prossimi passi.',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: ['commessaId'],
    requiredFields: ['commessaId'],
    riskLevel: 'LOW',
    requiresConfirmation: false,
    readOnly: true,
  },

  // ── RAPPORTINO ──────────────────────────────────────────────────────────────

  RAPPORTINO_CREATE_DRAFT: {
    actionId: 'RAPPORTINO_CREATE_DRAFT',
    label: 'Bozza rapportino',
    description: 'Crea una bozza di rapportino da testo libero (lavorazioni, zone, note).',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: [],
    requiredFields: ['lavoroEseguito'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  RAPPORTINO_LINK_ZONA: {
    actionId: 'RAPPORTINO_LINK_ZONA',
    label: 'Collega zona al rapportino',
    description: 'Associa una zona del cantiere a un rapportino esistente.',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: ['rapportinoId', 'commessaId'],
    requiredFields: ['rapportinoId', 'strutturaNodoId', 'commessaId'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  RAPPORTINO_ADD_NOTA: {
    actionId: 'RAPPORTINO_ADD_NOTA',
    label: 'Aggiungi nota al rapportino',
    description: 'Aggiunge una nota operativa a un rapportino.',
    allowedRoles: ['impresa', 'ufficio', 'operaio'],
    requiredContext: ['rapportinoId'],
    requiredFields: ['rapportinoId', 'nota'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  // ── MATERIALI ───────────────────────────────────────────────────────────────

  MATERIALE_REQUEST_DRAFT: {
    actionId: 'MATERIALE_REQUEST_DRAFT',
    label: 'Richiesta materiale',
    description: 'Prepara una richiesta di materiale per il magazzino, con quantità e urgenza.',
    allowedRoles: ['impresa', 'ufficio', 'operaio', 'magazziniere'],
    requiredContext: [],
    requiredFields: ['descrizione'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  MATERIALE_MARK_MANCANTE: {
    actionId: 'MATERIALE_MARK_MANCANTE',
    label: 'Segnala materiale mancante',
    description: 'Crea una nota urgente per materiale mancante in cantiere.',
    allowedRoles: ['impresa', 'ufficio', 'operaio', 'magazziniere'],
    requiredContext: [],
    requiredFields: ['descrizione'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  // ── CONTEGGIO ───────────────────────────────────────────────────────────────

  CONTEGGIO_ADD_RIGA_DRAFT: {
    actionId: 'CONTEGGIO_ADD_RIGA_DRAFT',
    label: 'Aggiungi riga conteggio',
    description: 'Aggiunge una riga a un conteggio cantiere da testo libero.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['commessaId'],
    requiredFields: ['descrizione', 'quantita'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },

  CONTEGGIO_LINK_ZONA: {
    actionId: 'CONTEGGIO_LINK_ZONA',
    label: 'Collega conteggio a zona',
    description: 'Associa un conteggio a una zona specifica del cantiere.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: ['commessaId'],
    requiredFields: ['conteggioId', 'strutturaNodoId'],
    riskLevel: 'LOW',
    requiresConfirmation: true,
  },

  // ── CLIENTE ─────────────────────────────────────────────────────────────────

  CLIENTE_FIND_OR_SUGGEST: {
    actionId: 'CLIENTE_FIND_OR_SUGGEST',
    label: 'Trova cliente',
    description: 'Cerca un cliente esistente nel sistema per nome o contatto.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: [],
    requiredFields: ['query'],
    riskLevel: 'LOW',
    requiresConfirmation: false,
    readOnly: true,
  },

  CLIENTE_CREATE_DRAFT: {
    actionId: 'CLIENTE_CREATE_DRAFT',
    label: 'Bozza cliente',
    description: 'Prepara una bozza di nuovo cliente da revisionare prima della creazione.',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: [],
    requiredFields: ['nome'],
    riskLevel: 'HIGH',
    requiresConfirmation: true,
  },

  // ── DOCUMENTI ───────────────────────────────────────────────────────────────

  DOCUMENTO_REQUEST_DRAFT: {
    actionId: 'DOCUMENTO_REQUEST_DRAFT',
    label: 'Richiesta documento',
    description: 'Prepara una richiesta di documento (DiCo, dichiarazione, certificato).',
    allowedRoles: ['impresa', 'ufficio'],
    requiredContext: [],
    requiredFields: ['tipoDocumento'],
    riskLevel: 'MEDIUM',
    requiresConfirmation: true,
  },
}

export function getAction(actionId: ActionId): ActionDefinition | undefined {
  return REGISTRY[actionId]
}

export function getAllActions(): ActionDefinition[] {
  return Object.values(REGISTRY)
}

export function getActionsForRole(role: string): ActionDefinition[] {
  return Object.values(REGISTRY).filter(a => a.allowedRoles.includes(role))
}

export function isValidActionId(id: string): id is ActionId {
  return id in REGISTRY
}
