/**
 * QUADRO — Servizio Integrazione Google Gemini API
 * Interazione diretta via REST per massimizzare la stabilità ed evitare dipendenze pesanti.
 */

function getApiUrl() {
  let model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  if (model.startsWith('models/')) {
    model = model.substring('models/'.length)
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}


function getApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY non configurata nel file .env.local')
  }
  return key
}

export interface AIRapportinoResult {
  lavoroEseguito: string
  lavoriExtra: string | null
  noteAttrezzatura: string | null
  noteGiornoSuccessivo: string | null
  oreOrdinarie: number
  oreStraordinarie: number
  cosaFareDomani: string | null
  stimaOreDomani: number | null
  attrezzatureRiconsegnate: string[]
  materialiReso: Array<{ descrizione: string; quantita: number }>
}

export interface AIFatturaResult {
  numero: string | null
  data: string | null         // YYYY-MM-DD
  dataScadenza: string | null // YYYY-MM-DD
  importo: number | null      // Importo totale in Euro (es. 1250.50)
  fornitore: string | null    // Ragione sociale / Nome fornitore
  note: string | null         // Riepilogo merci/servizi
}

/**
 * Analizza la descrizione a testo libero fornita dall'operaio per compilare il rapportino.
 */
export async function analizzaTestoRapportino(testo: string): Promise<AIRapportinoResult> {
  const apiKey = getApiKey()
  
  const prompt = `Sei un assistente virtuale per un'impresa di impianti elettrici e termoidraulici (CreCas Impianti).
Analizza il seguente resoconto della giornata lavorativa di un operaio ed estrai le informazioni strutturate in formato JSON.

TESTO DELL'OPERAIO:
"${testo}"

Compila i seguenti campi basandoti esclusivamente sul testo fornito (usa null se l'informazione è del tutto assente):
- "lavoroEseguito": Breve sintesi in italiano del lavoro svolto oggi (es: "Installazione canaline e passaggio cavi elettrici").
- "lavoriExtra": Dettagli su imprevisti o lavorazioni extra non preventivate (se citati).
- "noteAttrezzatura": Segnalazioni su attrezzi danneggiati, mancanti o malfunzionanti.
- "noteGiornoSuccessivo": Note utili per il giorno dopo (cose da ricordare).
- "oreOrdinarie": Numero di ore ordinarie lavorate (default a 8 se dice "giornata intera", "tutto il giorno", oppure calcola se dice ad es. "dalle 8 alle 17 con 1h di pausa"). Deve essere un numero decimale (es: 6.5).
- "oreStraordinarie": Numero di ore straordinarie lavorate (se menzionate esplicitamente).
- "cosaFareDomani": Descrizione di cosa c'è da fare il giorno dopo (se indicato).
- "stimaOreDomani": Ore stimate per completare il lavoro di domani (se indicato).
- "attrezzatureRiconsegnate": Lista di nomi o parole chiave di attrezzature che l'operaio menziona come restituite, riportate o caricate sul mezzo (es: ["scala", "flessibile"]).
- "materialiReso": Lista di materiali avanzati che vengono restituiti al magazzino. Ogni elemento deve contenere "descrizione" (es: "tubo corrugato") e "quantita" (numero).

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questi campi.`

  const response = await fetch(`${getApiUrl()}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            lavoroEseguito: { type: 'STRING' },
            lavoriExtra: { type: 'STRING', nullable: true },
            noteAttrezzatura: { type: 'STRING', nullable: true },
            noteGiornoSuccessivo: { type: 'STRING', nullable: true },
            oreOrdinarie: { type: 'NUMBER' },
            oreStraordinarie: { type: 'NUMBER' },
            cosaFareDomani: { type: 'STRING', nullable: true },
            stimaOreDomani: { type: 'NUMBER', nullable: true },
            attrezzatureRiconsegnate: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            materialiReso: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  descrizione: { type: 'STRING' },
                  quantita: { type: 'NUMBER' }
                },
                required: ['descrizione', 'quantita']
              }
            }
          },
          required: [
            'lavoroEseguito', 'lavoriExtra', 'noteAttrezzatura', 
            'noteGiornoSuccessivo', 'oreOrdinarie', 'oreStraordinarie', 
            'cosaFareDomani', 'stimaOreDomani', 'attrezzatureRiconsegnate', 'materialiReso'
          ]
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Errore chiamata Gemini API: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textResponse) {
    throw new Error('Gemini API non ha restituito una risposta valida.')
  }

  return JSON.parse(textResponse) as AIRapportinoResult
}

/**
 * Analizza un file (PDF o Immagine in Base64) di una fattura o bolla passiva fornitori per estrarre i dati fiscali.
 */
export async function analizzaDocumentoFattura(fileBase64: string, mimeType: string): Promise<AIFatturaResult> {
  const apiKey = getApiKey()

  const prompt = `Sei un contabile esperto. Analizza questo documento fiscale (fattura passiva o bolla di consegna fornitore) ed estrai i dati strutturati in formato JSON.

Estrai questi campi:
- "numero": Il numero identificativo della fattura o del documento.
- "data": La data di emissione del documento in formato YYYY-MM-DD.
- "dataScadenza": La data di scadenza del pagamento in formato YYYY-MM-DD. Se non presente, stimala a 30 giorni dalla data del documento, oppure usa null.
- "importo": L'importo TOTALE da pagare in Euro (numero decimale, es: 1245.60).
- "fornitore": Il nome o la ragione sociale del fornitore (es: "Sonepar Italia S.p.a.", "Würth", "Tufano", ecc.).
- "note": Un brevissimo riassunto descrittivo degli articoli acquistati (es: "Fornitura cavi elettrici FG16 e morsetti di connessione").

Restituisci ESCLUSIVAMENTE un oggetto JSON valido.`

  const response = await fetch(`${getApiUrl()}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            numero: { type: 'STRING', nullable: true },
            data: { type: 'STRING', nullable: true },
            dataScadenza: { type: 'STRING', nullable: true },
            importo: { type: 'NUMBER', nullable: true },
            fornitore: { type: 'STRING', nullable: true },
            note: { type: 'STRING', nullable: true }
          },
          required: ['numero', 'data', 'dataScadenza', 'importo', 'fornitore', 'note']
        }
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Errore chiamata Gemini API per documento: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textResponse) {
    throw new Error('Gemini API non ha restituito una risposta valida per il documento.')
  }

  return JSON.parse(textResponse) as AIFatturaResult
}
