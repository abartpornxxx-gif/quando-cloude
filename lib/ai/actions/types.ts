// ─── QUADRO AI Operating Layer — Types ─────────────────────────────────────

export type RiskLevel   = 'LOW' | 'MEDIUM' | 'HIGH'
export type ActionStatus = 'DRAFT' | 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELLED'

export type ActionId =
  | 'PROMEMORIA_CREATE'
  | 'PROMEMORIA_UPDATE'
  | 'PROMEMORIA_COMPLETE'
  | 'PROMEMORIA_RESCHEDULE'
  | 'FOLLOWUP_CREATE'
  | 'COMMESSA_CREATE_DRAFT'
  | 'COMMESSA_LINK_CLIENTE'
  | 'COMMESSA_LINK_STRUTTURA_NODO'
  | 'RAPPORTINO_CREATE_DRAFT'
  | 'RAPPORTINO_LINK_ZONA'
  | 'RAPPORTINO_ADD_NOTA'
  | 'MATERIALE_REQUEST_DRAFT'
  | 'MATERIALE_MARK_MANCANTE'
  | 'CONTEGGIO_ADD_RIGA_DRAFT'
  | 'CONTEGGIO_LINK_ZONA'
  | 'CLIENTE_FIND_OR_SUGGEST'
  | 'CLIENTE_CREATE_DRAFT'
  | 'DOCUMENTO_REQUEST_DRAFT'
  | 'COMMESSA_SUMMARY'

export interface ActionDefinition {
  actionId: ActionId
  label: string
  description: string
  allowedRoles: string[]
  requiredContext: string[]
  requiredFields: string[]
  riskLevel: RiskLevel
  requiresConfirmation: boolean
  readOnly?: boolean
}

export interface ActionDraft {
  draftId: string          // = AiAuditLog.id
  actionId: ActionId
  label: string
  description: string
  riskLevel: RiskLevel
  requiresConfirmation: boolean
  payload: Record<string, unknown>
  valid: boolean
  validationReason?: string
  validationSuggestion?: string
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  field?: string
  suggestion?: string
  safePayload?: Record<string, unknown>
}

export interface ExecutionResult {
  success: boolean
  recordId?: string
  message: string
  data?: unknown
}
