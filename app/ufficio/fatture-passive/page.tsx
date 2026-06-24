import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { getInvoiceAmounts, deriveInvoiceStatus } from '@/lib/finance'
import { FilterDropdown } from '@/components/ui/FilterDropdown'

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

  // Mappa le fatture calcolando importi e stati derivati
  const parsedFatture = tutteleFatture.map(f => {
    const { totalAmount, paidOrCollectedAmount, residualAmount } = getInvoiceAmounts({
      type: 'passiva',
      importo: f.importo,
      importoPagato: f.importoPagato,
    })
    const derivedStatus = deriveInvoiceStatus({
      type: 'passiva',
      totalAmount,
      paidOrCollectedAmount,
      dataScadenza: f.dataScadenza,
    })
    return {
      ...f,
      totalAmount,
      paidOrCollectedAmount,
      residualAmount,
      derivedStatus,
    }
  })

  // ── Riepilogo debiti (su tutto, non filtrato) ──
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1)
  const fineMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0)

  const daPagare = parsedFatture.filter(f => f.derivedStatus !== 'pagata')
  const totaleDaPagare = daPagare.reduce((s, f) => s + f.residualAmount, 0)
  const totaleScaduto = daPagare
    .filter(f => f.derivedStatus === 'scaduta')
    .reduce((s, f) => s + f.residualAmount, 0)
  const totaleMeseCorrente = daPagare
    .filter(f => f.dataScadenza && new Date(f.dataScadenza) >= inizioMese && new Date(f.dataScadenza) <= fineMese)
    .reduce((s, f) => s + f.residualAmount, 0)

  // Top fornitori per debito
  const debitiPerFornitore: Record<string, { nome: string; importo: number }> = {}
  for (const f of daPagare) {
    const key = f.fornitoreId ?? '__nessuno__'
    const nome = f.fornitore?.nome ?? 'Fornitore n.d.'
    if (!debitiPerFornitore[key]) debitiPerFornitore[key] = { nome, importo: 0 }
    debitiPerFornitore[key].importo += f.residualAmount
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
    debitiPerCommessa[key].importo += f.residualAmount
  }
  const topCommesse = Object.values(debitiPerCommessa)
    .sort((a, b) => b.importo - a.importo)
    .slice(0, 5)

  // ── Filtro lista ──
  let fattureFiltrate = parsedFatture

  if (stato === 'da_pagare') {
    fattureFiltrate = fattureFiltrate.filter(f => f.derivedStatus === 'da_pagare')
  } else if (stato === 'parzialmente_pagata') {
    fattureFiltrate = fattureFiltrate.filter(f => f.derivedStatus === 'parzialmente_pagata')
  } else if (stato === 'pagata') {
    fattureFiltrate = fattureFiltrate.filter(f => f.derivedStatus === 'pagata')
  } else if (stato === 'scaduta') {
    fattureFiltrate = fattureFiltrate.filter(f => f.derivedStatus === 'scaduta')
  }

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
              📥 Importa CSV
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
          <FilterDropdown
            name="stato"
            defaultValue={stato}
            placeholder="Tutti gli stati"
            options={[
              { value: 'da_pagare', label: 'Da pagare' },
              { value: 'parzialmente_pagata', label: 'Parzialmente pagata' },
              { value: 'pagata', label: 'Pagata' },
              { value: 'scaduta', label: 'Scaduta' },
            ]}
          />

          <FilterDropdown
            name="fornitoreId"
            defaultValue={fornitoreId}
            placeholder="Tutti i fornitori"
            options={fornitori.map(f => ({ value: f.id, label: f.nome }))}
          />

          <FilterDropdown
            name="commessaId"
            defaultValue={commessaId}
            placeholder="Tutte le commesse"
            options={commesse.map(c => ({ value: c.id, label: c.nome }))}
          />

          <input
            name="mese"
            type="month"
            defaultValue={mese}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            placeholder="Mese fattura"
          />

          <FilterDropdown
            name="controllata"
            defaultValue={controllata}
            placeholder="Controllata: tutte"
            options={[
              { value: 'si', label: 'Controllate' },
              { value: 'no', label: 'Non controllate' },
            ]}
          />

          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Cerca (numero, fornitore, note…)"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 cursor-pointer">
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
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {fattureFiltrate.map(f => {
              const badgeCls =
                f.derivedStatus === 'pagata' ? 'bg-green-100 text-green-800' :
                f.derivedStatus === 'scaduta' ? 'bg-red-100 text-red-800' :
                f.derivedStatus === 'parzialmente_pagata' ? 'bg-yellow-100 text-yellow-800' :
                'bg-orange-100 text-orange-800'

              const badgeLabel =
                f.derivedStatus === 'pagata' ? 'Pagata' :
                f.derivedStatus === 'scaduta' ? 'Scaduta' :
                f.derivedStatus === 'parzialmente_pagata' ? 'Parz. pagata' :
                'Da pagare'

              return (
                <Link key={f.id} href={`/ufficio/fatture-passive/${f.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/70 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-teal-700 transition-colors">
                        {f.fornitore?.nome ?? 'Fornitore n.d.'}{f.numero ? ` — n. ${f.numero}` : ''}
                      </p>
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                      {f.controllata && (
                        <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-blue-100 text-blue-800">
                          ✓ Controllata
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {f.commessa?.nome ? `Commessa: ${f.commessa.nome}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatData(f.data)}{f.dataScadenza ? ` · Scadenza: ${formatData(f.dataScadenza)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-gray-900">{formatEuro(f.totalAmount)}</p>
                    {f.derivedStatus === 'parzialmente_pagata' && (
                      <p className="text-xs text-orange-600 font-medium">Residuo: {formatEuro(f.residualAmount)}</p>
                    )}
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
