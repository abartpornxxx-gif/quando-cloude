export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY

  if (!apiKey) {
    throw new Error('AI_NOT_CONFIGURED')
  }

  // gemini-1.5-flash: stabile, disponibile su free tier, risposta rapida
  const model = 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const payload = {
    // systemInstruction tiene separato il contesto dal messaggio utente (formato corretto Gemini v1beta)
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    let parsed: any = {}
    try { parsed = JSON.parse(errorText) } catch {}

    const status = response.status
    if (status === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
      throw new Error('AI_QUOTA_EXCEEDED')
    }
    if (status === 403 || status === 401) {
      throw new Error('AI_INVALID_KEY')
    }
    if (status === 400 && parsed?.error?.status === 'INVALID_ARGUMENT') {
      throw new Error('AI_INVALID_KEY')
    }
    throw new Error(`GEMINI_API_ERROR: ${status} - ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    // Potrebbe essere bloccato dal filtro contenuti
    const blockReason = data?.promptFeedback?.blockReason
    if (blockReason) {
      throw new Error(`AI_BLOCKED: ${blockReason}`)
    }
    throw new Error('GEMINI_EMPTY_RESPONSE')
  }

  return text
}
