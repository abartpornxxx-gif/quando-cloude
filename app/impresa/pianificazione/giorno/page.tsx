import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GiornoView } from './GiornoView'
import { PianificazioneSubNav } from '../PianificazioneSubNav'

export default async function PianificazioneGiornoPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  await requireImpresa()
  const { data } = await searchParams

  const dataStr = data ?? new Date().toISOString().slice(0, 10)

  const dayObj = new Date(dataStr)
  const nextDayObj = new Date(dataStr)
  nextDayObj.setUTCDate(nextDayObj.getUTCDate() + 1)

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
      where: { data: { gte: dayObj, lt: nextDayObj } },
      include: { operaio: { select: { id: true, nome: true } } },
    }),
  ])

  const pianificazioni = rawPians.map(p => ({
    id: p.id,
    commessaId: p.commessaId,
    operaioId: p.operaioId,
    operaio: p.operaio,
    sostituito: p.sostituito,
  }))

  return (
    <div className="space-y-5">
      <PianificazioneSubNav />
      <GiornoView
        data={dataStr}
        commesse={commesse}
        operai={operai}
        pianificazioni={pianificazioni}
      />
    </div>
  )
}
