import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

function toDateKey(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
}

export default async function CommessaMaterialiPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireImpresa()
  const { id } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id },
    include: {
      preventivo: {
        include: {
          righe: { orderBy: { ordine: 'asc' } },
        },
      },
      giornate: {
        include: {
          materiali: {
            include: { materiale: { select: { codice: true, unita: true } } },
          },
          rapportino: { select: { id: true } },
        },
      },
      ordini: {
        include: {
          fornitore: { select: { nome: true } },
          righe: { include: { materiale: { select: { codice: true, unita: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
      movimenti: {
        include: { materiale: { select: { descrizione: true, unita: true } } },
        orderBy: { data: 'desc' },
      },
    },
  })

  if (!commessa) notFound()

  // Calcola totale preventivato (dal preventivo)
  const totalePrev = (commessa.preventivo?.righe ?? []).reduce(
    (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
    0
  )

  // Calcolo totale ordini consegnati/usati (costi materiali reali acquistati)
  const ordiniConsegnati = commessa.ordini.filter(
    o => o.stato === 'consegnato' || o.stato === 'usato'
  )
  const totaleOrdini = ordiniConsegnati.reduce(
    (acc, o) => acc + o.righe.reduce((a, r) => a + Math.round(r.quantita * r.prezzoUnitario), 0),
    0
  )

  // Calcola totale materiale usato in cantiere (da GiornataMateriale)
  const tuttiMateriali = commessa.giornate.flatMap(g => g.materiali)
  const totaleUsato = tuttiMateriali.reduce(
    (acc, m) => acc + Math.round(m.quantita * m.prezzoUnitario),
    0
  )

  const scostamento = totaleOrdini - totalePrev

  // Mappa data → giornataId per collegare i movimenti reso ai rapportini
  const giornataPerData = new Map<string, string>()
  for (const g of commessa.giornate) {
    if (g.rapportino) {
      giornataPerData.set(toDateKey(g.data), g.id)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/impresa/commesse/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {commessa.nome}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Materiali</h1>
      </div>

      {/* Riepilogo finanziario */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Preventivato</p>
          <p className="text-xl font-bold text-gray-900">{formatEuro(totalePrev)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Acquistato (ordini)</p>
          <p className="text-xl font-bold text-gray-900">{formatEuro(totaleOrdini)}</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 text-center ${
          scostamento > 0
            ? 'border-red-200 bg-red-50'
            : scostamento < 0
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 bg-white'
        }`}>
          <p className="text-xs text-gray-500 mb-1">Scostamento</p>
          <p className={`text-xl font-bold ${scostamento > 0 ? 'text-red-600' : scostamento < 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {scostamento > 0 ? '+' : ''}{formatEuro(scostamento)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {scostamento > 0 ? 'sforamento' : scostamento < 0 ? 'risparmio' : 'in pari'}
          </p>
        </div>
      </div>

      {/* Righe preventivo */}
      {commessa.preventivo && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Materiali dal preventivo</h2>
          </div>
          {commessa.preventivo.righe.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">Nessuna riga nel preventivo.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Descrizione</th>
                  <th className="px-4 py-2 text-right">Qtà</th>
                  <th className="px-4 py-2 text-right">Prezzo un.</th>
                  <th className="px-4 py-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commessa.preventivo.righe.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{r.descrizione}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{r.quantita}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatEuro(r.prezzoUnitario)}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatEuro(Math.round(r.quantita * r.prezzoUnitario))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">Totale preventivo</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-900">{formatEuro(totalePrev)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Ordini materiale */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Ordini a fornitori</h2>
          <Link
            href={`/impresa/ordini/nuovo`}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            + Nuovo ordine
          </Link>
        </div>
        {commessa.ordini.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400">Nessun ordine per questa commessa.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {commessa.ordini.map(o => {
              const tot = o.righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
              return (
                <div key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Link href={`/impresa/ordini/${o.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {o.fornitore?.nome ?? 'Fornitore n.d.'} — {formatData(o.createdAt)}
                      </Link>
                      <p className="text-xs text-gray-400">{o.righe.length} {o.righe.length === 1 ? 'riga' : 'righe'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatEuro(tot)}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        o.stato === 'consegnato' ? 'bg-green-100 text-green-700' :
                        o.stato === 'usato'      ? 'bg-blue-100 text-blue-700' :
                        o.stato === 'ordinato'   ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {o.stato}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Materiale usato in cantiere (da rapportini operai) */}
      {tuttiMateriali.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Materiale registrato in cantiere</h2>
            <p className="text-xs text-gray-400">totale: {formatEuro(totaleUsato)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Descrizione</th>
                <th className="px-4 py-2 text-right">Qtà</th>
                <th className="px-4 py-2 text-right">Prezzo un.</th>
                <th className="px-4 py-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tuttiMateriali.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{m.descrizione}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{m.quantita} {m.materiale?.unita ?? 'pz'}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{formatEuro(m.prezzoUnitario)}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {formatEuro(Math.round(m.quantita * m.prezzoUnitario))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">Totale usato</td>
                <td className="px-4 py-2 text-right font-bold text-gray-900">{formatEuro(totaleUsato)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Movimenti magazzino per questa commessa */}
      {commessa.movimenti.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Movimenti magazzino collegati</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {commessa.movimenti.map(mv => {
              const segno = mv.tipo === 'scarico' ? '−' : '+'
              const color = mv.tipo === 'carico' ? 'text-green-600' : mv.tipo === 'reso' ? 'text-yellow-600' : 'text-red-600'
              const rapportinoGiornataId = mv.tipo === 'reso' && mv.descrizione?.startsWith('Reso da rapportino')
                ? giornataPerData.get(toDateKey(mv.data))
                : undefined
              return (
                <div key={mv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900">{mv.descrizione ?? mv.materiale?.descrizione ?? '—'}</p>
                    <p className="text-xs text-gray-400">{formatData(mv.data)} — {mv.tipo}</p>
                    {rapportinoGiornataId && (
                      <Link
                        href={`/impresa/giornate/${rapportinoGiornataId}/rapportino`}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        📋 Vedi rapportino →
                      </Link>
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${color}`}>
                    {segno}{mv.quantita} {mv.materiale?.unita ?? 'pz'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
