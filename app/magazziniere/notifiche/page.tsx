import { requireMagazziniere } from '@/lib/auth'
import { listaNotificheMagazziniere } from '@/lib/notifiche'
import Link from 'next/link'
import { formatData } from '@/lib/format'

export default async function NotificheMagazzinierePage() {
  await requireMagazziniere()
  const items = await listaNotificheMagazziniere()

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Avvisi magazzino</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5">{items.length}</span>
        )}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-semibold text-gray-700">Nessuna richiesta pendente</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          <p className="text-sm text-gray-500">Richieste materiale da evadere:</p>
          <div className="bg-white rounded-xl border divide-y">
            {items.map(item => (
              <Link key={item.id} href={item.href}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 ${item.urgente ? 'bg-orange-50 border-l-4 border-l-orange-400' : ''}`}>
                <span className="text-xl shrink-0">📦</span>
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
    </div>
  )
}
