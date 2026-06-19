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
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Avvisi magazzino</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {nonLette.length > 0 ? `${nonLette.length} non letti` : 'Tutto letto'}
          </p>
        </div>
        {nonLette.length > 0 && (
          <form action={segnaTutteLetteMagazziniere}>
            <button type="submit" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm whitespace-nowrap">
              Segna tutte lette
            </button>
          </form>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Image src="/immagini/successo.png" width={64} height={64} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-gray-700">Nessuna richiesta pendente</p>
        </div>
      )}

      {nonLette.length > 0 && (
        <>
          <p className="text-sm text-gray-500">Richieste materiale da evadere:</p>
          <div className="bg-white rounded-xl border divide-y">
            {nonLette.map(item => (
              <Link key={item.id} href={item.href}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 ${item.urgente ? 'bg-orange-50 border-l-4 border-l-orange-400' : ''}`}>
                <Image src="/immagini/icona-materiale.png" width={20} height={20} alt="" className="shrink-0 opacity-80" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.titolo}</p>
                  <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>
                  {item.urgente && <span className="text-xs text-orange-600 font-bold">URGENTE</span>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {nonLette.length === 0 && items.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
          Tutte le richieste sono state lette. Ottimo!
        </div>
      )}

      {lette.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1 list-none select-none">
            <svg className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4"/></svg>
            Già lette ({lette.length})
          </summary>
          <div className="bg-white rounded-xl border divide-y opacity-60 mt-2">
            {lette.map(item => (
              <Link key={item.id} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <Image src="/immagini/icona-materiale.png" width={20} height={20} alt="" className="shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate line-through">{item.titolo}</p>
                  <p className="text-xs text-gray-400 truncate">{item.sottotitolo}</p>
                </div>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
