import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { salvaCommessa, assegnaOperaio, rimuoviAssegnazione } from '../actions'
import { CommessaForm } from '../CommessaForm'
import { DeleteButton } from '@/components/DeleteButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { AdempimentiSection } from './AdempimentiSection'

export default async function CommessaDettPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [c, tuttiOperai, tipiLavoro] = await Promise.all([
    prisma.commessa.findUnique({
      where: { id },
      include: {
        cliente: { select: { nome: true } },
        preventivo: { select: { id: true } },
        operai: { include: { operaio: { select: { id: true, nome: true, ruolo: true } } } },
        tipoLavoro: { select: { id: true, nome: true } },
        adempimenti: { orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }] },
      },
    }),
    prisma.operaio.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true, ruolo: true } }),
    prisma.tipoLavoro.findMany({ where: { attivo: true }, orderBy: [{ ordine: 'asc' }, { nome: 'asc' }], select: { id: true, nome: true } }),
  ])
  if (!c) notFound()

  const clienti = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })
  const assegnatiIds = new Set(c.operai.map(a => a.operaioId))
  const disponibili = tuttiOperai.filter(o => !assegnatiIds.has(o.id))

  const defaultValues = {
    id: c.id,
    nome: c.nome,
    clienteId: c.clienteId ?? '',
    indirizzoCantiere: c.indirizzoCantiere ?? '',
    stato: c.stato,
    note: c.note ?? '',
    tipoLavoroId: c.tipoLavoroId ?? '',
    preventivato: c.preventivato,
    costiMateriali: c.costiMateriali,
    costiManodopera: c.costiManodopera,
    costiMezzi: c.costiMezzi,
    fatturato: c.fatturato,
  }

  async function aggiungiOperaio(fd: FormData) {
    'use server'
    const opId = fd.get('operaioId') as string
    if (opId) await assegnaOperaio(id, opId)
  }

  const costiTotali = c.costiMateriali + c.costiManodopera + c.costiMezzi
  const margineEuro = c.preventivato - costiTotali
  const marginePct =
    c.preventivato > 0 ? Math.round((margineEuro / c.preventivato) * 100) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        backHref="/impresa/commesse"
        backLabel="Commesse"
        title={c.nome}
        subtitle={c.cliente?.nome ?? undefined}
        badge={
          <Badge variant={c.stato === 'aperta' ? 'success' : 'neutral'} dot={c.stato === 'aperta'}>
            {c.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
          </Badge>
        }
        action={
          c.preventivo ? (
            <Link
              href={`/impresa/preventivi/${c.preventivo.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
            >
              ← Preventivo
            </Link>
          ) : undefined
        }
      />

      {/* Mini stats finanziari */}
      {c.preventivato > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Preventivato</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(c.preventivato)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costi</p>
            <p className={`text-lg font-bold mt-1 ${costiTotali > c.preventivato ? 'text-red-600' : 'text-gray-900'}`}>
              {formatEuro(costiTotali)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Margine</p>
            <p
              className={`text-lg font-bold mt-1 ${
                margineEuro > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {marginePct !== null
                ? `${margineEuro > 0 ? '+' : ''}${marginePct}%`
                : formatEuro(margineEuro)}
            </p>
          </div>
        </div>
      )}

      {/* Azioni rapide cantiere */}
      <Link
        href={`/impresa/commesse/${c.id}/materiali`}
        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3">
          <Image src="/immagini/icona-materiale.png" width={22} height={22} alt="" className="shrink-0 opacity-80" />
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
              Materiali &amp; Report
            </p>
            <p className="text-xs text-gray-400">Movimenti, richieste, report giornate</p>
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 text-lg">›</span>
      </Link>

      {/* Adempimenti cantiere */}
      <AdempimentiSection
        commessaId={c.id}
        tipoLavoro={c.tipoLavoro}
        adempimenti={c.adempimenti}
      />

      {/* Form modifica */}
      <CommessaForm action={salvaCommessa} clienti={clienti} tipiLavoro={tipiLavoro} defaultValues={defaultValues} />

      {/* Operai assegnati */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">Operai assegnati al cantiere</h2>
        </div>
        <div className="p-5 space-y-2">
          {c.operai.length === 0 && (
            <p className="text-sm text-gray-400 py-2">Nessun operaio assegnato ancora.</p>
          )}
          {c.operai.map(a => (
            <div
              key={a.operaioId}
              className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{a.operaio.nome}</p>
                {a.operaio.ruolo && (
                  <p className="text-xs text-gray-500">{a.operaio.ruolo}</p>
                )}
              </div>
              <DeleteButton action={rimuoviAssegnazione.bind(null, c.id, a.operaioId)} label="Rimuovi" />
            </div>
          ))}

          {disponibili.length > 0 && (
            <form action={aggiungiOperaio} className="flex gap-2 pt-2">
              <select
                name="operaioId"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Aggiungi operaio —</option>
                {disponibili.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                    {o.ruolo ? ` (${o.ruolo})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Assegna
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
