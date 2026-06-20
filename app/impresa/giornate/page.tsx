import { requireImpresa } from '@/lib/auth'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import GiornateMonitor from './GiornateMonitor'
import StoricoCentroOperativo from './StoricoCentroOperativo'

export default async function CentroOperativoPage() {
  await requireImpresa()

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

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

  // ORDINE 1 — Giornate attive (non ancora chiuse): countdown visibile SOLO all'impresa
  const giornateAttiveRaw = giornate.filter(g => g.stato === 'bozza' && g.fase !== 'completata')
  const giornateAttiveIds = giornateAttiveRaw.map(g => g.id)
  const commesseAttive = [...new Set(giornateAttiveRaw.map(g => g.commessaId))]

  // Badge problema: messaggi con prefisso "⚠️ PROBLEMA:" nelle giornate attive oggi
  const messaggiProblema = giornateAttiveIds.length > 0
    ? await prisma.chatMessaggio.findMany({
        where: {
          giornataId: { in: giornateAttiveIds },
          testo: { startsWith: '⚠️ PROBLEMA:' },
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

  const giornateAttivoData = giornateAttiveRaw.map(g => ({
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

  // ORDINE 4 — Rapportini mancanti: giornate in fase 'fine' senza rapportino
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro Operativo</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {giornateAttiveRaw.length > 0
              ? `${giornateAttiveRaw.length} operaio${giornateAttiveRaw.length > 1 ? 'i' : ''} in cantiere · ${giornateChiuse.length} giornate archiviate`
              : `${giornateChiuse.length} giornate archiviate`}
          </p>
        </div>
      </div>

      {/* ORDINE 4 — Alert rapportini mancanti lato impresa */}
      {rapportiniMancanti.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <p className="font-semibold text-amber-800 text-sm">
            <Image src="/immagini/icona-avviso.png" width={15} height={15} alt="" className="shrink-0 inline-block mr-1.5" />
            {rapportiniMancanti.length} rapportino{rapportiniMancanti.length > 1 ? 'i' : ''} mancante{rapportiniMancanti.length > 1 ? 'i' : ''}
          </p>
          <div className="mt-2 space-y-1">
            {rapportiniMancanti.map(g => (
              <p key={g.id} className="text-sm text-amber-700">
                • {g.operaio.nome} — {g.commessa.nome} ({new Date(g.data).toLocaleDateString('it-IT')})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE ADESSO — polling ogni 30s in GiornateMonitor */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Adesso
        </p>
        <GiornateMonitor
          giornate={giornateAttivoData}
          config={{ durataMattinaMinuti: 240, durataPausaMinuti: 60, durataPomeriggioMinuti: 240 }}
        />
      </div>

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
