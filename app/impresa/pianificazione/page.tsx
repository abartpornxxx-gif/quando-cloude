import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PianificazioneSubNav } from './PianificazioneSubNav'
import PianificazioneGiornaliera from './PianificazioneGiornaliera'

export default async function PianificazionePage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string }>
}) {
  await requireImpresa()
  const { giorno: giornoParam } = await searchParams

  // Giorno selezionato — default oggi
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const giornoISO = giornoParam ?? oggi.toISOString().slice(0, 10)
  const giornoDate = new Date(giornoISO)

  const [commesse, operai, rawPians, assenze] = await Promise.all([
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
      where: { data: giornoDate },
      include: { operaio: { select: { id: true, nome: true } } },
    }),
    prisma.assenza.findMany({
      where: {
        stato: 'approvata',
        dataInizio: { lte: giornoDate },
        dataFine: { gte: giornoDate },
      },
      select: { operaioId: true },
    }),
  ])

  const pianificazioni = rawPians.map(p => ({
    id: p.id,
    commessaId: p.commessaId,
    operaioId: p.operaioId,
    operaioNome: p.operaio.nome,
  }))

  const operaiInFerie = new Set(assenze.map(a => a.operaioId))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pianificazione</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assegna gli operai ai cantieri giorno per giorno.</p>
      </div>

      {/* Navigazione tra viste */}
      <PianificazioneSubNav />

      {/* Vista principale */}
      <PianificazioneGiornaliera
        commesse={commesse}
        operai={operai}
        pianificazioni={pianificazioni}
        giornoIniziale={giornoISO}
        operaiInFerie={[...operaiInFerie]}
      />
    </div>
  )
}
