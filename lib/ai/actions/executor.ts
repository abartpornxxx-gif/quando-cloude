import { prisma } from '@/lib/prisma'
import type { ActionId, ExecutionResult } from './types'
import { isValidActionId, getAction } from './registry'

// ─── QUADRO AI Executor ──────────────────────────────────────────────────────
// Esegue SOLO azioni registrate nel registry, SOLO dopo conferma umana.
// Ogni esecuzione aggiorna l'AiAuditLog.

/**
 * Parse una stringa data/ora considerandola in ora italiana (Europe/Rome).
 * Se la stringa ha già timezone (Z o ±HH:MM) la usa direttamente.
 * Se è senza timezone (come restituisce il modello AI o l'input datetime-local),
 * la interpreta come ora italiana e converte in UTC per la memorizzazione.
 */
function parseItalianDateTime(rawStr: string): Date {
  if (!rawStr) return new Date(NaN)
  // Ha già timezone esplicito → parse diretto
  if (/[Zz]$/.test(rawStr) || /[+-]\d{2}:\d{2}$/.test(rawStr)) {
    return new Date(rawStr)
  }
  // Senza timezone: aggiunge l'offset corrente di Europe/Rome
  const tzValue = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Rome', timeZoneName: 'shortOffset',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = tzValue.match(/GMT([+-])(\d+)/)
  const sign  = m?.[1] ?? '+'
  const hours = (m?.[2] ?? '1').padStart(2, '0')
  return new Date(`${rawStr}${sign}${hours}:00`)
}

/** Costruisce "domani alle HH:MM" in ora italiana, pronto per il DB (UTC). */
function tomorrowItalianAt(hour: number, minute = 0): Date {
  const tomorrowStr = new Date(Date.now() + 86_400_000)
    .toLocaleDateString('sv', { timeZone: 'Europe/Rome' })
  return parseItalianDateTime(`${tomorrowStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`)
}

export async function executeAction(
  actionId: ActionId,
  payload: Record<string, unknown>,
  userId: string,
  auditId: string
): Promise<ExecutionResult> {
  if (!isValidActionId(actionId)) {
    return { success: false, message: `Azione non registrata: ${actionId}` }
  }

  const def = getAction(actionId)
  if (!def) return { success: false, message: 'Azione non trovata nel registry' }

  // Aggiorna audit log a CONFIRMED
  await prisma.aiAuditLog.update({
    where: { id: auditId },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
  })

  try {
    let result: ExecutionResult

    switch (actionId) {
      case 'PROMEMORIA_CREATE':
      case 'FOLLOWUP_CREATE':
        result = await executeCreaPromemoria(payload, userId, auditId)
        break
      case 'PROMEMORIA_COMPLETE':
        result = await executeCompletaPromemoria(payload, auditId)
        break
      case 'PROMEMORIA_RESCHEDULE':
        result = await executeRimandaPromemoria(payload, auditId)
        break
      case 'RAPPORTINO_ADD_NOTA':
        result = await executeNoteRapportino(payload, auditId)
        break
      case 'MATERIALE_REQUEST_DRAFT':
      case 'MATERIALE_MARK_MANCANTE':
        result = await executeSegnalaMaterialeMancante(payload, userId, auditId)
        break
      case 'COMMESSA_SUMMARY':
      case 'CLIENTE_FIND_OR_SUGGEST':
        // Read-only: nessun DB write
        result = { success: true, message: 'Operazione di sola lettura completata.' }
        break
      default:
        // Azioni che richiedono ulteriore implementazione (redirect a pagina)
        result = {
          success: true,
          message: `Bozza preparata per ${def.label}. Apri la pagina corrispondente per completare l'operazione.`,
        }
    }

    // Aggiorna audit log a EXECUTED
    await prisma.aiAuditLog.update({
      where: { id: auditId },
      data: {
        status: result.success ? 'EXECUTED' : 'FAILED',
        finalPayload: JSON.parse(JSON.stringify(payload)),
        result: JSON.parse(JSON.stringify({ message: result.message, recordId: result.recordId ?? null })),
        errorMessage: result.success ? null : result.message,
        executedAt: new Date(),
      },
    })

    return result
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore esecuzione'
    await prisma.aiAuditLog.update({
      where: { id: auditId },
      data: { status: 'FAILED', errorMessage: msg, executedAt: new Date() },
    })
    return { success: false, message: msg }
  }
}

// ─── Executor: crea promemoria ───────────────────────────────────────────────

async function executeCreaPromemoria(
  payload: Record<string, unknown>,
  userId: string,
  auditId: string
): Promise<ExecutionResult> {
  const titolo    = String(payload.titolo || '').trim()
  const dataOraRaw = String(payload.dataOra || '')
  const tipo      = String(payload.tipo || 'altro')
  const priorita  = String(payload.priorita || 'normale')
  const luogo     = payload.luogo ? String(payload.luogo) : null
  const descrizione = payload.descrizione ? String(payload.descrizione) : null
  const clienteId  = payload.clienteId ? String(payload.clienteId) : null
  const commessaId = payload.commessaId ? String(payload.commessaId) : null
  const operaioId  = payload.operaioId ? String(payload.operaioId) : null

  if (!titolo) return { success: false, message: 'Titolo mancante' }

  const dataOra = parseItalianDateTime(dataOraRaw)
  if (isNaN(dataOra.getTime())) return { success: false, message: 'Data non valida' }

  const p = await prisma.promemoria.create({
    data: {
      titolo,
      dataOra,
      tipo,
      priorita,
      luogo,
      descrizione,
      clienteId,
      commessaId,
      assegnatoAOperaioId: operaioId,
      origineAi: true,
      testoOriginaleAi: payload.testoOriginale ? String(payload.testoOriginale) : null,
      perImpresa: true,
      creatoDa: userId,
    },
  })

  // Aggiorna promemoriaId nell'audit log
  await prisma.aiAuditLog.update({
    where: { id: auditId },
    data: { promemoriaId: p.id, commessaId: commessaId ?? undefined, clienteId: clienteId ?? undefined },
  })

  return { success: true, recordId: p.id, message: `Promemoria "${titolo}" creato.` }
}

// ─── Executor: completa promemoria ──────────────────────────────────────────

async function executeCompletaPromemoria(
  payload: Record<string, unknown>,
  auditId: string
): Promise<ExecutionResult> {
  const promemoriaId = String(payload.promemoriaId || '')
  if (!promemoriaId) return { success: false, message: 'ID promemoria mancante' }

  await prisma.promemoria.update({
    where: { id: promemoriaId },
    data: { stato: 'completato', completatoAt: new Date() },
  })

  await prisma.aiAuditLog.update({
    where: { id: auditId },
    data: { promemoriaId },
  })

  return { success: true, recordId: promemoriaId, message: 'Promemoria segnato come completato.' }
}

// ─── Executor: rimanda promemoria ────────────────────────────────────────────

async function executeRimandaPromemoria(
  payload: Record<string, unknown>,
  auditId: string
): Promise<ExecutionResult> {
  const promemoriaId = String(payload.promemoriaId || '')
  const nuovaDataOra = parseItalianDateTime(String(payload.nuovaDataOra || ''))

  if (!promemoriaId) return { success: false, message: 'ID promemoria mancante' }
  if (isNaN(nuovaDataOra.getTime())) return { success: false, message: 'Nuova data non valida' }

  await prisma.promemoria.update({
    where: { id: promemoriaId },
    data: { dataOra: nuovaDataOra },
  })

  await prisma.aiAuditLog.update({ where: { id: auditId }, data: { promemoriaId } })

  return { success: true, recordId: promemoriaId, message: 'Promemoria rimandato.' }
}

// ─── Executor: aggiunge nota rapportino ─────────────────────────────────────

async function executeNoteRapportino(
  payload: Record<string, unknown>,
  auditId: string
): Promise<ExecutionResult> {
  const rapportinoId = String(payload.rapportinoId || '')
  const nota = String(payload.nota || '').trim()

  if (!rapportinoId) return { success: false, message: 'ID rapportino mancante' }
  if (!nota) return { success: false, message: 'Nota vuota' }

  const rap = await prisma.rapportino.findUnique({
    where: { id: rapportinoId },
    select: { noteGiornoSuccessivo: true },
  })

  const noteAggiornate = [rap?.noteGiornoSuccessivo, nota].filter(Boolean).join('\n')

  await prisma.rapportino.update({
    where: { id: rapportinoId },
    data: { noteGiornoSuccessivo: noteAggiornate },
  })

  await prisma.aiAuditLog.update({ where: { id: auditId }, data: { rapportinoId } })

  return { success: true, recordId: rapportinoId, message: 'Nota aggiunta al rapportino.' }
}

// ─── Executor: segnala materiale mancante come promemoria urgente ────────────

async function executeSegnalaMaterialeMancante(
  payload: Record<string, unknown>,
  userId: string,
  auditId: string
): Promise<ExecutionResult> {
  const descrizione = String(payload.descrizione || '').trim()
  const commessaId  = payload.commessaId ? String(payload.commessaId) : null

  if (!descrizione) return { success: false, message: 'Descrizione materiale mancante' }

  // Crea promemoria urgente con il materiale mancante (8:00 ora italiana)
  const domani = tomorrowItalianAt(8)

  const p = await prisma.promemoria.create({
    data: {
      titolo: `Materiale mancante: ${descrizione}`,
      dataOra: domani,
      tipo: 'ordine_materiale',
      priorita: payload.urgente ? 'urgente' : 'alta',
      descrizione: payload.quantita ? `Quantità: ${payload.quantita}` : null,
      commessaId,
      origineAi: true,
      perImpresa: true,
      importante: true,
      creatoDa: userId,
    },
  })

  await prisma.aiAuditLog.update({
    where: { id: auditId },
    data: { promemoriaId: p.id, commessaId: commessaId ?? undefined },
  })

  return {
    success: true,
    recordId: p.id,
    message: `Segnalazione materiale mancante creata come promemoria urgente.`,
  }
}
