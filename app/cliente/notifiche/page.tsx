import { requireCliente } from '@/lib/auth'
import { listaNotificheCliente } from '@/lib/notifiche'
import Image from 'next/image'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { segnaTutteLetteCliente } from './actions'

const TIPO_ICON: Record<string, string> = {
  fattura:      '/immagini/icona-finanza.png',
  lavoro:       '/immagini/icona-cantieri.png',
  documento:    '/immagini/vuoto-documenti.png',
  appuntamento: '/immagini/icona-calendario.png',
}

function NotificaIcon({ tipo }: { tipo: string }) {
  const src = TIPO_ICON[tipo]
  if (!src) return <Image src="/immagini/icona-notifiche.png" width={20} height={20} alt="" className="shrink-0 opacity-70" />
  return <Image src={src} width={20} height={20} alt="" className="shrink-0 opacity-80" />
}

export default async function NotificheClientePage() {
  const { user, cliente } = await requireCliente()
  const items = await listaNotificheCliente(cliente.id, user.id)

  const nonLette = items.filter(n => !n.letta)
  const lette = items.filter(n => n.letta)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">I miei avvisi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {nonLette.length > 0 ? `${nonLette.length} non letti` : 'Tutto letto'}
          </p>
        </div>
        {nonLette.length > 0 && (
          <form action={segnaTutteLetteCliente}>
            <button type="submit" className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 shadow-sm whitespace-nowrap">
              Segna tutte lette
            </button>
          </form>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-violet-200 bg-white p-10 text-center">
          <Image src="/immagini/successo.png" width={64} height={64} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-gray-700">Nessun avviso al momento</p>
          <p className="text-sm text-gray-400 mt-1">Ti avviseremo qui quando ci sono novità sui tuoi lavori</p>
        </div>
      )}

      {nonLette.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y shadow-premium overflow-hidden">
          {nonLette.map(item => (
            <Link key={`${item.tipo}-${item.id}`} href={item.href}
              className={`flex items-center gap-3 p-4 hover:bg-violet-50 ${item.urgente ? 'bg-red-50' : ''}`}>
              <NotificaIcon tipo={item.tipo} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${item.urgente ? 'text-red-700' : 'text-gray-900'}`}>
                  {item.titolo}
                </p>
                {item.sottotitolo && <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>}
              </div>
              {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
              <span className="text-gray-400">›</span>
            </Link>
          ))}
        </div>
      )}

      {nonLette.length === 0 && items.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
          Hai letto tutti gli avvisi. Ottimo!
        </div>
      )}

      {lette.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1 list-none select-none">
            <svg className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4"/></svg>
            Già letti ({lette.length})
          </summary>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y opacity-60 overflow-hidden mt-2">
            {lette.map(item => (
              <Link key={`${item.tipo}-${item.id}`} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <NotificaIcon tipo={item.tipo} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate line-through">{item.titolo}</p>
                  {item.sottotitolo && <p className="text-xs text-gray-400 truncate">{item.sottotitolo}</p>}
                </div>
              </Link>
            ))}
          </div>
        </details>
      )}

      <p className="text-xs text-gray-400 text-center">
        Gli avvisi si aggiornano automaticamente ad ogni accesso
      </p>
    </div>
  )
}
