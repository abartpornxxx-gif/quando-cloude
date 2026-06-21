import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DomaniPlannerView } from './DomaniPlannerView'

export default async function PianificazioneDomaniPage() {
  await requireImpresa()

  const domani = new Date()
  domani.setDate(domani.getDate() + 1)
  domani.setHours(0, 0, 0, 0)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)

  const dataStr = domani.toISOString().slice(0, 10)
  const dataLabel = domani.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const [commesse, operai, rawPians, rapportini] = await Promise.all([
    prisma.commessa.findMany({
      where: { stato: 'aperta', archiviata: false },
      select: { id: true, nome: true, indirizzoCantiere: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.operaio.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.pianificazione.findMany({
      where: { data: { gte: domani, lt: dopodomani }, sostituito: false },
      include: { operaio: { select: { id: true, nome: true } } },
    }),
    prisma.rapportino.findMany({
      where: {
        cosaFareDomani: { not: null },
        giornata: {
          data: { gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          stato: 'inviata',
        },
      },
      include: {
        giornata: {
          include: {
            operaio: { select: { id: true, nome: true } },
            commessa: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: [{ urgenzaDomani: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  const pianificazioni = rawPians.map(p => ({
    id: p.id,
    commessaId: p.commessaId,
    operaioId: p.operaioId,
    operaio: p.operaio,
    lavoroDaFare: p.lavoroDaFare ?? null,
  }))

  const pianiOperaiIds = new Set(pianificazioni.map(p => p.operaioId))

  const suggerimenti = rapportini.map(r => ({
    id: r.id,
    operaio: r.giornata.operaio,
    commessa: r.giornata.commessa,
    cosaFareDomani: r.cosaFareDomani ?? '',
    urgenzaDomani: r.urgenzaDomani,
    stimaOreDomani: r.stimaOreDomani,
    giaAssegnato: pianiOperaiIds.has(r.giornata.operaio.id),
  }))

  return (
    <DomaniPlannerView
      data={dataStr}
      dataLabel={dataLabel}
      commesse={commesse}
      operai={operai}
      pianificazioni={pianificazioni}
      suggerimenti={suggerimenti}
    />
  )
}
