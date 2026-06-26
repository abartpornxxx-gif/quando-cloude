export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY

  // ── Con chiave: usa provider OpenAI-compatible (Groq, OpenRouter, OpenAI...) ──
  if (apiKey) {
    const baseUrl = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1'
    const model = process.env.AI_MODEL || 'llama-3.1-8b-instant'

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

    if (!response.ok) {
      const errorText = await response.text()
      const status = response.status
      if (status === 429) throw new Error('AI_QUOTA_EXCEEDED')
      if (status === 401 || status === 403) {
        // La chiave non va — proviamo Pollinations come fallback
        return callPollinations(systemPrompt, userMessage)
      }
      throw new Error(`AI_API_ERROR: ${status} - ${errorText.slice(0, 200)}`)
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) throw new Error('AI_EMPTY_RESPONSE')
    return text
  }

  // ── Senza chiave: Pollinations AI (gratuito, nessun account richiesto) ──────
  return callPollinations(systemPrompt, userMessage)
}

async function callPollinations(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt.slice(0, 3000) },
        { role: 'user', content: userMessage },
      ],
      model: 'openai',
      private: true,
      seed: Math.floor(Math.random() * 9999),
    }),
  })

  if (!response.ok) throw new Error(`POLLINATIONS_ERROR: ${response.status}`)

  const text = await response.text()
  if (!text?.trim()) throw new Error('AI_EMPTY_RESPONSE')
  return text.trim()
}
