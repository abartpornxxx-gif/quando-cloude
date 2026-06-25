import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaMezzo } from '../actions'
import { MezzoForm } from '../nuovo/page'
import { dateToInput } from '@/lib/format'

export default async function ModificaMezzoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await prisma.mezzo.findUnique({ where: { id } })
  if (!m) notFound()

  const dv = {
    id: m.id, nome: m.nome, targa: m.targa ?? '', stato: m.stato,
    scadenzaBollo: dateToInput(m.scadenzaBollo),
    scadenzaRevisione: dateToInput(m.scadenzaRevisione),
    scadenzaAssicurazione: dateToInput(m.scadenzaAssicurazione),
    note: m.note ?? '',
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/mezzi" className="text-sm text-gray-500 hover:text-gray-700">← Mezzi</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{m.nome}</h1>
      </div>
      <MezzoForm action={salvaMezzo} dv={dv} />
    </div>
  )
}
