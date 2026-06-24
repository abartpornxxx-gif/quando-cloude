import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import FlussoGiornata from './FlussoGiornata'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LavoriPage({ params }: Props) {
  const { id } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) notFound()

  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: { select: { id: true, nome: true, indirizzoCantiere: true, istruzioniCantiere: true, attrezzatureNecessarie: true } },
      pianificazione: { select: { lavoroDaFare: true, noteMateriale: true } },
      foto: { orderBy: { createdAt: 'desc' }, take: 8 },
      attrezzatureUsi: {
        where: { riconsegnata: false },
        include: { attrezzatura: { select: { id: true, nome: true } } },
      },
    },
  })

  if (!giornata) notFound()
  if (giornata.operaioId !== operaio.id) redirect('/operaio/dashboard')
  if (giornata.stato === 'inviata') redirect(`/operaio/giornata/${id}/rapportino`)

  const [suggerimentiAttivi, spunteGiornata] = await Promise.all([
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
        <a href={`/operaio/giornata/${id}/chat`} className="text-blue-600 text-sm font-medium">
          💬 Chat
        </a>
      </div>
      <div className="p-4 max-w-lg mx-auto">
        <FlussoGiornata
          giornataId={id}
          fase={giornata.fase}
          inizioMattina={giornata.inizioMattina?.toISOString() ?? null}
          fineMattina={giornata.fineMattina?.toISOString() ?? null}
          inizioPomeriggio={giornata.inizioPomeriggio?.toISOString() ?? null}
          commessa={giornata.commessa}
          pianificazione={giornata.pianificazione ?? null}
          foto={giornata.foto.map(f => ({ id: f.id, url: f.url }))}
          suggerimenti={suggerimenti}
          attrezzature={giornata.attrezzatureUsi.map(u => u.attrezzatura)}
        />
      </div>
    </div>
  )
}
