import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
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
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <Image src="/immagini/successo.png" width={80} height={80} alt="" className="mx-auto mb-4 opacity-90" />
        <p className="text-xl font-bold text-gray-900 mb-2">Rapportino già inviato</p>
        <p className="text-gray-500 mb-6">
          Hai concluso la giornata del {new Date(giornata.data).toLocaleDateString('it-IT')}
        </p>
        <Link href="/operaio/dashboard" className="text-emerald-600 underline font-medium hover:text-emerald-700">
          Torna alla dashboard
        </Link>
      </div>
    )
  }

  // Rapportino bloccato se non si è ancora in fase 'fine'
  if (giornata.fase !== 'fine' && giornata.fase !== 'completata') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-900 mb-2">Rapportino non ancora disponibile</p>
        <p className="text-gray-500 mb-6">Completa le sessioni di lavoro prima di inviare il rapportino.</p>
        <Link href={`/operaio/giornata/${id}/lavori`} className="text-emerald-600 underline font-medium hover:text-emerald-700">
          Torna al flusso giornata
        </Link>
      </div>
    )
  }

  const attrezzatureUsate = giornata.attrezzatureUsi.map(u => u.attrezzatura)

  const materiali = await prisma.materiale.findMany({
    orderBy: { descrizione: 'asc' },
    select: { id: true, descrizione: true, unita: true },
  })

  // Protezione: la tabella cantiere_struttura_nodi potrebbe non esistere ancora nel DB
  let strutturaNodi: { id: string; tipo: string; nome: string; parentId: string | null }[] = []
  try {
    strutturaNodi = await prisma.cantiereStrutturaNodo.findMany({
      where: { commessaId: giornata.commessaId, attivo: true },
      orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
      select: { id: true, tipo: true, nome: true, parentId: true },
    })
  } catch {
    // Tabella non ancora creata — migrazione DB pendente
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-4 py-3 -mx-4 mb-4">
        <h1 className="text-base font-bold text-gray-900">Rapportino di fine giornata</h1>
        <p className="text-sm text-gray-500">{giornata.commessa.nome}</p>
      </div>
      <RapportinoForm
        giornataId={id}
        attrezzatureUsate={attrezzatureUsate}
        materiali={materiali}
        strutturaNodi={strutturaNodi}
      />
    </div>
  )
}
