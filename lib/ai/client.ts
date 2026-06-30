export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
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
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (text) return sanitizeMarkdown(text)
      }

      const status = response.status
      if (status === 429) throw new Error('AI_QUOTA_EXCEEDED')
    } catch (err: any) {
      if (err.message === 'AI_QUOTA_EXCEEDED') throw err
    }
  }

  return callPollinations(systemPrompt, userMessage)
}

async function callPollinations(systemPrompt: string, userMessage: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

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
      throw new Error(`POLLINATIONS_ERROR: ${response.status}`)
    }

    const text = await response.text()
    if (!text?.trim()) throw new Error('AI_EMPTY_RESPONSE')
    return sanitizeMarkdown(text.trim())
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
