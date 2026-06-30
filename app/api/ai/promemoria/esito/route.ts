import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMEMORIA_ESITO_PROMPT, SYSTEM_BASE_PROMPT } from '@/lib/ai/prompts'
import { callAI } from '@/lib/ai/client'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const role = user.user_metadata?.role
    if (!role || role === 'cliente' || role === 'operaio') {
      return NextResponse.json({ error: 'Funzione non disponibile per questo ruolo' }, { status: 403 })
    }

    const now = Date.now()
    const rl = rateLimitMap.get(user.id) || { count: 0, resetTime: now + 60000 }
    if (now > rl.resetTime) { rl.count = 1; rl.resetTime = now + 60000 }
    else { rl.count++; if (rl.count > 20) return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 }) }
    rateLimitMap.set(user.id, rl)

    const body = await req.json()
    const { titolo, tipo, dataOra } = body

    if (!titolo) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const dataFormatted = dataOra
      ? new Date(dataOra).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
      : 'data non specificata'

    const systemPrompt = SYSTEM_BASE_PROMPT + '\n\n' + PROMEMORIA_ESITO_PROMPT(tipo || 'altro', titolo, dataFormatted)

    try {
      const testo = await callAI(systemPrompt, `Promemoria scaduto: "${titolo}"`)
      return NextResponse.json({ testo })
    } catch {
      return NextResponse.json({
        testo: `Il promemoria "${titolo}" è scaduto. Hai completato questa attività? Scegli un'azione qui sotto.`,
        fallback: true,
      })
    }

  } catch (err) {
    console.error('AI esito error:', err)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
