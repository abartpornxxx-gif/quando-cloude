import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import ChatImpresa from './ChatImpresa'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatImpresaPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      operaio: { select: { nome: true } },
      commessa: { select: { nome: true } },
    },
  })
  if (!giornata) notFound()

  const messaggi = await prisma.chatMessaggio.findMany({
    where: { giornataId: id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/impresa/giornate" className="text-blue-600 hover:text-blue-800">‹</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">
            Chat — {giornata.operaio.nome}
          </h1>
          <p className="text-xs text-gray-500">
            {giornata.commessa.nome} · {formatData(giornata.data)}
          </p>
        </div>
      </div>
      <ChatImpresa giornataId={id} messaggi={messaggi} />
    </div>
  )
}
