import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { salvaCommessa } from '../actions'
import { CommessaForm } from '../CommessaForm'

export default async function NuovaCommessaPage() {
  const [clienti, tipiLavoro] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    prisma.tipoLavoro.findMany({ where: { attivo: true }, orderBy: [{ ordine: 'asc' }, { nome: 'asc' }], select: { id: true, nome: true } }),
  ])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/commesse" className="text-sm text-gray-500 hover:text-gray-700">← Commesse</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuova commessa</h1>
      </div>
      <CommessaForm action={salvaCommessa} clienti={clienti} tipiLavoro={tipiLavoro} />
    </div>
  )
}
