import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatData } from '@/lib/format'
import ChatMagazziniere from './ChatMagazziniere'

interface Props {
  params: Promise<{ giornataId: string }>
}

export default async function ChatMagazzinierePage({ params }: Props) {
  await requireMagazziniere()
  const { giornataId } = await params

  const giornata = await prisma.giornata.findUnique({
    where: { id: giornataId },
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
  })
  if (!giornata) notFound()

  const messaggi = await prisma.chatMessaggio.findMany({
    where: { giornataId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a href="/magazziniere/richieste" className="text-yellow-700 font-bold text-lg">‹</a>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">
            Chat — {giornata.operaio.nome}
          </h1>
          <p className="text-xs text-gray-500">
            {giornata.commessa.nome} · {formatData(giornata.data)}
          </p>
        </div>
      </div>
      <ChatMagazziniere giornataId={giornataId} messaggi={messaggi} />
    </div>
  )
}
