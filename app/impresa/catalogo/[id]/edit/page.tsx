import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CatalogoForm from '../../CatalogoForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditOffertaPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params
  const offerta = await prisma.offertaCatalogo.findUnique({ where: { id } })
  if (!offerta) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/catalogo" className="text-sm text-gray-500 hover:text-gray-700">← Catalogo</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Modifica offerta</h1>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CatalogoForm offerta={offerta} />
      </div>
    </div>
  )
}
