import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import RapportinoForm from './RapportinoForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RapportinoPage({ params }: Props) {
  const { id } = await params
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: { select: { nome: true } },
      rapportino: true,
      attrezzatureUsi: {
        where: { riconsegnata: false },
        include: { attrezzatura: { select: { id: true, nome: true } } },
      },
    },
  })

  if (!giornata) notFound()
  if (giornata.operaioId !== operaio.id) redirect('/operaio/dashboard')

  // Rapportino già inviato
  if (giornata.rapportino) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-4xl mb-4">✅</p>
        <p className="text-xl font-bold mb-2">Rapportino già inviato</p>
        <p className="text-gray-500 mb-6">Hai concluso la giornata del {new Date(giornata.data).toLocaleDateString('it-IT')}</p>
        <a href="/operaio/dashboard" className="text-blue-600 underline">Torna alla dashboard</a>
      </div>
    )
  }

  // Rapportino bloccato se non si è ancora in fase 'fine'
  if (giornata.fase !== 'fine' && giornata.fase !== 'completata') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-xl font-bold mb-2">Rapportino non ancora disponibile</p>
        <p className="text-gray-500 mb-6">Completa le sessioni di lavoro prima di inviare il rapportino.</p>
        <a href={`/operaio/giornata/${id}/lavori`} className="text-blue-600 underline">Torna al flusso giornata</a>
      </div>
    )
  }

  const attrezzatureUsate = giornata.attrezzatureUsi.map(u => u.attrezzatura)

  const materiali = await prisma.materiale.findMany({
    orderBy: { descrizione: 'asc' },
    select: { id: true, descrizione: true, unita: true },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold">Rapportino di fine giornata</h1>
        <p className="text-sm text-gray-500">{giornata.commessa.nome}</p>
      </div>
      <RapportinoForm
        giornataId={id}
        attrezzatureUsate={attrezzatureUsate}
        materiali={materiali}
      />
    </div>
  )
}
