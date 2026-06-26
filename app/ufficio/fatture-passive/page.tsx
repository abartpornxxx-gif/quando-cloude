import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function UfficioFatturePassivePage({ searchParams }: Props) {
  await requireUfficio()
  const sp = await searchParams

  const stato = sp.stato ?? ''
  const fornitoreId = sp.fornitoreId ?? ''
  const commessaId = sp.commessaId ?? ''
  const mese = sp.mese ?? ''
  const controllata = sp.controllata ?? ''
  const q = sp.q ?? ''

  const tutteleFatture = await prisma.fatturaPassiva.findMany({
    include: {
      fornitore: { select: { id: true, nome: true } },
      commessa: { select: { id: true, nome: true } },
    },
    orderBy: { data: 'desc' },
  })

  // â”€â”€ Riepilogo debiti (su tutto, non filtrato) â”€â”€
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)

  const daPagare = tutteleFatture.filter(f => f.stato === 'da_pagare')
  const totaleDaPagare = daPagare.reduce((s, f) => s + f.importo, 0)
  const totaleScaduto = daPagare
    .filter(f => f.dataScadenza && new Date(f.dataScadenza) < oggi)
    .reduce((s, f) => s + f.importo, 0)
  const totaleMeseCorrente = daPagare
    .filter(f => f.dataScadenza && new Date(f.dataScadenza) >= inizioMese && new Date(f.dataScadenza) <= fineMese)
    .reduce((s, f) => s + f.importo, 0)

  // Top fornitori per debito
  const debitiPerFornitore: Record<string, { nome: string; importo: number }> = {}
  for (const f of daPagare) {
    const key = f.fornitoreId ?? '__nessuno__'
    const nome = f.fornitore?.nome ?? 'Fornitore n.d.'
    if (!debitiPerFornitore[key]) debitiPerFornitore[key] = { nome, importo: 0 }
    debitiPerFornitore[key].importo += f.importo
  }
  const topFornitori = Object.values(debitiPerFornitore)
    .sort((a, b) => b.importo - a.importo)
    .slice(0, 5)

  // Top commesse per debito
  const debitiPerCommessa: Record<string, { nome: string; importo: number }> = {}
  for (const f of daPagare) {
    if (!f.commessaId) continue
    const key = f.commessaId
    const nome = f.commessa?.nome ?? 'Commessa n.d.'
    if (!debitiPerCommessa[key]) debitiPerCommessa[key] = { nome, importo: 0 }
    debitiPerCommessa[key].importo += f.importo
  }
  const topCommesse = Object.values(debitiPerCommessa)
    .sort((a, b) => b.importo - a.importo)
    .slice(0, 5)

  // â”€â”€ Filtro lista â”€â”€
  let fattureFiltrate = tutteleFatture

  if (stato === 'da_pagare') fattureFiltrate = fattureFiltrate.filter(f => f.stato === 'da_pagare')
  else if (stato === 'pagata') fattureFiltrate = fattureFiltrate.filter(f => f.stato === 'pagata')

  if (fornitoreId) fattureFiltrate = fattureFiltrate.filter(f => f.fornitoreId === fornitoreId)
  if (commessaId) fattureFiltrate = fattureFiltrate.filter(f => f.commessaId === commessaId)

  if (mese) {
    const [anno, mm] = mese.split('-').map(Number)
    fattureFiltrate = fattureFiltrate.filter(f => {
      const d = new Date(f.data)
      return d.getFullYear() === anno && d.getMonth() + 1 === mm
    })
  }

  if (controllata === 'si') fattureFiltrate = fattureFiltrate.filter(f => f.controllata)
  else if (controllata === 'no') fattureFiltrate = fattureFiltrate.filter(f => !f.controllata)

  if (q.trim()) {
    const qLower = q.trim().toLowerCase()
    fattureFiltrate = fattureFiltrate.filter(f =>
      (f.numero ?? '').toLowerCase().includes(qLower) ||
      (f.note ?? '').toLowerCase().includes(qLower) ||
      (f.fornitore?.nome ?? '').toLowerCase().includes(qLower) ||
      (f.commessa?.nome ?? '').toLowerCase().includes(qLower)
    )
  }

  // Valori unici per i dropdown filtro
  const fornitori = Array.from(
    new Map(tutteleFatture.filter(f => f.fornitore).map(f => [f.fornitoreId, f.fornitore!])).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome))

  const commesse = Array.from(
    new Map(tutteleFatture.filter(f => f.commessa).map(f => [f.commessaId, f.commessa!])).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome))

  const hasFiltri = stato || fornitoreId || commessaId || mese || controllata || q

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fatture passive"
        subtitle={`${tutteleFatture.length} ${tutteleFatture.length === 1 ? 'fattura' : 'fatture'} fornitori`}
        action={
          <div className="flex gap-2">
            <Link href="/ufficio/fatture-passive/importa"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              ðŸ“¥ Importa CSV
            </Link>
            <Link href="/ufficio/fatture-passive/nuova"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
              + Nuova
            </Link>
          </div>
        }
      />

      {/* Riepilogo debiti */}
      {totaleDaPagare > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 space-y-4">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Riepilogo debiti fornitori</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border border-orange-200 p-3">
              <p className="text-xs text-orange-600">Totale da pagare</p>
              <p className="text-xl font-bold text-orange-900 mt-0.5">{formatEuro(totaleDaPagare)}</p>
            </div>
            <div className="rounded-xl bg-white border border-red-200 p-3">
              <p className="text-xs text-red-600">Di cui scaduto</p>
              <p className="text-xl font-bold text-red-700 mt-0.5">{formatEuro(totaleScaduto)}</p>
            </div>
            <div className="rounded-xl bg-white border border-amber-200 p-3">
              <p className="text-xs text-amber-600">Scade questo mese</p>
              <p className="text-xl font-bold text-amber-700 mt-0.5">{formatEuro(totaleMeseCorrente)}</p>
            </div>
          </div>

          {(topFornitori.length > 0 || topCommesse.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topFornitori.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 mb-2">Per fornitore</p>
                  <div className="space-y-1.5">
                    {topFornitori.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{f.nome}</span>
                        <span className="font-semibold text-orange-800 shrink-0 ml-2">{formatEuro(f.importo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {topCommesse.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 mb-2">Per commessa</p>
                  <div className="space-y-1.5">
                    {topCommesse.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{c.nome}</span>
                        <span className="font-semibold text-orange-800 shrink-0 ml-2">{formatEuro(c.importo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtri */}
      <form method="GET" className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtri</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <select name="stato" defaultValue={stato}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">Tutti gli stati</option>
            <option value="da_pagare">Da pagare</option>
            <option value="pagata">Pagata</option>
          </select>

          <select name="fornitoreId" defaultValue={fornitoreId}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">Tutti i fornitori</option>
            {fornitori.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>

          <select name="commessaId" defaultValue={commessaId}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">Tutte le commesse</option>
            {commesse.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <input
            name="mese"
            type="month"
            defaultValue={mese}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Mese fattura"
          />

          <select name="controllata" defaultValue={controllata}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">Controllata: tutte</option>
            <option value="si">Controllate</option>
            <option value="no">Non controllate</option>
          </select>

          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Cerca (numero, fornitore, noteâ€¦)"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Filtra
          </button>
          {hasFiltri && (
            <Link href="/ufficio/fatture-passive"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Azzera filtri
            </Link>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {fattureFiltrate.length} {fattureFiltrate.length === 1 ? 'risultato' : 'risultati'}
          </span>
        </div>
      </form>

      {/* Lista */}
      {fattureFiltrate.length === 0 ? (
        hasFiltri ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
            <p className="text-sm text-gray-400">Nessuna fattura corrisponde ai filtri selezionati.</p>
            <Link href="/ufficio/fatture-passive" className="mt-3 inline-block text-sm text-teal-600 hover:underline">
              Azzera filtri
            </Link>
          </div>
        ) : (
          <EmptyState
            title="Nessuna fattura fornitore"
            description="Registra la prima fattura ricevuta da un fornitore."
            action={
              <Link href="/ufficio/fatture-passive/nuova"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
                + Nuova
              </Link>
            }
          />
        )
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {fattureFiltrate.map(f => {
              const isScaduta = f.dataScadenza && new Date(f.dataScadenza) < oggi && f.stato === 'da_pagare'
              return (
                <Link key={f.id} href={`/ufficio/fatture-passive/${f.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-teal-700 transition-colors">
                        {f.fornitore?.nome ?? 'Fornitore n.d.'}{f.numero ? ` â€” n. ${f.numero}` : ''}
                      </p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        f.stato === 'pagata' ? 'bg-green-100 text-green-800'
                        : isScaduta ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                      }`}>
                        {f.stato === 'pagata' ? 'Pagata' : isScaduta ? 'Scaduta' : 'Da pagare'}
                      </span>
                      {f.controllata && (
                        <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-blue-100 text-blue-800">
                          âœ“ Controllata
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {f.commessa?.nome ? `Commessa: ${f.commessa.nome}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatData(f.data)}{f.dataScadenza ? ` Â· Scadenza: ${formatData(f.dataScadenza)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-gray-900">{formatEuro(f.importo)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

