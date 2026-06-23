interface Props {
  indirizzo: string
}

const PUNTI = [
  { label: 'Bar', query: 'bar', emoji: '☕' },
  { label: 'Parcheggio', query: 'parcheggio', emoji: '🅿️' },
  { label: 'Ferramenta', query: 'ferramenta', emoji: '🔧' },
  { label: 'Distributore', query: 'distributore carburante', emoji: '⛽' },
]

export function PuntiUtili({ indirizzo }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vicino al cantiere</p>
      <div className="grid grid-cols-2 gap-2">
        {PUNTI.map(p => (
          <a
            key={p.label}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.query + ' vicino ' + indirizzo)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          >
            <span className="text-base shrink-0">{p.emoji}</span>
            <span>{p.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
