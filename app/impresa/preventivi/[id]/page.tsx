import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import { salvaPreventivo, trasformaInCommessa } from '../actions'
import { PreventivoForm } from '../PreventivoForm'

export default async function PreventivoDettPage({ params }: { params: Promise<{ id: string }> }) {
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
    righe: p.righe.map(r => ({
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
    })),
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/impresa/preventivi" className="text-sm text-gray-500 hover:text-gray-700">← Preventivi</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold text-gray-900">
            {p.cliente?.nome ?? 'Senza cliente'} — {formatData(p.data)}
          </h1>
        </div>

        {p.stato === 'accettato' && !p.commessa && (
          <form action={trasformaInCommessa.bind(null, p.id)}>
            <button type="submit"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              ✓ Trasforma in commessa
            </button>
          </form>
        )}

        {p.commessa && (
          <Link href={`/impresa/commesse/${p.commessa.id}`}
            className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100">
            → Commessa: {p.commessa.nome}
          </Link>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
        <span className="text-sm text-blue-700">Totale preventivo: <strong>{formatEuro(totale)}</strong></span>
      </div>

      <PreventivoForm action={salvaPreventivo} clienti={clienti} defaultValues={defaultValues} />
    </div>
  )
}
