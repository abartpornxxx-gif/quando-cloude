import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaCommessa, assegnaOperaio, rimuoviAssegnazione } from '../actions'
import { CommessaForm } from '../CommessaForm'
import { DeleteButton } from '@/components/DeleteButton'

export default async function CommessaDettPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [c, tuttiOperai] = await Promise.all([
    prisma.commessa.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        preventivo: { select: { id: true } },
        operai: { include: { operaio: { select: { id: true, nome: true, ruolo: true } } } },
      },
    }),
    prisma.operaio.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true, ruolo: true } }),
  ])
  if (!c) notFound()

  const clienti = await prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } })
  const assegnatiIds = new Set(c.operai.map(a => a.operaioId))
  const disponibili = tuttiOperai.filter(o => !assegnatiIds.has(o.id))

  const defaultValues = {
    id: c.id, nome: c.nome, clienteId: c.clienteId ?? '', indirizzoCantiere: c.indirizzoCantiere ?? '',
    stato: c.stato, note: c.note ?? '',
    preventivato: c.preventivato, costiMateriali: c.costiMateriali,
    costiManodopera: c.costiManodopera, costiMezzi: c.costiMezzi, fatturato: c.fatturato,
  }

  async function aggiungiOperaio(fd: FormData) {
    'use server'
    const opId = fd.get('operaioId') as string
    if (opId) await assegnaOperaio(id, opId)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/impresa/commesse" className="text-sm text-gray-500 hover:text-gray-700">← Commesse</Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{c.nome}</h1>
        </div>
        {c.preventivo && (
          <Link href={`/impresa/preventivi/${c.preventivo.id}`}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
            ← Preventivo origine
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href={`/impresa/commesse/${c.id}/materiali`}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          📦 Materiali & Report
        </Link>
      </div>

      <CommessaForm action={salvaCommessa} clienti={clienti} defaultValues={defaultValues} />

      {/* Sezione operai assegnati */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Operai assegnati al cantiere</h2>
        </div>
        <div className="p-4 space-y-2">
          {c.operai.length === 0 && (
            <p className="text-sm text-gray-400">Nessun operaio assegnato ancora.</p>
          )}
          {c.operai.map(a => (
            <div key={a.operaioId}
              className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{a.operaio.nome}</p>
                {a.operaio.ruolo && <p className="text-xs text-gray-500">{a.operaio.ruolo}</p>}
              </div>
              <DeleteButton
                action={rimuoviAssegnazione.bind(null, c.id, a.operaioId)}
                label="Rimuovi"
              />
            </div>
          ))}

          {disponibili.length > 0 && (
            <form action={aggiungiOperaio} className="flex gap-2 pt-2">
              <select name="operaioId"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">— Aggiungi operaio —</option>
                {disponibili.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nome}{o.ruolo ? ` (${o.ruolo})` : ''}
                  </option>
                ))}
              </select>
              <button type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Assegna
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
