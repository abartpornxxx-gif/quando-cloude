import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import InizioGiornata from './InizioGiornata'

export default async function NuovaGiornataPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Se l'operaio ha già una giornata attiva oggi, redirect diretto
  const giornataAttiva = await prisma.giornata.findFirst({
    where: {
      operaioId: operaio.id,
      data: today,
      stato: 'bozza',
    },
  })
  if (giornataAttiva) redirect(`/operaio/giornata/${giornataAttiva.id}/lavori`)

  // Commesse assegnate aperte
  const commesse = await prisma.commessaOperaio.findMany({
    where: { operaioId: operaio.id, commessa: { stato: 'aperta' } },
    include: { commessa: { select: { id: true, nome: true, indirizzoCantiere: true } } },
  })

  // Pianificazione di oggi (se esiste)
  const pianificazione = await prisma.pianificazione.findFirst({
    where: { operaioId: operaio.id, data: today },
    include: {
      commessa: { select: { id: true, nome: true, indirizzoCantiere: true } },
      mezzo: { select: { id: true, nome: true, targa: true } },
    },
  })

  // Mezzi
  const mezzi = await prisma.mezzo.findMany({
    where: { stato: { in: ['disponibile', 'in_uso'] } },
    select: { id: true, nome: true, targa: true },
    orderBy: { nome: 'asc' },
  })

  // Attrezzature con stato
  const attrezzature = await prisma.attrezzatura.findMany({
    where: { stato: { not: 'fuori_servizio' } },
    orderBy: { nome: 'asc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold">Inizia giornata</h1>
      </div>
      <InizioGiornata
        commesse={commesse.map(c => c.commessa)}
        mezzi={mezzi}
        attrezzature={attrezzature}
        pianificazione={pianificazione ? {
          id: pianificazione.id,
          commessa: pianificazione.commessa,
          mezzo: pianificazione.mezzo,
          lavoroDaFare: pianificazione.lavoroDaFare,
          noteMateriale: pianificazione.noteMateriale,
          note: pianificazione.note,
        } : null}
      />
    </div>
  )
}
