export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  // Supporta Groq (default), OpenRouter, OpenAI — formato OpenAI-compatible
  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('AI_NOT_CONFIGURED')
  }

  // Default: Groq (gratuito, veloce). Override con AI_BASE_URL per altri provider.
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
    let parsed: any = {}
    try { parsed = JSON.parse(errorText) } catch {}

    const status = response.status
    if (status === 429) throw new Error('AI_QUOTA_EXCEEDED')
    if (status === 401 || status === 403) throw new Error('AI_INVALID_KEY')
    throw new Error(`AI_API_ERROR: ${status} - ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content

  if (!text) throw new Error('AI_EMPTY_RESPONSE')

  return text
}
