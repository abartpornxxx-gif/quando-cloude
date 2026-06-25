import { requireMagazziniere } from '@/lib/auth'
import { listaNotificheMagazziniere } from '@/lib/notifiche'
import Image from 'next/image'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { segnaTutteLetteMagazziniere } from './actions'

export default async function NotificheMagazzinierePage() {
  const { user } = await requireMagazziniere()
  const items = await listaNotificheMagazziniere(user.id)

  const nonLette = items.filter(n => !n.letta)
  const lette = items.filter(n => n.letta)

  return (
    <div className="space-y-6">
      {/* Intestazione */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avvisi magazzino</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {nonLette.length > 0 ? `${nonLette.length} non letti` : 'Tutto letto'}
          </p>
        </div>
        {nonLette.length > 0 && (
          <form action={segnaTutteLetteMagazziniere}>
            <button type="submit" className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 shadow-sm whitespace-nowrap transition-colors">
              Segna tutte lette
            </button>
          </form>
        )}
      </div>

      {/* Stato vuoto */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-premium">
          <Image src="/immagini/successo.png" width={64} height={64} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-gray-700">Nessuna richiesta pendente</p>
          <p className="text-sm text-gray-400 mt-1">Sei in regola con tutto!</p>
        </div>
      )}

      {/* Non lette */}
      {nonLette.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Da leggere</p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-premium divide-y divide-gray-100 overflow-hidden">
            {nonLette.map(item => (
              <Link key={item.id} href={item.href}
                className={`flex items-center gap-3 px-5 py-4 hover:bg-amber-50/40 transition-colors ${item.urgente ? 'bg-red-50 border-l-4 border-l-red-400' : ''}`}>
                <Image src="/immagini/icona-materiale.png" width={20} height={20} alt="" className="shrink-0 opacity-80" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.titolo}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.sottotitolo}</p>
                  {item.urgente && <span className="text-xs text-red-600 font-bold uppercase tracking-wide">Urgente</span>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-300">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tutto letto */}
      {nonLette.length === 0 && items.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700 font-medium shadow-premium">
          Tutte le richieste sono state lette. Ottimo!
        </div>
      )}

      {/* Già lette */}
      {lette.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1 list-none select-none">
            <svg className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4"/></svg>
            Già lette ({lette.length})
          </summary>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-premium divide-y divide-gray-50 overflow-hidden opacity-60 mt-2">
            {lette.map(item => (
              <Link key={item.id} href={item.href}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <Image src="/immagini/icona-materiale.png" width={20} height={20} alt="" className="shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate line-through">{item.titolo}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.sottotitolo}</p>
                </div>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
