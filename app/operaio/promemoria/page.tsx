import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import Link from 'next/link'

const TIPO_LABEL: Record<string, string> = {
  intervento: 'Intervento',
  appuntamento: 'Appuntamento',
  scadenza: 'Scadenza',
  nota: 'Nota',
}

const TIPO_COLOR: Record<string, string> = {
  intervento: 'bg-blue-100 text-blue-800',
  appuntamento: 'bg-purple-100 text-purple-800',
  scadenza: 'bg-orange-100 text-orange-800',
  nota: 'bg-gray-100 text-gray-700',
}

function formatOra(d: Date) {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default async function OperaioPromemoriaPage() {
  const { operaio } = await requireOperaio()

  const now = new Date()

  const promemoria = await prisma.promemoria.findMany({
    where: {
      assegnatoAOperaioId: operaio.id,
      stato: { not: 'completato' },
    },
    orderBy: { dataOra: 'asc' },
  })

  const scaduti = promemoria.filter(p => p.dataOra < now)
  const prossimi = promemoria.filter(p => p.dataOra >= now)

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">I miei promemoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">Impegni e promemoria assegnati a te</p>
      </div>

      {promemoria.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center shadow-sm">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm font-semibold text-gray-600">Nessun promemoria</p>
          <p className="text-xs text-gray-400 mt-1">L'impresa non ha ancora assegnato promemoria a te.</p>
        </div>
      )}

      {scaduti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Scaduti</p>
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
            {scaduti.map(p => (
              <div key={p.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.importante && <span className="text-yellow-500 text-sm">★</span>}
                      <p className="text-sm font-semibold text-gray-900">{p.titolo}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_LABEL[p.tipo] ?? p.tipo}
                      </span>
                    </div>
                    {p.descrizione && (
                      <p className="text-xs text-gray-500 mt-1">{p.descrizione}</p>
                    )}
                    {p.luogo && (
                      <p className="text-xs text-gray-400 mt-0.5">📍 {p.luogo}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-red-600 font-semibold">{formatData(p.dataOra)}</p>
                    <p className="text-xs text-red-500">{formatOra(p.dataOra)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prossimi.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prossimi</p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
            {prossimi.map(p => (
              <div key={p.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.importante && <span className="text-yellow-500 text-sm">★</span>}
                      <p className="text-sm font-semibold text-gray-900">{p.titolo}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TIPO_COLOR[p.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_LABEL[p.tipo] ?? p.tipo}
                      </span>
                    </div>
                    {p.descrizione && (
                      <p className="text-xs text-gray-500 mt-1">{p.descrizione}</p>
                    )}
                    {p.luogo && (
                      <p className="text-xs text-gray-400 mt-0.5">📍 {p.luogo}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-700 font-semibold">{formatData(p.dataOra)}</p>
                    <p className="text-xs text-gray-500">{formatOra(p.dataOra)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-400 text-center">
        I promemoria vengono assegnati dall'impresa. Contattali per aggiungerne di nuovi.
      </div>
    </div>
  )
}
