import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData, formatEuro } from '@/lib/format'
import { segnaVista, segnaChiusa, trasformaInPreventivo } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

const STATO_LABEL: Record<string, { label: string; cls: string }> = {
  nuova:          { label: 'Nuova', cls: 'bg-red-100 text-red-700' },
  vista:          { label: 'Vista', cls: 'bg-yellow-100 text-yellow-700' },
  in_preventivo:  { label: 'In preventivo', cls: 'bg-blue-100 text-blue-700' },
  chiusa:         { label: 'Chiusa', cls: 'bg-gray-100 text-gray-500' },
}

export default async function RichiestaDettaglioPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params

  const r = await prisma.richiestaOfferta.findUnique({
    where: { id },
    include: {
      offerta: true,
      cliente: { select: { id: true, nome: true, email: true, telefono: true } },
      commessa: { select: { id: true, nome: true } },
    },
  })
  if (!r) notFound()

  const s = STATO_LABEL[r.stato] ?? { label: r.stato, cls: 'bg-gray-100 text-gray-500' }
  const puoCrearePreventivo = r.stato !== 'in_preventivo' && r.stato !== 'chiusa'

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/impresa/richieste-offerte" className="text-sm text-gray-500 hover:text-gray-700">← Richieste</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold flex-1 truncate">{r.offerta.titolo}</h1>
        <span className={`text-xs rounded-full px-2 py-1 font-medium ${s.cls}`}>{s.label}</span>
      </div>

      {/* Offerta */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {r.offerta.fotoUrl && (
          <img src={r.offerta.fotoUrl} alt={r.offerta.titolo} className="w-full h-48 object-cover" />
        )}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{r.offerta.titolo}</p>
            {r.offerta.prezzoDa != null && (
              <p className="text-sm text-blue-700 font-semibold">Da {formatEuro(r.offerta.prezzoDa)}</p>
            )}
          </div>
          {r.offerta.categoria && <p className="text-xs text-gray-500">{r.offerta.categoria}</p>}
          {r.offerta.descrizione && <p className="text-sm text-gray-700 mt-2">{r.offerta.descrizione}</p>}
        </div>
      </div>

      {/* Cliente */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</h2>
        <Link href={`/impresa/clienti/${r.cliente.id}`} className="font-semibold text-blue-700 hover:underline">
          {r.cliente.nome}
        </Link>
        {r.cliente.email && <p className="text-sm text-gray-600">✉ {r.cliente.email}</p>}
        {r.cliente.telefono && <p className="text-sm text-gray-600">📞 {r.cliente.telefono}</p>}
        {r.commessa && (
          <p className="text-sm text-gray-500">
            Cantiere collegato:{' '}
            <Link href={`/impresa/commesse/${r.commessa.id}`} className="text-blue-600 hover:underline">
              {r.commessa.nome}
            </Link>
          </p>
        )}
      </div>

      {/* Note cliente */}
      {r.note && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Note del cliente</p>
          <p className="text-sm text-amber-800">{r.note}</p>
        </div>
      )}

      <p className="text-xs text-gray-400">Ricevuta il {formatData(r.createdAt)}</p>

      {/* Azioni */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        {r.stato === 'nuova' && (
          <form action={segnaVista.bind(null, r.id)}>
            <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Segna come vista
            </button>
          </form>
        )}

        {puoCrearePreventivo && (
          <form action={trasformaInPreventivo.bind(null, r.id)}>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              📋 Crea preventivo
            </button>
          </form>
        )}

        {r.stato === 'in_preventivo' && (
          <Link href="/impresa/preventivi" className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100">
            → Vai ai preventivi
          </Link>
        )}

        {r.stato !== 'chiusa' && (
          <form action={segnaChiusa.bind(null, r.id)}>
            <button type="submit" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50">
              Chiudi richiesta
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
