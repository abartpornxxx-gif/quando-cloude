import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PianificazioneBoard } from './PianificazioneBoard'

const GIORNI_ITA = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

function getMonday(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return {
      date: d.toISOString().slice(0, 10),
      label: `${GIORNI_ITA[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
    }
  })
}

export default async function PianificazionePage({
  searchParams,
}: {
  searchParams: Promise<{ settimana?: string }>
}) {
  await requireImpresa()
  const { settimana } = await searchParams

  const weekStart = settimana ? new Date(settimana) : getMonday(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekDays = getWeekDays(weekStart)

  const [commesse, operai, rawPians] = await Promise.all([
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
      where: { data: { gte: weekStart, lte: weekEnd } },
      include: { operaio: { select: { id: true, nome: true } } },
      orderBy: { data: 'asc' },
    }),
  ])

  const pians = rawPians.map(p => ({
    id: p.id,
    commessaId: p.commessaId,
    operaioId: p.operaioId,
    data: (p.data as Date).toISOString().slice(0, 10),
    operaio: p.operaio,
    sostituito: p.sostituito,
    lavoroDaFare: p.lavoroDaFare ?? null,
    noteMateriale: p.noteMateriale ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pianificazione settimanale</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Trascina un operaio dal pannello sinistro sul cantiere desiderato
          </p>
        </div>
        <a
          href="/impresa/pianificazione/domani"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          📅 Pianifica domani
        </a>
      </div>
      <PianificazioneBoard
        weekDays={weekDays}
        commesse={commesse}
        operai={operai}
        pianificazioni={pians}
        weekStart={weekStart.toISOString().slice(0, 10)}
      />
    </div>
  )
}
