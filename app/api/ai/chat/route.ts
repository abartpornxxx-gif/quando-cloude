import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchContextData } from '@/lib/ai/context'
import { sanitizeContext } from '@/lib/ai/permissions'
import { SYSTEM_BASE_PROMPT, SYSTEM_PROMPTS_BY_ROLE } from '@/lib/ai/prompts'
import { callAI } from '@/lib/ai/client'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS = 15
const WINDOW_MS = 60 * 1000

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Rate limiting
    const now = Date.now()
    const rl = rateLimitMap.get(user.id) || { count: 0, resetTime: now + WINDOW_MS }
    if (now > rl.resetTime) {
      rl.count = 1; rl.resetTime = now + WINDOW_MS
    } else {
      rl.count++
      if (rl.count > MAX_REQUESTS) {
        return NextResponse.json({ error: 'Troppe richieste. Riprova tra 1 minuto.', rateLimited: true }, { status: 429 })
      }
    }
    rateLimitMap.set(user.id, rl)

    const role = user.user_metadata?.role
    if (!role) {
      return NextResponse.json({ error: 'Ruolo utente non definito' }, { status: 403 })
    }

    const body = await req.json()
    const { pathname, message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 })
    }

    // Carica e sanitizza il contesto
    let rawContext: any = {}
    try {
      rawContext = await fetchContextData(role, pathname || '', user.email || undefined)
    } catch (ctxErr) {
      console.warn('AI context load failed (non bloccante):', ctxErr)
    }

    const context = { role, pathname: pathname || '', ...rawContext }
    const sanitizedContext = sanitizeContext(context)

    const rolePrompt = SYSTEM_PROMPTS_BY_ROLE[role] || ''
    const systemPrompt = `${SYSTEM_BASE_PROMPT}\n\n${rolePrompt}\n\nContesto pagina corrente (JSON):\n${JSON.stringify(sanitizedContext, null, 2)}`

    try {
      const responseText = await callAI(systemPrompt, message.trim())
      return NextResponse.json({ response: responseText })
    } catch (apiErr: any) {
      console.error('AI chat error:', apiErr.message)

      if (apiErr.message === 'AI_NOT_CONFIGURED' || apiErr.message === 'AI_INVALID_KEY') {
        return NextResponse.json({
          error: 'Assistente AI non configurato correttamente. Verifica la chiave API nelle impostazioni.',
          notConfigured: true
        }, { status: 503 })
      }
      if (apiErr.message === 'AI_QUOTA_EXCEEDED') {
        return NextResponse.json({
          error: '⏱️ Quota API esaurita per oggi. L\'assistente sarà disponibile di nuovo domani.',
          notAvailable: true
        }, { status: 503 })
      }

      return NextResponse.json({
        error: 'Assistente AI temporaneamente non disponibile. Riprova tra qualche secondo.',
        notAvailable: true
      }, { status: 503 })
    }

  } catch (err: any) {
    console.error('AI route error:', err)
    return NextResponse.json({ error: 'Errore interno. Riprova tra poco.' }, { status: 500 })
  }
}
