import { requireOperaio } from '@/lib/auth'
import { listaNotificheOperaio } from '@/lib/notifiche'
import Image from 'next/image'
import Link from 'next/link'
import { formatData } from '@/lib/format'

const TIPO_ICON: Record<string, string> = {
  rapportino:    '/immagini/icona-rapportino.png',
  pianificazione: '/immagini/icona-calendario.png',
  chat:          '/immagini/icona-chat.png',
}

function NotificaIcon({ tipo }: { tipo: string }) {
  const src = TIPO_ICON[tipo]
  if (!src) return <Image src="/immagini/icona-notifiche.png" width={20} height={20} alt="" className="shrink-0 opacity-70" />
  return <Image src={src} width={20} height={20} alt="" className="shrink-0 opacity-80" />
}

export default async function NotificheOperaioPage() {
  const { operaio } = await requireOperaio()
  const items = await listaNotificheOperaio(operaio.id)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">I miei avvisi</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5">{items.length}</span>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Image src="/immagini/successo.png" width={64} height={64} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-gray-700">Nessun avviso</p>
          <p className="text-sm text-gray-400 mt-1">Sei in regola con tutto!</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y shadow-sm">
          {items.map(item => (
            <Link key={`${item.tipo}-${item.id}`} href={item.href}
              className={`flex items-center gap-3 p-4 hover:bg-gray-50 ${item.urgente ? 'bg-red-50' : ''}`}>
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

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
        Gli avvisi vengono aggiornati in automatico ad ogni accesso.
      </div>
    </div>
  )
}
