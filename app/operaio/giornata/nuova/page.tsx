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
      fase: { not: 'completata' },
    },
  })
  if (giornataAttiva) redirect(`/operaio/giornata/${giornataAttiva.id}/lavori`)

  // Se l'operaio ha giornate non chiuse di giorni precedenti, blocca e mostra warning
  const giornataVecchiaAperta = await prisma.giornata.findFirst({
    where: {
      operaioId: operaio.id,
      stato: 'bozza',
      fase: { not: 'completata' },
      data: { lt: today },
    },
    include: { commessa: { select: { nome: true } } },
    orderBy: { data: 'desc' },
  })

  if (giornataVecchiaAperta) {
    const dataStr = giornataVecchiaAperta.data.toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-emerald-900 px-4 py-3">
          <h1 className="text-lg font-bold text-white">Inizia giornata</h1>
        </div>
        <div className="p-4 space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-800 text-base mb-1">Hai una giornata non chiusa</p>
            <p className="text-sm text-red-700 mb-1">
              Giornata del <span className="font-semibold">{dataStr}</span>
            </p>
            <p className="text-sm text-red-700 mb-4">
              Commessa: <span className="font-semibold">{giornataVecchiaAperta.commessa.nome}</span>
            </p>
            <p className="text-xs text-red-600 mb-4">
              Devi completare e consegnare il rapportino di quella giornata prima di poterne iniziare una nuova.
            </p>
            <a
              href={`/operaio/giornata/${giornataVecchiaAperta.id}/lavori`}
              className="inline-flex items-center justify-center w-full rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-3 text-sm shadow-sm"
            >
              Vai alla giornata non chiusa →
            </a>
          </div>
        </div>
      </div>
    )
  }

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
        } : null}
      />
    </div>
  )
}
