import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI } from '@/lib/ai/client'
import { getActionsForRole } from '@/lib/ai/actions/registry'
import { validateAction } from '@/lib/ai/quadro-action-validator'
import { prisma } from '@/lib/prisma'
import type { ActionId, ActionDraft } from '@/lib/ai/actions/types'

// ─── POST /api/ai/actions/prepare ───────────────────────────────────────────
// Interpreta il testo utente → produce bozze azioni → le valida → crea audit DRAFT

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const ACTION_PARSE_PROMPT = (role: string, actionsJson: string, oggiISO: string) =>
  `Sei il motore di azioni AI di QUADRO, gestionale per imprese di installazione impianti elettrici.

Data di oggi: ${oggiISO}
Ruolo utente: ${role}

Azioni disponibili per questo ruolo:
${actionsJson}

COMPITO:
1. Analizza il testo dell'utente.
2. Individua le azioni concrete che l'utente vuole eseguire.
3. Per ogni azione, crea una bozza strutturata con il payload corretto.
4. Se non c'è nessuna azione concreta (è solo una domanda), rispondi con { "intento": "domanda", "drafts": [] }

REGOLE PAYLOAD:
- dataOra: formato ISO 8601, es "2026-07-02T09:00:00", basandoti sulla data di oggi
- NON inventare ID (commessaId, clienteId, promemoriaId) — se non li conosci, omettili
- Per PROMEMORIA_CREATE: titolo breve + dataOra obbligatori
- Per MATERIALE_REQUEST_DRAFT: descrizione + quantita (es: "20") + urgente (true/false)
- Per RAPPORTINO_CREATE_DRAFT: lavoroEseguito (testo libero del lavoro)
- Per FOLLOWUP_CREATE: titolo + dataOra + clienteNome (se citato)
- Per COMMESSA_SUMMARY: commessaId se noto dal contesto, altrimenti ometti

RISPOSTA: SOLO JSON puro, nessun markdown:
{
  "intento": "azione|domanda",
  "drafts": [
    {
      "actionId": "PROMEMORIA_CREATE",
      "payload": {
        "titolo": "...",
        "dataOra": "2026-07-02T09:00:00",
        "tipo": "sopralluogo",
        "priorita": "normale",
        "luogo": null,
        "descrizione": null,
        "clienteNome": null
      }
    }
  ]
}

Se ci sono più attività distinte, crea un draft per ognuna (max 5).
Restituisci SOLO il JSON. Niente spiegazioni.`

function estraiJSON(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  try { return JSON.parse(cleaned) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('JSON_NOT_FOUND')
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const role: string = user.user_metadata?.role
    if (!role || role === 'cliente') {
      return NextResponse.json({ error: 'Funzione non disponibile per questo ruolo' }, { status: 403 })
    }

    // Rate limiting: 10 req/min
    const now = Date.now()
    const rl = rateLimitMap.get(user.id) || { count: 0, resetAt: now + 60_000 }
    if (now > rl.resetAt) { rl.count = 1; rl.resetAt = now + 60_000 }
    else { rl.count++; if (rl.count > 10) return NextResponse.json({ error: 'Troppe richieste. Riprova tra un minuto.', rateLimited: true }, { status: 429 }) }
    rateLimitMap.set(user.id, rl)

    const body = await req.json()
    const { text, pathname, commessaId } = body as {
      text: string; pathname?: string; commessaId?: string
    }

    if (!text?.trim() || text.length > 2000) {
      return NextResponse.json({ error: 'Testo non valido' }, { status: 400 })
    }

    const oggiISO = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Rome' })
    const actions = getActionsForRole(role)
    const actionsJson = JSON.stringify(actions.map(a => ({
      actionId: a.actionId, label: a.label, description: a.description,
      requiredFields: a.requiredFields, riskLevel: a.riskLevel,
    })), null, 2)

    const systemPrompt = ACTION_PARSE_PROMPT(role, actionsJson, oggiISO)

    let raw: string
    try {
      raw = await callAI(systemPrompt, text.trim())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'AI_QUOTA_EXCEEDED') {
        return NextResponse.json({ error: 'Quota AI esaurita. Riprova domani.', notAvailable: true }, { status: 503 })
      }
      return NextResponse.json({ error: 'AI non disponibile. Riprova tra poco.', notAvailable: true }, { status: 503 })
    }

    let parsed: { intento: string; drafts: { actionId: string; payload: Record<string, unknown> }[] }
    try {
      const p = estraiJSON(raw) as typeof parsed
      parsed = { intento: p.intento ?? 'azione', drafts: Array.isArray(p.drafts) ? p.drafts : [] }
    } catch {
      return NextResponse.json({ error: 'Risposta AI non valida.', intento: 'domanda', drafts: [] })
    }

    if (parsed.intento === 'domanda' || parsed.drafts.length === 0) {
      return NextResponse.json({ intento: 'domanda', drafts: [] })
    }

    // Per ogni draft: valida + crea audit log DRAFT
    const draftResults: ActionDraft[] = []

    for (const raw of parsed.drafts.slice(0, 5)) {
      if (!raw.actionId || typeof raw.payload !== 'object') continue

      // Inietta commessaId dal contesto se non presente
      const enrichedPayload = { ...raw.payload }
      if (commessaId && !enrichedPayload.commessaId) enrichedPayload.commessaId = commessaId

      const actionId = raw.actionId as ActionId
      const validation = await validateAction(actionId, enrichedPayload, role)

      // Crea audit log DRAFT
      let auditId = ''
      try {
        const def = actions.find(a => a.actionId === actionId)
        const audit = await prisma.aiAuditLog.create({
          data: {
            userId: user.id,
            role,
            actionId,
            status: 'DRAFT',
            riskLevel: (def?.riskLevel ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
            inputText: text.trim().slice(0, 1000),
            proposedPayload: JSON.parse(JSON.stringify(enrichedPayload)),
            commessaId: enrichedPayload.commessaId ? String(enrichedPayload.commessaId) : null,
            clienteId: enrichedPayload.clienteId ? String(enrichedPayload.clienteId) : null,
          },
        })
        auditId = audit.id
      } catch {
        // audit log non bloccante: se fallisce, si continua senza ID
      }

      const def = actions.find(a => a.actionId === actionId)
      draftResults.push({
        draftId: auditId,
        actionId,
        label: def?.label ?? actionId,
        description: def?.description ?? '',
        riskLevel: def?.riskLevel ?? 'MEDIUM',
        requiresConfirmation: def?.requiresConfirmation ?? true,
        payload: enrichedPayload,
        valid: validation.valid,
        validationReason: validation.reason,
        validationSuggestion: validation.suggestion,
      })
    }

    return NextResponse.json({ intento: 'azione', drafts: draftResults })

  } catch (err) {
    console.error('[prepare] unexpected error:', err)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
