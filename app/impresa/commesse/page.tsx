import { prisma } from '@/lib/prisma'
import { formatEuro } from '@/lib/format'
import { calcolaMargine } from '@/lib/calcoli'
import Link from 'next/link'
import { DeleteButton } from '@/components/DeleteButton'
import { eliminaCommessa } from './actions'

export default async function CommessePage() {
  const commesse = await prisma.commessa.findMany({
    orderBy: { createdAt: 'desc' },
    include: { cliente: { select: { nome: true } } },
  })

  const aperte = commesse.filter(c => c.stato === 'aperta').length
  const chiuse = commesse.filter(c => c.stato === 'chiusa').length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commesse</h1>
          <p className="mt-1 text-sm text-gray-500">
            {aperte} aperte · {chiuse} chiuse
          </p>
        </div>
        <Link href="/impresa/commesse/nuova" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nuova commessa
        </Link>
      </div>

      {commesse.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-500">Nessuna commessa. Creane una o trasforma un preventivo accettato.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commesse.map(c => {
            const margine = calcolaMargine(c)
            return (
              <Link key={c.id} href={`/impresa/commesse/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{c.nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.stato === 'aperta' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.stato === 'aperta' ? 'Aperta' : 'Chiusa'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{c.cliente?.nome ?? 'Senza cliente'}</p>
                </div>
                <div className="ml-4 flex items-center gap-6 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-400">Preventivato</p>
                    <p className="text-sm font-medium text-gray-700">{formatEuro(c.preventivato)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Margine</p>
                    <p className={`text-sm font-bold ${margine >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatEuro(margine)}
                    </p>
                  </div>
                  <DeleteButton action={eliminaCommessa.bind(null, c.id)} label="✕" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
