import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import ChatGiornata from './ChatGiornata'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    select: { operaioId: true, commessa: { select: { nome: true } } },
  })
  if (!giornata) notFound()
  if (giornata.operaioId !== operaio.id) redirect('/operaio/dashboard')

  const messaggi = await prisma.chatMessaggio.findMany({
    where: { giornataId: id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a href={`/operaio/giornata/${id}/lavori`} className="text-blue-600">‹</a>
        <h1 className="text-base font-bold">Chat — {giornata.commessa.nome}</h1>
      </div>
      <ChatGiornata giornataId={id} messaggi={messaggi} />
    </div>
  )
}
