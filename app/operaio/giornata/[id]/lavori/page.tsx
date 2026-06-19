import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
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

  const [config, suggerimentiAttivi, spunteGiornata] = await Promise.all([
    prisma.configurazioneOrari.findFirst().then(c => c ?? {
      durataMattinaMinuti: 240,
      durataPausaMinuti: 60,
      durataPomeriggioMinuti: 240,
    }),
    prisma.suggerimentoCantiere.findMany({
      where: { attivo: true },
      orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.suggerimentoSpunta.findMany({
      where: { giornataId: id },
    }),
  ])

  const suggerimenti = suggerimentiAttivi.map(s => ({
    id: s.id,
    testo: s.testo,
    categoria: s.categoria,
    completato: spunteGiornata.find(sp => sp.suggerimentoId === s.id)?.completato ?? false,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <h1 className="text-lg font-bold flex-1">{giornata.commessa.nome}</h1>
        <a href={`/operaio/giornata/${id}/chat`} className="text-blue-600 text-sm flex items-center gap-1">
          <Image src="/immagini/icona-chat.png" width={14} height={14} alt="" className="opacity-70" />
          Chat
        </a>
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
        suggerimenti={suggerimenti}
      />
    </div>
  )
}
