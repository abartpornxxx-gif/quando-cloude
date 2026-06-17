import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import RichiestaDettaglio from './RichiestaDettaglio'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RichiestaPage({ params }: Props) {
  const { id } = await params
  await requireMagazziniere()

  const [richiesta, materiali] = await Promise.all([
    prisma.richiestaMateriale.findUnique({
      where: { id },
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true, indirizzoCantiere: true } },
        materiale: { select: { id: true, descrizione: true } },
      },
    }),
    prisma.materiale.findMany({
      orderBy: { descrizione: 'asc' },
      select: { id: true, codice: true, descrizione: true },
    }),
  ])
  if (!richiesta) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a href="/magazziniere/richieste" className="text-blue-600">‹</a>
        <h1 className="text-base font-bold">Dettaglio richiesta</h1>
      </div>
      <RichiestaDettaglio richiesta={richiesta} materiali={materiali} />
    </div>
  )
}
