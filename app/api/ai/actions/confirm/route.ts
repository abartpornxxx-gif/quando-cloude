import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAction } from '@/lib/ai/quadro-action-validator'
import { executeAction } from '@/lib/ai/actions/executor'
import { canUseAction } from '@/lib/ai/actions/permissions'
import { isValidActionId } from '@/lib/ai/actions/registry'
import { prisma } from '@/lib/prisma'
import type { ActionId } from '@/lib/ai/actions/types'

// ─── POST /api/ai/actions/confirm ────────────────────────────────────────────
// Conferma ed esegue un'azione AI precedentemente preparata.
// Flusso obbligatorio: audit DRAFT → validator → executor → audit EXECUTED

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const role: string = user.user_metadata?.role
    if (!role || role === 'cliente') {
      return NextResponse.json({ error: 'Funzione non disponibile per questo ruolo' }, { status: 403 })
    }

    const body = await req.json()
    const { auditId, confirmedPayload } = body as {
      auditId: string
      confirmedPayload: Record<string, unknown>
    }

    if (!auditId || !confirmedPayload) {
      return NextResponse.json({ error: 'auditId e confirmedPayload obbligatori' }, { status: 400 })
    }

    // 1. Carica il log DRAFT (verifica che appartenga all'utente)
    const auditLog = await prisma.aiAuditLog.findUnique({ where: { id: auditId } })
    if (!auditLog) return NextResponse.json({ error: 'Draft non trovato' }, { status: 404 })
    if (auditLog.userId !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    if (auditLog.status !== 'DRAFT') {
      return NextResponse.json({
        error: `Questa azione è già in stato "${auditLog.status}". Non può essere eseguita di nuovo.`,
      }, { status: 409 })
    }

    const actionId = auditLog.actionId as ActionId

    // 2. Verifica actionId ancora valido nel registry
    if (!isValidActionId(actionId)) {
      await prisma.aiAuditLog.update({ where: { id: auditId }, data: { status: 'FAILED', errorMessage: 'ActionId non registrato' } })
      return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 })
    }

    // 3. Verifica permessi (riconvalida con il ruolo attuale)
    if (!canUseAction(role, actionId)) {
      await prisma.aiAuditLog.update({ where: { id: auditId }, data: { status: 'CANCELLED', errorMessage: `Ruolo ${role} non autorizzato` } })
      return NextResponse.json({ error: 'Ruolo non autorizzato per questa azione' }, { status: 403 })
    }

    // 4. Ri-valida il payload confermato (difesa in profondità)
    const validation = await validateAction(actionId, confirmedPayload, role)
    if (!validation.valid) {
      return NextResponse.json({
        error: `Validazione fallita: ${validation.reason}`,
        field: validation.field,
        suggestion: validation.suggestion,
      }, { status: 422 })
    }

    // 5. Esecuzione (executor aggiorna internamente lo stato dell'audit log)
    const result = await executeAction(actionId, confirmedPayload, user.id, auditId)

    if (!result.success) {
      return NextResponse.json({ error: result.message, success: false }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      recordId: result.recordId,
    })

  } catch (err) {
    console.error('[confirm] unexpected error:', err)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
