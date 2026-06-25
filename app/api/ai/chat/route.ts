import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchContextData } from '@/lib/ai/context'
import { sanitizeContext } from '@/lib/ai/permissions'
import { SYSTEM_BASE_PROMPT, SYSTEM_PROMPTS_BY_ROLE } from '@/lib/ai/prompts'
import { callGemini } from '@/lib/ai/client'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

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
    const rawContext = await fetchContextData(role, pathname || '')
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

    // 3. Esegui la chiamata a Gemini
    try {
      const responseText = await callGemini(systemPrompt, message)
      return NextResponse.json({ response: responseText })
    } catch (apiErr: any) {
      console.error('SERVER_ERROR: Gemini chat error:', apiErr)
      if (apiErr.message === 'API_KEY_MISSING') {
        return NextResponse.json({ 
          error: 'Assistente AI momentaneamente non disponibile. Verifica la configurazione o riprova più tardi.',
          notConfigured: true 
        }, { status: 200 })
      }
      return NextResponse.json({
        error: 'Assistente AI momentaneamente non disponibile. Verifica la configurazione o riprova più tardi.',
        notAvailable: true
      }, { status: 200 })
    }

  } catch (err: any) {
    console.error('SERVER_ERROR: API Chat Route Error:', err)
    return NextResponse.json({
      error: 'Assistente AI momentaneamente non disponibile. Verifica la configurazione o riprova più tardi.'
    }, { status: 200 })
  }
}
