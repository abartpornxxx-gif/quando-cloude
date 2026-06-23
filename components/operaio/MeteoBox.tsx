// Struttura pronta per futura integrazione API meteo.
// Per ora mostra sempre il fallback "meteo non disponibile".
// Per attivare: passare i dati da una chiamata API (OpenMeteo, OpenWeather ecc.)
// e rimuovere il branch fallback.

interface MeteoData {
  temperatura: number       // °C
  condizione: string        // "pioggia" | "vento" | "caldo" | "sereno" | "nuvoloso"
  descrizione: string       // testo libero
}

interface Props {
  meteo?: MeteoData | null
  indirizzo?: string | null
}

function consiglioOperativo(condizione: string): string {
  switch (condizione) {
    case 'pioggia':  return 'Porta telo e proteggi attrezzature.'
    case 'vento':    return 'Attenzione a scale e lavori esterni.'
    case 'caldo':    return 'Porta acqua e pianifica pause.'
    case 'sereno':   return 'Condizioni buone per lavorazioni esterne.'
    default:         return 'Controlla le condizioni prima di partire.'
  }
}

function iconaMeteo(condizione: string): string {
  switch (condizione) {
    case 'pioggia':  return '🌧'
    case 'vento':    return '💨'
    case 'caldo':    return '☀️'
    case 'sereno':   return '🌤'
    default:         return '⛅'
  }
}

export function MeteoBox({ meteo, indirizzo }: Props) {
  if (meteo) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Meteo cantiere</p>
          <span className="text-lg">{iconaMeteo(meteo.condizione)}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-sky-900">{meteo.temperatura}°C</p>
          <p className="text-sm text-sky-700 capitalize">{meteo.descrizione}</p>
        </div>
        <p className="text-xs text-sky-600 bg-sky-100 rounded-lg px-2 py-1.5">
          💡 {consiglioOperativo(meteo.condizione)}
        </p>
      </div>
    )
  }

  // Fallback: meteo non disponibile
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meteo cantiere</p>
        <span className="text-base">⛅</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">Meteo non disponibile — verifica prima di partire.</p>
      {indirizzo && (
        <a
          href={`https://www.google.com/search?q=meteo+${encodeURIComponent(indirizzo)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-sky-600 font-medium hover:underline"
        >
          Cerca meteo su Google →
        </a>
      )}
    </div>
  )
}
