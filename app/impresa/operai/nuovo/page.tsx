import { salvaOperaio } from '../actions'
import { OperaioForm } from '../OperaioForm'
import Link from 'next/link'

export default function NuovoOperaioPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/operai" className="text-sm text-gray-500 hover:text-gray-700">← Operai</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Nuovo operaio</h1>
      </div>
      <OperaioForm action={salvaOperaio} />
    </div>
  )
}
