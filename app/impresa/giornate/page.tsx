import { requireImpresa } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { startOfTodayItaly } from '@/lib/date'
import GiornateMonitor from './GiornateMonitor'
import StoricoCentroOperativo from './StoricoCentroOperativo'
import { PianificazioneSubNav } from '../pianificazione/PianificazioneSubNav'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function CentroOperativoPage() {
  await requireImpresa()

  const oggi = startOfTodayItaly()

  const giornate = await prisma.giornata.findMany({
    include: {
      operaio: { select: { id: true, nome: true } },
      commessa: { select: { id: true, nome: true, indirizzoCantiere: true } },
      rapportino: {
        select: {
          lavoroEseguito: true,
          cosaFareDomani: true,
          noteGiornoSuccessivo: true,
          lavoriExtra: true,
          urgenzaDomani: true,
        },
      },
      ore: true,
      foto: { select: { url: true }, take: 1 },
    },
    orderBy: { data: 'desc' },
    take: 150,
  })

  // ORDINE 1 â€” Giornate attive (non ancora chiuse): countdown visibile SOLO all'impresa
  const giornateAttiveRaw = giornate.filter(g => g.stato === 'bozza' && g.fase !== 'completata')
  // Solo le giornate di OGGI vanno in ADESSO con timer live
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)
  const giornateAdesso = giornateAttiveRaw.filter(g => g.data >= oggi && g.data < domani)
  const giornateNonChiuse = giornateAttiveRaw.filter(g => g.data < oggi)
  const giornateAttiveIds = giornateAttiveRaw.map(g => g.id)
  const commesseAttive = [...new Set(giornateAttiveRaw.map(g => g.commessaId))]

  // Badge problema: messaggi con prefisso "âš ï¸ PROBLEMA:" nelle giornate attive oggi
  const messaggiProblema = giornateAttiveIds.length > 0
    ? await prisma.chatMessaggio.findMany({
        where: {
          giornataId: { in: giornateAttiveIds },
          testo: { startsWith: 'âš ï¸ PROBLEMA:' },
          createdAt: { gte: oggi },
        },
        select: { giornataId: true },
      })
    : []

  const giornateConProblema = new Set(messaggiProblema.map(m => m.giornataId))

  // Badge urgenza: ultimo rapportino per commessa con urgenzaDomani > 3
  const ultimiRapportini = commesseAttive.length > 0
    ? await prisma.rapportino.findMany({
        where: { giornata: { commessaId: { in: commesseAttive } } },
        orderBy: { giornata: { data: 'desc' } },
        select: {
          urgenzaDomani: true,
          giornata: { select: { commessaId: true } },
        },
      })
    : []

  const urgenzaPerCommessa = new Map<string, number>()
  for (const r of ultimiRapportini) {
    const cId = r.giornata.commessaId
    if (!urgenzaPerCommessa.has(cId) && r.urgenzaDomani != null) {
      urgenzaPerCommessa.set(cId, r.urgenzaDomani)
    }
  }

  const giornateConUrgenza = new Set(
    giornateAttiveRaw
      .filter(g => (urgenzaPerCommessa.get(g.commessaId) ?? 0) > 3)
      .map(g => g.id),
  )

  const giornateAttivoData = giornateAdesso.map(g => ({
    id: g.id,
    operaioNome: g.operaio.nome,
    commessaNome: g.commessa.nome,
    commessaIndirizzo: g.commessa.indirizzoCantiere ?? null,
    fase: g.fase,
    inizioMattina: g.inizioMattina?.toISOString() ?? null,
    fineMattina: g.fineMattina?.toISOString() ?? null,
    inizioPomeriggio: g.inizioPomeriggio?.toISOString() ?? null,
    hasProblema: giornateConProblema.has(g.id),
    hasUrgenza: giornateConUrgenza.has(g.id),
  }))

  // ORDINE 4 â€” Rapportini mancanti: giornate in fase 'fine' senza rapportino
  const rapportiniMancanti = giornate.filter(g => g.fase === 'fine' && !g.rapportino)

  // Storico giornate chiuse
  const giornateChiuse = giornate
    .filter(g => g.stato === 'inviata' || g.fase === 'completata')
    .map(g => ({
      id: g.id,
      operaioId: g.operaioId,
      commessaId: g.commessaId,
      operaioNome: g.operaio.nome,
      commessaNome: g.commessa.nome,
      data: g.data.toISOString(),
      hasRapportino: !!g.rapportino,
      lavoroEseguito: g.rapportino?.lavoroEseguito ?? null,
      cosaFareDomani: g.rapportino?.cosaFareDomani ?? null,
      ore: g.ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0),
      oreStr: g.ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0),
      fotoUrl: g.foto[0]?.url ?? null,
    }))

  // Operai e commesse unici per i filtri dello storico
  const operaiUnici = [...new Map(giornateChiuse.map(g => [g.operaioId, g.operaioNome])).entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const commesseUniche = [...new Map(giornateChiuse.map(g => [g.commessaId, g.commessaNome])).entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const centroSub = giornateAdesso.length > 0
    ? `${giornateAdesso.length} operaio${giornateAdesso.length > 1 ? 'i' : ''} in cantiere${giornateNonChiuse.length > 0 ? ` · ${giornateNonChiuse.length} non chiuse` : ''} · ${giornateChiuse.length} archiviate`
    : giornateNonChiuse.length > 0
      ? `${giornateNonChiuse.length} non chiuse · ${giornateChiuse.length} archiviate`
      : `${giornateChiuse.length} giornate archiviate`

  return (
    <div className="space-y-6">
      <PianificazioneSubNav />
      <PageHeader title="Centro Operativo" subtitle={centroSub} />

      {/* ORDINE 4 â€” Alert rapportini mancanti lato impresa */}
      {rapportiniMancanti.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <p className="font-semibold text-amber-800 text-sm">
            <Image src="/immagini/icona-avviso.png" width={15} height={15} alt="" className="shrink-0 inline-block mr-1.5" />
            {rapportiniMancanti.length} rapportino{rapportiniMancanti.length > 1 ? 'i' : ''} mancante{rapportiniMancanti.length > 1 ? 'i' : ''}
          </p>
          <div className="mt-2 space-y-1">
            {rapportiniMancanti.map(g => (
              <p key={g.id} className="text-sm text-amber-700">
                â€¢ {g.operaio.nome} â€” {g.commessa.nome} ({new Date(g.data).toLocaleDateString('it-IT')})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE ADESSO â€” polling ogni 30s in GiornateMonitor */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Adesso
        </p>
        <GiornateMonitor
          giornate={giornateAttivoData}
          config={{ durataMattinaMinuti: 240, durataPausaMinuti: 60, durataPomeriggioMinuti: 240 }}
        />
      </div>

      {/* SEZIONE NON CHIUSE â€” giornate di giorni precedenti mai terminate */}
      {giornateNonChiuse.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Giornate non chiuse
          </p>
          <div className="rounded-2xl border border-red-200 bg-white shadow-card overflow-hidden divide-y divide-red-100">
            {giornateNonChiuse.map(g => (
              <div key={g.id} className="px-5 py-4 flex items-center gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-red-100 text-red-700 text-sm font-bold flex items-center justify-center select-none">
                  {g.operaio.nome.split(' ').map((p: string) => p[0] ?? '').join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{g.operaio.nome}</p>
                    <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">
                      Non chiusa
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 truncate">{g.commessa.nome}</p>
                  <p className="text-xs text-gray-400">
                    {g.data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} · fase: {g.fase}
                  </p>
                </div>
                <a
                  href={`/impresa/giornate/${g.id}/chat`}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  ðŸ’¬ Chat
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE STORICO con filtri */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Storico giornate
        </p>
        <StoricoCentroOperativo
          giornate={giornateChiuse}
          operai={operaiUnici}
          commesse={commesseUniche}
        />
      </div>
    </div>
  )
}

