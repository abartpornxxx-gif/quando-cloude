import { requireImpresa } from '@/lib/auth'
import Link from 'next/link'
import CatalogoForm from '../CatalogoForm'

export default async function NuovaOffertaPage() {
  await requireImpresa()
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/catalogo" className="text-sm text-gray-500 hover:text-gray-700">← Catalogo</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuova offerta</h1>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CatalogoForm />
      </div>
    </div>
  )
}
