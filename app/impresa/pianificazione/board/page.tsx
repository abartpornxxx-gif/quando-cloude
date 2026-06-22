import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PianificazioneBoard } from '../PianificazioneBoard'
import { PianificazioneSubNav } from '../PianificazioneSubNav'

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

export default async function BoardPage({
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
    <div className="space-y-5">
      <PianificazioneSubNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vista settimanale</h1>
        <p className="text-sm text-gray-500 mt-0.5">Board drag-and-drop per settimana.</p>
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
