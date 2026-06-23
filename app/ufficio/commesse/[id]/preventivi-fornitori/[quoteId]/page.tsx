import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaRichiestaPreventivo, eliminaRichiestaPreventivo } from '../../actions'

interface Props {
  params: Promise<{ id: string; quoteId: string }>
}

export default async function ModificaRichiestaPreventivoPage({ params }: Props) {
  await requireUfficio()
  const { id: commessaId, quoteId } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id: commessaId },
    select: {
      nome: true,
      varianti: {
        select: { id: true, titolo: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!commessa) notFound()

  const request = await prisma.richiestaPreventivoFornitore.findFirst({
    where: { id: quoteId, commessaId },
  })

  if (!request) notFound()

  const fornitori = await prisma.fornitore.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  const salvaRichiestaAction = salvaRichiestaPreventivo.bind(null, commessaId)
  const eliminaRichiestaAction = eliminaRichiestaPreventivo.bind(null, commessaId, quoteId)

  const dataScadenzaStr = request.dataScadenza
    ? request.dataScadenza.toISOString().split('T')[0]
    : ''

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/ufficio/commesse" className="hover:text-teal-700">Commesse</Link>
        <span>›</span>
        <Link href={`/ufficio/commesse/${commessaId}`} className="hover:text-teal-700">{commessa.nome}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Modifica richiesta preventivo</span>
      </div>

      <div className="flex items-center justify-between">
        <PageHeader title="Modifica Richiesta Preventivo" backHref={`/ufficio/commesse/${commessaId}`} />

        <form action={eliminaRichiestaAction} onSubmit={
          `return confirm('Sei sicuro di voler eliminare questa richiesta preventivo? Questa operazione non può essere annullata.')` as any
        }>
          <button
            type="submit"
            className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-xs font-semibold"
          >
            Elimina richiesta
          </button>
        </form>
      </div>

      <form action={salvaRichiestaAction} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        {/* ID nascosto per indicare update */}
        <input type="hidden" name="id" value={request.id} />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Fornitore *</label>
          <select
            name="fornitoreId"
            required
            defaultValue={request.fornitoreId}
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
          >
            {fornitori.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Descrizione richiesta *</label>
          <input
            name="descrizione"
            required
            defaultValue={request.descrizione}
            placeholder="Es. Fornitura quadri elettrici e cablaggio"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Variante lavoro collegata (Opzionale)</label>
          <select
            name="varianteId"
            defaultValue={request.varianteId ?? ''}
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
          >
            <option value="">Nessuna variante (Lavoro standard commessa)</option>
            {commessa.varianti.map(v => (
              <option key={v.id} value={v.id}>{v.titolo}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Stato richiesta</label>
            <select
              name="stato"
              defaultValue={request.stato}
              className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
            >
              <option value="in_attesa">In attesa di offerta</option>
              <option value="ricevuto">Preventivo ricevuto</option>
              <option value="approvato">Approvato (Confermato)</option>
              <option value="scartato">Scartato</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Scadenza offerta</label>
            <input
              name="dataScadenza"
              type="date"
              defaultValue={dataScadenzaStr}
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Link preventivo / file offerta</label>
          <input
            name="fileUrl"
            type="text"
            defaultValue={request.fileUrl ?? ''}
            placeholder="Es. https://... o percorso file"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note interne</label>
          <textarea
            name="note"
            rows={3}
            defaultValue={request.note ?? ''}
            placeholder="Note o riepilogo dell'offerta ricevuta..."
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Salva modifiche
          </button>
          <Link
            href={`/ufficio/commesse/${commessaId}`}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
