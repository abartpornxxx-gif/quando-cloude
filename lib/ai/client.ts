export async function callAI(systemPrompt: string, userMessage: string, opts?: { jsonMode?: boolean }): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const customKey = process.env.AI_API_KEY
  const customUrl = process.env.AI_BASE_URL
  const customModel = process.env.AI_MODEL

  const apiKey = groqKey
    || openaiKey
    || (customKey && customUrl ? customKey : undefined)

  if (apiKey) {
    const baseUrl = customUrl
      || (groqKey ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1')
    const model = customModel
      || (groqKey ? 'llama-3.1-8b-instant' : 'gpt-4o-mini')

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (text) return sanitizeMarkdown(text)
        console.error('[callAI] primary API returned empty content')
      } else {
        console.error('[callAI] primary API HTTP error:', response.status)
        if (response.status === 429) throw new Error('AI_QUOTA_EXCEEDED')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'AI_QUOTA_EXCEEDED') throw err as Error
      console.error('[callAI] primary API exception:', msg)
    }
  } else {
    console.error('[callAI] no API key configured, falling back to Pollinations')
  }

  return callPollinations(systemPrompt, userMessage)
}

async function callPollinations(systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt.slice(0, 2500) },
          { role: 'user', content: userMessage },
        ],
        model: 'openai',
        private: true,
        seed: Math.floor(Math.random() * 9999),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('[callPollinations] HTTP error:', response.status)
      throw new Error(`POLLINATIONS_ERROR: ${response.status}`)
    }

    const text = await response.text()
    if (!text?.trim()) {
      console.error('[callPollinations] empty response')
      throw new Error('AI_EMPTY_RESPONSE')
    }
    return sanitizeMarkdown(text.trim())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const name = err instanceof Error ? err.name : ''
    console.error('[callPollinations] error:', name, msg)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// Rimuove markdown dalla risposta AI: headings, grassetti, corsivi, backtick inline.
// NON rimuove blocchi JSON (usati per il parsing strutturato).
export function sanitizeMarkdown(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // Rimuovi heading markdown (# ## ###)
      line = line.replace(/^#{1,6}\s+/, '')
      // Rimuovi grassetto **testo** → testo
      line = line.replace(/\*\*(.+?)\*\*/g, '$1')
      // Rimuovi corsivo *testo* o _testo_ → testo
      line = line.replace(/\*(.+?)\*/g, '$1')
      line = line.replace(/_(.+?)_/g, '$1')
      // Rimuovi backtick inline `testo` → testo
      line = line.replace(/`([^`]+)`/g, '$1')
      return line
    })
    .join('\n')
    .trim()
}
