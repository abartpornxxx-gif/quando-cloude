import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CalendarDays, CalendarClock, CalendarRange, MonitorCheck } from 'lucide-react'
import { PianificazioneBoard } from './PianificazioneBoard'

const VISTE_RAPIDE = [
  { href: '/impresa/pianificazione/domani', label: 'Pianifica domani', desc: 'Assegna operai al giorno successivo', Icon: CalendarDays },
  { href: '/impresa/pianificazione/giorno', label: 'Vista giorno', desc: 'Singolo giorno touch-friendly', Icon: CalendarClock },
  { href: '/impresa/calendario', label: 'Calendario mensile', desc: 'Vista mensile pianificazioni', Icon: CalendarRange },
  { href: '/impresa/giornate', label: 'Centro Operativo', desc: 'Chi è in cantiere adesso', Icon: MonitorCheck },
] as const

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
      {/* Accesso rapido viste correlate */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Viste disponibili</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VISTE_RAPIDE.map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
            >
              <Icon size={18} className="text-blue-600 group-hover:text-blue-700" />
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{label}</p>
              <p className="text-xs text-gray-500 leading-snug">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Board settimanale */}
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pianificazione settimanale</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Clicca + per assegnare un operaio · alterna vista per cantiere o per operaio
            </p>
          </div>
        </div>
        <PianificazioneBoard
          weekDays={weekDays}
          commesse={commesse}
          operai={operai}
          pianificazioni={pians}
          weekStart={weekStart.toISOString().slice(0, 10)}
        />
      </div>
    </div>
  )
}
