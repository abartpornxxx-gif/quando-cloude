import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROMEMORIA_PARSE_PROMPT } from '@/lib/ai/prompts'
import { callAI } from '@/lib/ai/client'

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const MAX_REQUESTS = 20
const WINDOW_MS = 60 * 1000

const TIPI_VALIDI = ['sopralluogo','intervento_urgente','chiamata_cliente','ordine_materiale','attivita_ufficio','appuntamento','scadenza','nota_interna','promemoria_operaio','altro']
const PRIORITA_VALIDE = ['bassa','normale','alta','urgente']

function sanitizzaBozza(bozza: Record<string, unknown>, testoOriginale: string) {
  return {
    titolo:          typeof bozza.titolo === 'string'       ? bozza.titolo.slice(0, 200)       : '',
    tipo:            TIPI_VALIDI.includes(bozza.tipo as string) ? (bozza.tipo as string)        : 'altro',
    data:            typeof bozza.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bozza.data)  ? bozza.data : null,
    ora:             typeof bozza.ora === 'string' && /^\d{2}:\d{2}$/.test(bozza.ora)           ? bozza.ora  : null,
    priorita:        PRIORITA_VALIDE.includes(bozza.priorita as string) ? (bozza.priorita as string) : 'normale',
    luogo:           typeof bozza.luogo === 'string'        ? bozza.luogo.slice(0, 300)         : null,
    descrizione:     typeof bozza.descrizione === 'string'  ? bozza.descrizione.slice(0, 1000)  : null,
    clienteNome:     typeof bozza.clienteNome === 'string'  ? bozza.clienteNome.slice(0, 200)   : null,
    operaioNome:     typeof bozza.operaioNome === 'string'  ? bozza.operaioNome.slice(0, 200)   : null,
    note:            typeof bozza.note === 'string'         ? bozza.note.slice(0, 500)          : null,
    testoOriginale:  testoOriginale.slice(0, 1000),
  }
}

function estraiJSON(raw: string): unknown {
  const cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('JSON_NOT_FOUND')
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const role = user.user_metadata?.role
    if (!role || role === 'cliente') {
      return NextResponse.json({ error: 'Funzione non disponibile per questo ruolo' }, { status: 403 })
    }

    // Rate limiting
    const now = Date.now()
    const rl = rateLimitMap.get(user.id) || { count: 0, resetTime: now + WINDOW_MS }
    if (now > rl.resetTime) { rl.count = 1; rl.resetTime = now + WINDOW_MS }
    else { rl.count++; if (rl.count > MAX_REQUESTS) return NextResponse.json({ error: 'Troppe richieste. Riprova tra 1 minuto.' }, { status: 429 }) }
    rateLimitMap.set(user.id, rl)

    const body = await req.json()
    const { testo } = body

    if (!testo?.trim()) return NextResponse.json({ error: 'Testo vuoto' }, { status: 400 })
    if (testo.length > 1000) return NextResponse.json({ error: 'Testo troppo lungo (max 1000 caratteri)' }, { status: 400 })

    const oggi = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Rome',
    })
    const oggiISO = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Rome' })

    const systemPrompt = PROMEMORIA_PARSE_PROMPT(oggi)
    const userMsg = `Converti questo testo in uno o più promemoria strutturati:\n"${testo.trim()}"\n\nData di riferimento per "oggi": ${oggiISO}`

    let raw: string
    try {
      raw = await callAI(systemPrompt, userMsg)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'AI_QUOTA_EXCEEDED') {
        return NextResponse.json({ error: 'Quota AI esaurita per oggi. Riprova domani o crea il promemoria manualmente.', notAvailable: true }, { status: 503 })
      }
      console.error('[parse/route] callAI threw:', msg)
      return NextResponse.json({
        error: 'Assistente AI temporaneamente non disponibile. Crea il promemoria manualmente.',
        notAvailable: true,
      }, { status: 503 })
    }

    let parsed: unknown
    try {
      parsed = estraiJSON(raw)
    } catch {
      console.error('[parse/route] JSON extraction failed, raw:', raw?.slice(0, 200))
      return NextResponse.json({
        error: 'Non sono riuscito a interpretare il testo. Prova a essere più specifico.',
      }, { status: 422 })
    }

    const parsedObj = parsed as Record<string, unknown>

    // Array format: { "bozze": [...] }
    if (parsedObj.bozze && Array.isArray(parsedObj.bozze) && parsedObj.bozze.length > 0) {
      const bozze = (parsedObj.bozze as Record<string, unknown>[])
        .slice(0, 5) // max 5 bozze per request
        .map(b => sanitizzaBozza(b, testo.trim()))
        .filter(b => b.titolo.trim().length > 0)

      if (bozze.length === 0) {
        return NextResponse.json({ error: 'Non sono riuscito a interpretare il testo. Prova a essere più specifico.' }, { status: 422 })
      }

      return NextResponse.json({ bozze })
    }

    // Backward compat: single object { "titolo": ..., "tipo": ... }
    if (typeof parsedObj.titolo === 'string') {
      const bozza = sanitizzaBozza(parsedObj, testo.trim())
      return NextResponse.json({ bozze: [bozza] })
    }

    return NextResponse.json({ error: 'Risposta AI non riconosciuta. Prova a riformulare il testo.' }, { status: 422 })

  } catch (err) {
    console.error('[parse/route] unexpected error:', err)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
