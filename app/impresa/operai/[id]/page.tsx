import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaOperaio } from '../actions'
import { OperaioForm } from '../OperaioForm'

export default async function ModificaOperaioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const o = await prisma.operaio.findUnique({ where: { id } })
  if (!o) notFound()

  const skills = Array.isArray(o.skills) ? (o.skills as { nome: string; nota: string }[]) : []

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/operai" className="text-sm text-gray-500 hover:text-gray-700">← Operai</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{o.nome}</h1>
      </div>
      <OperaioForm
        action={salvaOperaio}
        defaultValues={{
          id: o.id, nome: o.nome, ruolo: o.ruolo ?? '', costoOrario: o.costoOrario,
          zona: o.zona ?? '', skills, note: o.note ?? '',
        }}
      />
    </div>
  )
}
