import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { CalendarDays, CalendarClock, CalendarRange, MonitorCheck, LayoutList } from 'lucide-react'
import PianificazioneGiornaliera from './PianificazioneGiornaliera'

const VISTE_RAPIDE = [
  { href: '/impresa/pianificazione/domani', label: 'Pianifica domani', Icon: CalendarDays },
  { href: '/impresa/pianificazione/giorno',  label: 'Vista giorno',    Icon: CalendarClock },
  { href: '/impresa/calendario',             label: 'Calendario',      Icon: CalendarRange },
  { href: '/impresa/giornate',               label: 'Centro Op.',      Icon: MonitorCheck },
  { href: '/impresa/pianificazione/board',   label: 'Vista settimana', Icon: LayoutList },
] as const

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
      where: { data: giornoDate },
      include: { operaio: { select: { id: true, nome: true } } },
    }),
  ])

  const pianificazioni = rawPians.map(p => ({
    id: p.id,
    commessaId: p.commessaId,
    operaioId: p.operaioId,
    operaioNome: p.operaio.nome,
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pianificazione</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assegna gli operai ai cantieri giorno per giorno.</p>
      </div>

      {/* Viste rapide */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {VISTE_RAPIDE.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex-none flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:border-blue-200 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>

      {/* Vista principale */}
      <PianificazioneGiornaliera
        commesse={commesse}
        operai={operai}
        pianificazioni={pianificazioni}
        giornoIniziale={giornoISO}
      />
    </div>
  )
}
