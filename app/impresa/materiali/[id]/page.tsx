import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaMateriale } from '../actions'
import { MaterialeForm } from '../nuovo/page'
import { centsToInput } from '@/lib/format'

export default async function ModificaMaterialePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await prisma.materiale.findUnique({ where: { id } })
  if (!m) notFound()

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/materiali" className="text-sm text-gray-500 hover:text-gray-700">← Materiali</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{m.descrizione}</h1>
      </div>
      <MaterialeForm action={salvaMateriale} dv={{ id: m.id, codice: m.codice ?? '', descrizione: m.descrizione, prezzo: centsToInput(m.prezzo), unita: m.unita ?? 'pz' }} />
    </div>
  )
}
