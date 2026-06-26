import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchContextData } from '@/lib/ai/context'
import { sanitizeContext } from '@/lib/ai/permissions'
import { SYSTEM_BASE_PROMPT, SYSTEM_PROMPTS_BY_ROLE } from '@/lib/ai/prompts'
import { callAI } from '@/lib/ai/client'

// S8: Basic Rate Limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>()
const MAX_REQUESTS = 10; // max 10 richieste
const WINDOW_MS = 60 * 1000; // per 1 minuto

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const now = Date.now()
    const userRateLimit = rateLimitMap.get(user.id) || { count: 0, resetTime: now + WINDOW_MS }
    if (now > userRateLimit.resetTime) {
      userRateLimit.count = 1
      userRateLimit.resetTime = now + WINDOW_MS
    } else {
      userRateLimit.count++
      if (userRateLimit.count > MAX_REQUESTS) {
        return NextResponse.json({ error: 'Troppe richieste. Riprova tra 1 minuto.' }, { status: 429 })
      }
    }
    rateLimitMap.set(user.id, userRateLimit)

    const role = user.user_metadata?.role
    if (!role) {
      return NextResponse.json({ error: 'Ruolo utente non definito' }, { status: 403 })
    }

    const body = await req.json()
    const { pathname, message } = body

    if (!message) {
      return NextResponse.json({ error: 'Messaggio mancante' }, { status: 400 })
    }

    // 1. Carica e sanitizza il contesto
    const rawContext = await fetchContextData(role, pathname || '', user.email || undefined)
    const context = {
      role,
      pathname: pathname || '',
      ...rawContext
    }
    const sanitizedContext = sanitizeContext(context)

    // 2. Compila i prompt
    const basePrompt = SYSTEM_BASE_PROMPT
    const rolePrompt = SYSTEM_PROMPTS_BY_ROLE[role] || ''
    
    const systemPrompt = `${basePrompt}\n\n${rolePrompt}\n\nEcco il contesto JSON dell'utente e della pagina corrente da utilizzare (non parlare mai di dati vietati al tuo ruolo): \n${JSON.stringify(sanitizedContext, null, 2)}`

    // 3. Esegui la chiamata a AI
    try {
      const responseText = await callAI(systemPrompt, message)
      return NextResponse.json({ response: responseText })
    } catch (apiErr: any) {
      console.error('SERVER_ERROR: AI chat error:', apiErr)
      return NextResponse.json({
        error: `[DEBUG] Errore API AI: ${apiErr.message || apiErr}`,
        notAvailable: true
      }, { status: 200 })
    }

  } catch (err: any) {
    console.error('SERVER_ERROR: API Chat Route Error:', err)
    return NextResponse.json({
      error: `[DEBUG] Errore API Route: ${err.message || err}`
    }, { status: 200 })
  }
}
