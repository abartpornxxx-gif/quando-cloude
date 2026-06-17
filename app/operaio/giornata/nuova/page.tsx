import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WizardGiornata } from './WizardGiornata'

export default async function NuovaGiornataPage() {
  const { operaio } = await requireOperaio()

  const [assegnazioni, mezzi, materiali, checklist] = await Promise.all([
    prisma.commessaOperaio.findMany({
      where: { operaioId: operaio.id },
      include: { commessa: { select: { id: true, nome: true, indirizzoCantiere: true, stato: true } } },
    }),
    prisma.mezzo.findMany({
      where: { stato: 'disponibile' },
      select: { id: true, nome: true, targa: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.materiale.findMany({
      select: { id: true, descrizione: true, codice: true, prezzo: true, unita: true },
      orderBy: { descrizione: 'asc' },
    }),
    prisma.checklistTemplate.findMany({
      where: { attiva: true },
      orderBy: { ordine: 'asc' },
      select: { id: true, domanda: true },
    }),
  ])

  const commesseAperte = assegnazioni
    .filter(a => a.commessa.stato === 'aperta')
    .map(a => a.commessa)

  return (
    <WizardGiornata
      operaioId={operaio.id}
      commesse={commesseAperte}
      mezzi={mezzi}
      materiali={materiali}
      checklist={checklist}
    />
  )
}
