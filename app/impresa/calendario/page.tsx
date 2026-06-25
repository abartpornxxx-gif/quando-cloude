import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CalendarioMensile } from '@/components/CalendarioMensile'
import type { CalEvent } from '@/components/CalendarioMensile'
import { PianificazioneSubNav } from '../pianificazione/PianificazioneSubNav'

export default async function CalendarioImpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ anno?: string; mese?: string }>
}) {
  await requireImpresa()
  const { anno: annoStr, mese: meseStr } = await searchParams

  const now = new Date()
  const anno = annoStr ? parseInt(annoStr) : now.getFullYear()
  const mese = meseStr ? parseInt(meseStr) : now.getMonth() + 1

  const firstDay = new Date(anno, mese - 1, 1)
  const lastDay = new Date(anno, mese, 0, 23, 59, 59)

  const [giornate, pianificazioni, assenze] = await Promise.all([
    prisma.giornata.findMany({
      where: { data: { gte: firstDay, lte: lastDay } },
      include: {
        commessa: { select: { nome: true } },
        operaio: { select: { nome: true } },
      },
    }),
    prisma.pianificazione.findMany({
      where: { data: { gte: firstDay, lte: lastDay } },
      include: {
        commessa: { select: { nome: true } },
        operaio: { select: { nome: true } },
      },
    }),
    prisma.assenza.findMany({
      where: {
        stato: { not: 'rifiutata' },
        dataInizio: { lte: lastDay },
        dataFine: { gte: firstDay },
      },
      include: { operaio: { select: { nome: true } } },
    }),
  ])

  const events: CalEvent[] = [
    ...giornate.map(g => ({
      date: (g.data as Date).toISOString().slice(0, 10),
      type: 'giornata' as const,
      label: `${g.operaio.nome} → ${g.commessa.nome}`,
    })),
    ...pianificazioni.map(p => ({
      date: (p.data as Date).toISOString().slice(0, 10),
      type: 'pianificazione' as const,
      label: `${p.operaio.nome} → ${p.commessa.nome}`,
    })),
    // Expand assenze per ogni giorno nell'intervallo del mese
    ...assenze.flatMap(a => {
      const start = new Date(Math.max((a.dataInizio as Date).getTime(), firstDay.getTime()))
      const end = new Date(Math.min((a.dataFine as Date).getTime(), lastDay.getTime()))
      const dayEvents: CalEvent[] = []
      const d = new Date(start)
      while (d <= end) {
        dayEvents.push({
          date: d.toISOString().slice(0, 10),
          type: 'assenza',
          label: `${a.operaio.nome} — ${a.tipo}`,
        })
        d.setDate(d.getDate() + 1)
      }
      return dayEvents
    }),
  ]

  const totGiornate = giornate.length
  const totPianificate = pianificazioni.filter(p => !p.sostituito).length
  const totAssenze = assenze.filter(a => a.stato === 'approvata').length

  return (
    <div className="space-y-6">
      <PianificazioneSubNav />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <p className="mt-0.5 text-sm text-gray-500">Panoramica di giornate, pianificazioni e assenze</p>
      </div>

      {/* Riepilogo mese */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{totGiornate}</div>
          <div className="mt-0.5 text-xs text-gray-500">Giornate registrate</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totPianificate}</div>
          <div className="mt-0.5 text-xs text-gray-500">Giorni pianificati</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{totAssenze}</div>
          <div className="mt-0.5 text-xs text-gray-500">Assenze approvate</div>
        </div>
      </div>

      <CalendarioMensile
        anno={anno}
        mese={mese}
        events={events}
        baseUrl="/impresa/calendario"
      />
    </div>
  )
}
