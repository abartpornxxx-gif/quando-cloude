export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  // Usa la chiave passata in env
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  
  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.7
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GEMINI_API_ERROR: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!text) {
    throw new Error('GEMINI_EMPTY_RESPONSE')
  }

  return text
}
