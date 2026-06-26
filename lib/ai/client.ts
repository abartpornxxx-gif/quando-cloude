export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || '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'

  const url = `https://openrouter.ai/api/v1/chat/completions`

  const payload = {
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
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
