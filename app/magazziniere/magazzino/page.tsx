import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

export default async function MagazzinoPage() {
  await requireMagazziniere()

  const materiali = await prisma.materiale.findMany({
    orderBy: { descrizione: 'asc' },
    include: { movimenti: { orderBy: { data: 'desc' } } },
  })

  const righe = materiali
    .map(m => {
      const giacenza = m.movimenti.reduce((acc, mv) => {
        if (mv.tipo === 'carico' || mv.tipo === 'reso') return acc + mv.quantita
        if (mv.tipo === 'scarico') return acc - mv.quantita
        return acc
      }, 0)
      return { ...m, giacenza }
    })
    .filter(m => m.movimenti.length > 0)

  const ultimi = await prisma.movimentoMagazzino.findMany({
    orderBy: { data: 'desc' },
    take: 30,
    include: {
      materiale: { select: { descrizione: true, unita: true } },
      commessa: { select: { nome: true } },
    },
  })

  const TIPO_LABEL: Record<string, string> = { carico: 'Carico', scarico: 'Scarico', reso: 'Reso' }
  const TIPO_VARIANT: Record<string, 'success' | 'danger' | 'warning'> = {
    carico: 'success',
    scarico: 'danger',
    reso: 'warning',
  }
  const TIPO_SIGN: Record<string, string> = { carico: '+', scarico: '−', reso: '+' }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giacenza magazzino"
        subtitle={`${righe.length} materiali con movimenti`}
        backHref="/magazziniere/richieste"
        backLabel="Richieste"
      />

      {righe.length === 0 ? (
        <EmptyState
          icon="/immagini/icona-magazzino.png"
          title="Nessun movimento"
          description="Nessun movimento di magazzino registrato ancora."
          action={
            <Link href="/magazziniere/richieste" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700">
              Vai alle richieste
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-premium overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Materiale</th>
                <th className="px-4 py-3 text-right font-semibold">Giacenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {righe.map(m => (
                <tr key={m.id} className={m.giacenza < 0 ? 'bg-red-50/60' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{m.descrizione}</p>
                    {m.codice && <p className="text-xs text-gray-400 mt-0.5">Cod. {m.codice}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${m.giacenza < 0 ? 'text-red-600' : m.giacenza === 0 ? 'text-gray-400' : 'text-emerald-700'}`}>
                      {m.giacenza} {m.unita ?? 'pz'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ultimi.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ultimi movimenti</p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-premium overflow-hidden divide-y divide-gray-100">
            {ultimi.map(mv => (
              <div key={mv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {mv.descrizione ?? mv.materiale?.descrizione ?? '—'}
                  </p>
                  {mv.commessa && (
                    <p className="text-xs text-gray-400 mt-0.5">{mv.commessa.nome}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatData(mv.data)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={TIPO_VARIANT[mv.tipo] ?? 'neutral'}>
                    {TIPO_LABEL[mv.tipo]}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-700">
                    {TIPO_SIGN[mv.tipo]}{mv.quantita} {mv.materiale?.unita ?? 'pz'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
