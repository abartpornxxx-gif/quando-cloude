import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { salvaRichiestaPreventivo } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NuovaRichiestaPreventivoPage({ params }: Props) {
  await requireUfficio()
  const { id: commessaId } = await params

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

  // Carica i fornitori ordinati per nome per la select
  const fornitori = await prisma.fornitore.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  const salvaRichiestaAction = salvaRichiestaPreventivo.bind(null, commessaId)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/ufficio/commesse" className="hover:text-teal-700">Commesse</Link>
        <span>›</span>
        <Link href={`/ufficio/commesse/${commessaId}`} className="hover:text-teal-700">{commessa.nome}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Nuova richiesta preventivo</span>
      </div>

      <PageHeader title="Nuova Richiesta Preventivo Fornitore" backHref={`/ufficio/commesse/${commessaId}`} />

      <form action={salvaRichiestaAction} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Fornitore *</label>
          <select
            name="fornitoreId"
            required
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm bg-white focus:border-teal-500 focus:outline-none"
          >
            <option value="">Seleziona un fornitore...</option>
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
            placeholder="Es. Fornitura quadri elettrici e cablaggio"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Variante lavoro collegata (Opzionale)</label>
          <select
            name="varianteId"
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
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Importo ricevuto (€) (Opzionale)</label>
          <input
            name="importo"
            type="text"
            placeholder="Es. 1250.00"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Importo del preventivo ricevuto dal fornitore (lasciare vuoto se non ancora disponibile)</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Link preventivo / file offerta</label>
          <input
            name="fileUrl"
            type="text"
            placeholder="Es. https://... o percorso file"
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note interne</label>
          <textarea
            name="note"
            rows={3}
            placeholder="Note o riepilogo dell'offerta ricevuta..."
            className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Invia richiesta
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
