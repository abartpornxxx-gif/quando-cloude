import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatData } from '@/lib/format'

export default async function DiCoPage() {
  await requireImpresa()

  const dicos = await prisma.dichiarazioneConformita.findMany({
    include: { commessa: { select: { nome: true } } },
    orderBy: { data: 'desc' },
  })

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Dichiarazioni di Conformità</h1>
          <p className="text-xs text-gray-500 mt-0.5">DM 37/2008 — CEI 64-8</p>
        </div>
        <Link
          href="/impresa/dico/nuova"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Nuova DiCo
        </Link>
      </div>

      {dicos.length === 0 && (
        <p className="text-gray-400 text-sm">Nessuna dichiarazione ancora.</p>
      )}

      <div className="bg-white rounded-xl border divide-y">
        {dicos.map(d => (
          <Link
            key={d.id}
            href={`/impresa/dico/${d.id}`}
            className="flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{d.committenteNome}</p>
              <p className="text-xs text-gray-500">{d.indirizzoImpianto}</p>
              <p className="text-xs text-gray-400">
                {d.tipoImpianto} · {d.commessa?.nome ? `Commessa: ${d.commessa.nome}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-sm text-gray-600">{formatData(d.data)}</p>
              <p className="text-xs text-blue-600">Visualizza →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
