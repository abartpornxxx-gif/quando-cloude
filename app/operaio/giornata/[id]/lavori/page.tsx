import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import FlussoGiornata from './FlussoGiornata'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LavoriPage({ params }: Props) {
  const { id } = await params
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: { select: { id: true, nome: true, indirizzoCantiere: true } },
      pianificazione: { select: { lavoroDaFare: true, noteMateriale: true } },
      foto: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!giornata) notFound()
  if (giornata.operaioId !== operaio.id) redirect('/operaio/dashboard')
  if (giornata.stato === 'inviata') redirect(`/operaio/giornata/${id}/rapportino`)

  const config = await prisma.configurazioneOrari.findFirst() ?? {
    durataMattinaMinuti: 240,
    durataPausaMinuti: 60,
    durataPomeriggioMinuti: 240,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold flex-1">{giornata.commessa.nome}</h1>
        <a href={`/operaio/giornata/${id}/chat`} className="text-blue-600 text-sm">💬 Chat</a>
      </div>
      <FlussoGiornata
        giornataId={id}
        fase={giornata.fase}
        inizioMattina={giornata.inizioMattina?.toISOString() ?? null}
        fineMattina={giornata.fineMattina?.toISOString() ?? null}
        inizioPomeriggio={giornata.inizioPomeriggio?.toISOString() ?? null}
        finePomeriggio={giornata.finePomeriggio?.toISOString() ?? null}
        config={config}
        commessa={giornata.commessa}
        pianificazione={giornata.pianificazione ?? null}
        foto={giornata.foto.map(f => ({ id: f.id, url: f.url }))}
      />
    </div>
  )
}
