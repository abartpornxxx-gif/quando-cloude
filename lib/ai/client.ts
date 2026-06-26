export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY
  
  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  // Utilizza OpenRouter con un modello Llama 3 gratuito, compatibile con le API di OpenAI
  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const payload = {
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: 1000,
    temperature: 0.7
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://quadro.app', // Richiesto da OpenRouter
      'X-Title': 'Quadro ERP' // Opzionale per OpenRouter
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OPENROUTER_API_ERROR: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  
  if (!text) {
    throw new Error('OPENROUTER_EMPTY_RESPONSE')
  }

  return text
}
