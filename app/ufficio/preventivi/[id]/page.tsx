import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import { salvaPreventivoUfficio, trasformaInCommessaUfficio } from '../actions'
import { PreventivoForm } from '@/app/impresa/preventivi/PreventivoForm'

export default async function PreventivoUfficioDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params
  const p = await prisma.preventivo.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true } },
      righe: { orderBy: { ordine: 'asc' } },
      commessa: { select: { id: true, nome: true } },
    },
  })
  if (!p) notFound()

  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } })
  const totale = calcolaTotalePreventivo(p.righe)

  const defaultValues = {
    id: p.id,
    clienteId: p.clienteId ?? '',
    data: p.data.toISOString().slice(0, 10),
    stato: p.stato,
    note: p.note ?? '',
    righe: p.righe.map(r => ({ descrizione: r.descrizione, quantita: r.quantita, prezzoUnitario: r.prezzoUnitario })),
  }

  const convertibile = p.stato === 'accettato' && !p.commessa
  const nonConvertibile = (p.stato === 'rifiutato' || p.stato === 'scaduto') && !p.commessa

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/ufficio/preventivi" className="text-sm text-gray-500 hover:text-gray-700">← Preventivi</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{p.cliente?.nome ?? 'Senza cliente'} — {formatData(p.data)}</h1>
        </div>
      </div>

      {/* Totale */}
      <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 p-4">
        <span className="text-sm text-teal-700">Totale preventivo: <strong>{formatEuro(totale)}</strong></span>
      </div>

      {/* Commessa già creata */}
      {p.commessa && (
        <Link
          href={`/ufficio/commesse/${p.commessa.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 hover:border-emerald-300 hover:bg-emerald-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-emerald-600 text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Commessa creata</p>
              <p className="text-xs text-emerald-700">{p.commessa.nome}</p>
            </div>
          </div>
          <span className="text-emerald-400 group-hover:text-emerald-600 text-lg">›</span>
        </Link>
      )}

      {/* Pulsante conversione */}
      {convertibile && (
        <form action={trasformaInCommessaUfficio.bind(null, p.id)}>
          <button
            type="submit"
            className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 text-sm font-semibold shadow-sm transition-colors"
          >
            ✦ Trasforma in commessa
          </button>
        </form>
      )}

      {/* Preventivo non convertibile */}
      {nonConvertibile && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Preventivo {p.stato} — non convertibile in commessa.
        </div>
      )}

      <PreventivoForm action={salvaPreventivoUfficio} clienti={clienti} defaultValues={defaultValues} />
    </div>
  )
}
