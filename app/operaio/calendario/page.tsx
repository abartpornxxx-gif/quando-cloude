import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CalendarioMensile } from '@/components/CalendarioMensile'
import type { CalEvent } from '@/components/CalendarioMensile'

export default async function OperaioCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string; mese?: string }>
}) {
  const { operaio } = await requireOperaio()
  const { anno: annoStr, mese: meseStr } = await searchParams

  const now = new Date()
  const anno = annoStr ? parseInt(annoStr) : now.getFullYear()
  const mese = meseStr ? parseInt(meseStr) : now.getMonth() + 1

  const firstDay = new Date(anno, mese - 1, 1)
  const lastDay = new Date(anno, mese, 0, 23, 59, 59)

  const [giornate, pianificazioni, assenze] = await Promise.all([
    prisma.giornata.findMany({
      where: { operaioId: operaio.id, data: { gte: firstDay, lte: lastDay } },
      include: { commessa: { select: { nome: true } } },
    }),
    prisma.pianificazione.findMany({
      where: {
        operaioId: operaio.id,
        sostituito: false,
        data: { gte: firstDay, lte: lastDay },
      },
      include: { commessa: { select: { nome: true } } },
    }),
    prisma.assenza.findMany({
      where: {
        operaioId: operaio.id,
        stato: { not: 'rifiutata' },
        dataInizio: { lte: lastDay },
        dataFine: { gte: firstDay },
      },
    }),
  ])

  const events: CalEvent[] = [
    ...giornate.map(g => ({
      date: (g.data as Date).toISOString().slice(0, 10),
      type: 'giornata' as const,
      label: g.commessa.nome,
    })),
    ...pianificazioni.map(p => ({
      date: (p.data as Date).toISOString().slice(0, 10),
      type: 'pianificazione' as const,
      label: p.commessa.nome,
    })),
    ...assenze.flatMap(a => {
      const start = new Date(Math.max((a.dataInizio as Date).getTime(), firstDay.getTime()))
      const end = new Date(Math.min((a.dataFine as Date).getTime(), lastDay.getTime()))
      const dayEvents: CalEvent[] = []
      const d = new Date(start)
      while (d <= end) {
        dayEvents.push({ date: d.toISOString().slice(0, 10), type: 'assenza', label: a.tipo })
        d.setDate(d.getDate() + 1)
      }
      return dayEvents
    }),
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Il mio calendario</h1>
      <CalendarioMensile
        anno={anno}
        mese={mese}
        events={events}
        baseUrl="/operaio/calendario"
      />
    </div>
  )
}
