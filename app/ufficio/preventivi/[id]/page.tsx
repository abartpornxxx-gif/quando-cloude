import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import { salvaPreventivoUfficio } from '../actions'
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/ufficio/preventivi" className="text-sm text-gray-500 hover:text-gray-700">← Preventivi</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{p.cliente?.nome ?? 'Senza cliente'} — {formatData(p.data)}</h1>
        </div>
        {p.commessa && (
          <span className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
            Commessa: {p.commessa.nome}
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 p-4">
        <span className="text-sm text-teal-700">Totale preventivo: <strong>{formatEuro(totale)}</strong></span>
      </div>

      {/* NO pulsante "Trasforma in commessa" — riservato all'impresa */}
      <PreventivoForm action={salvaPreventivoUfficio} clienti={clienti} defaultValues={defaultValues} />
    </div>
  )
}
