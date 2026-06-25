import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaAttrezzatura } from '../actions'
import { AttrezzaturaForm } from '../nuovo/page'

export default async function ModificaAttrezzaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const a = await prisma.attrezzatura.findUnique({ where: { id } })
  if (!a) notFound()

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/attrezzature" className="text-sm text-gray-500 hover:text-gray-700">← Attrezzature</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{a.nome}</h1>
      </div>
      <AttrezzaturaForm action={salvaAttrezzatura} dv={{ id: a.id, nome: a.nome, stato: a.stato, assegnatario: a.assegnatario ?? '', note: a.note ?? '' }} />
    </div>
  )
}
