import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireImpresa } from '@/lib/auth'
import { formatEuro } from '@/lib/format'
import { salvaCommessa, assegnaOperaio, rimuoviAssegnazione, segnaCantierefinito } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { CommessaTabs } from './CommessaTabs'
import { calculateCommessaAggregates } from '@/lib/finance'

export default async function CommessaDettPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ errore?: string }>
}) {
  await requireImpresa()
  const { id } = await params
  const { errore } = await searchParams

  const [c, tuttiOperai, tipiLavoro, clienti, giornate, fatture, dico, piano, fatturePassive, varianti] = await Promise.all([
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
    prisma.operaio.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, ruolo: true },
    }),
    prisma.tipoLavoro.findMany({
      where: { attivo: true },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true },
    }),
    prisma.cliente.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
    prisma.giornata.findMany({
      where: { commessaId: id },
      select: {
        id: true,
        data: true,
        operaio: { select: { nome: true, costoOrario: true } },
        ore: { select: { tipo: true, quantita: true } },
        foto: { select: { id: true } },
        rapportino: { select: { lavoroEseguito: true } },
      },
      orderBy: { data: 'desc' },
    }),
    prisma.fatturaAttiva.findMany({
      where: { commessaId: id },
      select: {
        id: true,
        numero: true,
        anno: true,
        stato: true,
        data: true,
        aliquotaIva: true,
        importoIncassato: true,
        righe: { select: { quantita: true, prezzoUnitario: true } },
      },
      orderBy: { data: 'desc' },
    }),
    prisma.dichiarazioneConformita.findMany({
      where: { commessaId: id },
      select: { id: true, tipoImpianto: true, data: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pianificazione.findMany({
      where: { commessaId: id },
      select: {
        id: true,
        data: true,
        operaio: { select: { nome: true } },
        mezzo: { select: { nome: true } },
        lavoroDaFare: true,
        confermata: true,
      },
      orderBy: { data: 'desc' },
    }),
    prisma.fatturaPassiva.findMany({
      where: { commessaId: id },
      select: {
        id: true,
        importo: true,
        importoPagato: true,
      },
    }),
    prisma.varianteLavoro.findMany({
      where: { commessaId: id },
      select: {
        id: true,
        importo: true,
        costoStimato: true,
        stato: true,
      },
    }),
  ])

  if (!c) notFound()

  // KPI finanziari centralizzati
  const aggregates = calculateCommessaAggregates(c, fatture, fatturePassive, giornate, varianti)
  const {
    preventivato,
    fatturato,
    daFatturare,
    incassato,
    daIncassare,
    costiFornitori,
    costiManodopera,
    costiMezzi,
    costiTotali,
    margineStimato,
    margineMaturato,
    margineIncassato,
  } = aggregates

  const stimatoPct = preventivato > 0 ? Math.round((margineStimato / preventivato) * 100) : null
  const maturatoPct = fatturato > 0 ? Math.round((margineMaturato / fatturato) * 100) : null
  const incassatoPct = incassato > 0 ? Math.round((margineIncassato / incassato) * 100) : null

  // Adempimenti counter
  const adem = c.adempimenti
  const ademFatte = adem.filter(a => a.fatto).length

  // Operai: chi è già assegnato, chi è disponibile
  const assegnatiIds = new Set(c.operai.map(a => a.operaioId))
  const operaiAssegnati = c.operai.map(a => ({
    operaioId: a.operaioId,
    nome: a.operaio.nome,
    ruolo: a.operaio.ruolo,
  }))
  const operaiDisponibili = tuttiOperai.filter(o => !assegnatiIds.has(o.id))

  // Serializza dati per il componente client (Date → ISO string)
  const giornateRows = giornate.map(g => ({
    id: g.id,
    data: g.data.toISOString(),
    operaioNome: g.operaio.nome,
    oreOrdinarie: g.ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0),
    oreStr: g.ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0),
    fotoCount: g.foto.length,
    lavoroEseguito: g.rapportino?.lavoroEseguito ?? null,
  }))

  const fattureRows = fatture.map(f => ({
    id: f.id,
    numero: f.numero,
    anno: f.anno,
    stato: f.stato,
    data: f.data.toISOString(),
    totale: f.righe.reduce((s, r) => s + Math.round(r.quantita * r.prezzoUnitario), 0),
  }))

  const dicoRows = dico.map(d => ({
    id: d.id,
    tipoImpianto: d.tipoImpianto,
    data: d.data.toISOString(),
  }))

  const pianoRows = piano.map(p => ({
    id: p.id,
    data: p.data.toISOString(),
    operaioNome: p.operaio.nome,
    mezzoNome: p.mezzo?.nome ?? null,
    lavoroDaFare: p.lavoroDaFare,
    confermata: p.confermata,
  }))

  const adempimentiRows = adem.map(a => ({
    id: a.id,
    testo: a.testo,
    note: a.note,
    collegamento: a.collegamento,
    fatto: a.fatto,
    fattoDa: a.fattoDa,
    fattoAt: a.fattoAt?.toISOString() ?? null,
    notaSpunta: a.notaSpunta,
    modelloId: a.modelloId,
  }))

  const defaultValues = {
    id: c.id,
    nome: c.nome,
    clienteId: c.clienteId ?? '',
    indirizzoCantiere: c.indirizzoCantiere ?? '',
    stato: c.stato,
    note: c.note ?? '',
    istruzioniCantiere: c.istruzioniCantiere ?? '',
    attrezzatureNecessarie: c.attrezzatureNecessarie ?? '',
    tipoLavoroId: c.tipoLavoroId ?? '',
    preventivato: c.preventivato,
    costiMateriali: c.costiMateriali,
    costiManodopera: c.costiManodopera,
    costiMezzi: c.costiMezzi,
    fatturato: c.fatturato,
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Intestazione fissa — sempre visibile sopra i tab */}
      <PageHeader
        backHref="/impresa/commesse"
        backLabel="Commesse"
        title={c.nome}
        subtitle={c.cliente?.nome ?? undefined}
        badge={
          <Badge
            variant={c.stato === 'aperta' ? 'success' : c.stato === 'finita' ? 'warning' : 'neutral'}
            dot={c.stato === 'aperta'}
          >
            {c.stato === 'aperta' ? 'Aperta' : c.stato === 'finita' ? 'Finita — da saldare' : 'Chiusa'}
          </Badge>
        }
        action={
          c.preventivo ? (
            <a
              href={`/impresa/preventivi/${c.preventivo.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm"
            >
              ← Preventivo
            </a>
          ) : undefined
        }
      />

      {/* Banner errore chiusura */}
      {errore === 'non_saldato' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">
            Il cliente non ha ancora saldato. Prima di chiudere il cantiere devi gestire il pagamento.
          </p>
          <p className="text-xs text-red-600">
            Esistono fatture non incassate o il fatturato è inferiore al preventivato.
          </p>
          <a
            href={`/impresa/fatture?commessaId=${id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            Gestisci pagamento — vai alle fatture →
          </a>
        </div>
      )}

      {/* Comando rapido: segna cantiere finito (visibile solo se aperta) */}
      {c.stato === 'aperta' && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <div>
            <p className="text-sm font-medium text-amber-900">Lavori completati?</p>
            <p className="text-xs text-amber-700">Segna il cantiere come finito. Potrai chiuderlo definitivamente dopo il pagamento.</p>
          </div>
          <form action={segnaCantierefinito.bind(null, c.id)}>
            <button
              type="submit"
              className="ml-4 shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 shadow-sm"
            >
              Segna finito
            </button>
          </form>
        </div>
      )}

      {/* KPI finanziari — sempre visibili, riservati all'impresa */}
      {preventivato > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Riepilogo Economico</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Preventivato</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(preventivato)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Fatturato</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(fatturato)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Da Fatturare</p>
              <p className={`text-lg font-bold mt-1 ${daFatturare > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{formatEuro(daFatturare)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Incassato</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{formatEuro(incassato)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Da Incassare</p>
              <p className={`text-lg font-bold mt-1 ${daIncassare > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{formatEuro(daIncassare)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costi Totali</p>
              <p className={`text-lg font-bold mt-1 ${costiTotali > preventivato ? 'text-red-600' : 'text-gray-900'}`}>{formatEuro(costiTotali)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Margine Stimato</p>
              <p className={`text-lg font-bold mt-1 ${margineStimato >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatEuro(margineStimato)} {stimatoPct !== null ? `(${stimatoPct}%)` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Margine Maturato</p>
              <p className={`text-lg font-bold mt-1 ${margineMaturato >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatEuro(margineMaturato)} {maturatoPct !== null ? `(${maturatoPct}%)` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Margine Incassato</p>
              <p className={`text-lg font-bold mt-1 ${margineIncassato >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatEuro(margineIncassato)} {incassatoPct !== null ? `(${incassatoPct}%)` : ''}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costo Materiali</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(costiFornitori > 0 ? costiFornitori : c.costiMateriali)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costo Manodopera</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(costiManodopera)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Costo Mezzi</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatEuro(costiMezzi)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contatore adempimenti — se esistono */}
      {adem.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={`font-semibold ${ademFatte === adem.length ? 'text-emerald-600' : 'text-amber-600'}`}>
            {ademFatte}/{adem.length}
          </span>
          <span>adempimenti completati</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-24">
            <div
              className={`h-full rounded-full ${ademFatte === adem.length ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.round((ademFatte / adem.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Hub a TAB */}
      <CommessaTabs
        commessaId={c.id}
        preventivoId={c.preventivo?.id ?? null}
        formAction={salvaCommessa}
        clienti={clienti}
        tipiLavoro={tipiLavoro}
        defaultValues={defaultValues}
        tipoLavoro={c.tipoLavoro}
        adempimenti={adempimentiRows}
        giornate={giornateRows}
        fatture={fattureRows}
        dico={dicoRows}
        piano={pianoRows}
        operaiAssegnati={operaiAssegnati}
        operaiDisponibili={operaiDisponibili}
      />
    </div>
  )
}
