import { requireImpresa } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatData } from '@/lib/format'

const STATO_LABEL: Record<string, { label: string; cls: string }> = {
  nuova:          { label: 'Nuova', cls: 'bg-red-100 text-red-700' },
  vista:          { label: 'Vista', cls: 'bg-yellow-100 text-yellow-700' },
  in_preventivo:  { label: 'In preventivo', cls: 'bg-blue-100 text-blue-700' },
  chiusa:         { label: 'Chiusa', cls: 'bg-gray-100 text-gray-500' },
}

export default async function RichiesteOffertePage() {
  await requireImpresa()

  const richieste = await prisma.richiestaOfferta.findMany({
    include: {
      offerta: { select: { titolo: true, fotoUrl: true } },
      cliente: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const nuove = richieste.filter(r => r.stato === 'nuova').length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Richieste di interesse</h1>
          <p className="mt-1 text-sm text-gray-500">
            {richieste.length} totali
            {nuove > 0 && <span className="ml-2 text-red-600 font-medium">· {nuove} nuove</span>}
          </p>
        </div>
        <Link href="/impresa/catalogo" className="text-sm text-blue-600 hover:underline">
          ← Catalogo
        </Link>
      </div>

      {richieste.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Image src="/immagini/icona-richieste.png" width={56} height={56} alt="" className="mx-auto mb-2 opacity-80" />
          <p className="text-gray-500">Nessuna richiesta ancora</p>
          <p className="text-sm text-gray-400 mt-1">Le richieste arrivano quando un cliente clicca "Mi interessa"</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y">
        {richieste.map(r => {
          const s = STATO_LABEL[r.stato] ?? { label: r.stato, cls: 'bg-gray-100 text-gray-500' }
          return (
            <Link
              key={r.id}
              href={`/impresa/richieste-offerte/${r.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50"
            >
              {r.offerta.fotoUrl ? (
                <img src={r.offerta.fotoUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xl">🔌</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.offerta.titolo}</p>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${s.cls}`}>{s.label}</span>
                  {r.stato === 'nuova' && <span className="text-xs text-red-500 font-bold">●</span>}
                </div>
                <p className="text-xs text-gray-500">
                  {r.cliente.nome}
                  {r.commessa && ` · ${r.commessa.nome}`}
                </p>
                {r.note && <p className="text-xs text-gray-400 truncate">{r.note}</p>}
              </div>
              <p className="text-xs text-gray-400 shrink-0">{formatData(r.createdAt)}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
