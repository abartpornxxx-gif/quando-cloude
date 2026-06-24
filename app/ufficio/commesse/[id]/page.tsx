import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'success' | 'warning' | 'neutral' | 'danger' | 'info'

const STATO_COMM_LABEL: Record<string, string> = { aperta: 'Aperta', finita: 'Finita', chiusa: 'Chiusa' }
const STATO_COMM_VARIANT: Record<string, BadgeVariant> = { aperta: 'success', finita: 'warning', chiusa: 'neutral' }

const STATO_FA_LABEL: Record<string, string> = { da_incassare: 'Da incassare', parzialmente_incassata: 'Parz. incassata', incassata: 'Incassata', scaduta: 'Scaduta' }
const STATO_FA_VARIANT: Record<string, BadgeVariant> = { da_incassare: 'warning', parzialmente_incassata: 'warning', incassata: 'success', scaduta: 'danger' }

const STATO_VAR_LABEL: Record<string, string> = {
  bozza: 'Bozza',
  inviata: 'Inviata',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
  annullata: 'Annullata',
}
const STATO_VAR_VARIANT: Record<string, BadgeVariant> = {
  bozza: 'neutral',
  inviata: 'info',
  approvata: 'success',
  rifiutata: 'danger',
  annullata: 'neutral',
}

const STATO_PREV_FORN_LABEL: Record<string, string> = {
  in_attesa: 'In attesa',
  ricevuto: 'Ricevuto',
  approvato: 'Approvato',
  scartato: 'Scartato',
}
const STATO_PREV_FORN_VARIANT: Record<string, BadgeVariant> = {
  in_attesa: 'warning',
  ricevuto: 'info',
  approvato: 'success',
  scartato: 'danger',
}

function totaleRighe(righe: { quantita: number; prezzoUnitario: number }[]) {
  return righe.reduce((s, r) => s + Math.round(r.quantita * r.prezzoUnitario), 0)
}

function meseLabel(d: Date) {
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function meseCorrente(d: Date) {
  const ora = new Date()
  return d.getMonth() === ora.getMonth() && d.getFullYear() === ora.getFullYear()
}

interface Props { params: Promise<{ id: string }> }

export default async function UfficioCommessaDettaglio({ params }: Props) {
  await requireUfficio()
  const { id } = await params

  const c = await prisma.commessa.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true, telefono: true, email: true } },
      preventivo: { select: { id: true } },
      giornate: {
        include: {
          operaio: { select: { nome: true, costoOrario: true } },
          ore: { select: { tipo: true, quantita: true } },
          rapportino: {
            select: { id: true, lavoroEseguito: true, oreOrdinarie: true, oreStraordinarie: true },
          },
        },
        orderBy: { data: 'desc' },
      },
      fattureAttive: {
        include: { righe: { select: { quantita: true, prezzoUnitario: true } } },
        orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
      },
      fatturePassive: {
        include: { fornitore: { select: { nome: true } } },
        orderBy: { data: 'desc' },
      },
      movimenti: {
        include: { materiale: { select: { descrizione: true, unita: true } } },
        orderBy: { data: 'desc' },
        take: 15,
      },
      ordini: {
        include: {
          fornitore: { select: { nome: true } },
          righe: { select: { quantita: true, prezzoUnitario: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      varianti: {
        orderBy: { createdAt: 'desc' },
      },
      richiestePreventiviFornitori: {
        include: {
          fornitore: { select: { nome: true } },
          variante: { select: { titolo: true } },
        },
        orderBy: { dataRichiesta: 'desc' },
      },
    },
  })

  if (!c) notFound()

  // ── Fatture ──
  const totaleFattureAttive = c.fattureAttive.reduce((s, f) => s + totaleRighe(f.righe), 0)
  const totaleFatturePassive = c.fatturePassive.reduce((s, f) => s + f.importo, 0)

  // ── Varianti ──
  const totaleVariantiApprovate = c.varianti.filter(v => v.stato === 'approvata').reduce((s, v) => s + v.importo, 0)
  const costoStimatoVarianti = c.varianti.filter(v => v.stato === 'approvata').reduce((s, v) => s + v.costoStimato, 0)

  // ── Costi Manodopera Dinamici ──
  const costiManodoperaDinamici = c.giornate.reduce((sum, g) => {
    const oreOrd = g.ore.filter(o => o.tipo === 'ordinaria').reduce((acc, o) => acc + o.quantita, 0)
    const oreStr = g.ore.filter(o => o.tipo === 'straordinaria').reduce((acc, o) => acc + o.quantita, 0)
    const costoOrario = g.operaio.costoOrario ?? 0
    return sum + Math.round(oreOrd * costoOrario + oreStr * costoOrario * 1.5)
  }, 0)

  // ── KPI finanziari ──
  const costiTotali = c.costiMateriali + costiManodoperaDinamici + totaleFatturePassive + costoStimatoVarianti
  const daIncassare = totaleFattureAttive - c.fatturato
  const daFatturare = c.preventivato - totaleFattureAttive
  const riferimento = (totaleFattureAttive > 0 ? totaleFattureAttive : c.preventivato) + totaleVariantiApprovate
  const margineBase = riferimento - costiTotali
  const marginePct = riferimento > 0 ? Math.round((margineBase / riferimento) * 100) : null

  // Dati incompleti: ci sono giornate ma costi manodopera a 0,
  // oppure ci sono ordini consegnati ma costi materiali a 0
  const ordiniConsegnati = c.ordini.filter(o => o.stato === 'consegnato' || o.stato === 'usato')
  const datiIncompleti =
    (c.giornate.length > 0 && costiManodoperaDinamici === 0) ||
    (ordiniConsegnati.length > 0 && c.costiMateriali === 0)

  // ── Giornate ──
  const giornateOggiMese = c.giornate.filter(g => meseCorrente(g.data)).length
  const oreOrdTotali = c.giornate.reduce(
    (s, g) => s + g.ore.filter(o => o.tipo === 'ordinaria').reduce((a, o) => a + o.quantita, 0), 0
  )
  const oreStrTotali = c.giornate.reduce(
    (s, g) => s + g.ore.filter(o => o.tipo === 'straordinaria').reduce((a, o) => a + o.quantita, 0), 0
  )

  // Raggruppa giornate per mese (chiave YYYY-MM)
  const giornatePerMese: Record<string, typeof c.giornate> = {}
  for (const g of c.giornate) {
    const key = `${g.data.getFullYear()}-${String(g.data.getMonth() + 1).padStart(2, '0')}`
    if (!giornatePerMese[key]) giornatePerMese[key] = []
    giornatePerMese[key].push(g)
  }
  const mesiKeys = Object.keys(giornatePerMese).sort((a, b) => b.localeCompare(a))

  // ── Materiali movimenti ──
  const nCarichi = c.movimenti.filter(m => m.tipo === 'carico').length
  const nScarichi = c.movimenti.filter(m => m.tipo === 'scarico').length
  const nResi = c.movimenti.filter(m => m.tipo === 'reso').length
  const totaleOrdini = c.ordini.reduce((s, o) => s + totaleRighe(o.righe), 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/ufficio/commesse" className="hover:text-teal-700">Commesse</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate">{c.nome}</span>
      </div>

      {/* Intestazione */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{c.nome}</h1>
            {c.cliente && (
              <p className="text-sm text-gray-600 mt-0.5 font-medium">{c.cliente.nome}</p>
            )}
            {c.indirizzoCantiere && (
              <p className="text-xs text-gray-400 mt-1">📍 {c.indirizzoCantiere}</p>
            )}
            {c.note && (
              <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-2 py-1 whitespace-pre-line">{c.note}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Badge variant={STATO_COMM_VARIANT[c.stato]}>{STATO_COMM_LABEL[c.stato]}</Badge>
            {c.preventivo && (
              <Link
                href={`/ufficio/preventivi/${c.preventivo.id}`}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
              >
                📋 Preventivo →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI finanziari */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Riepilogo economico</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label="Preventivato" value={formatEuro(c.preventivato)} />
          <KpiCard label="Fatturato al cliente" value={totaleFattureAttive > 0 ? formatEuro(totaleFattureAttive) : '—'} />
          <KpiCard
            label="Da fatturare"
            value={daFatturare > 0 ? formatEuro(daFatturare) : '—'}
            accent={daFatturare > 0 ? 'amber' : 'gray'}
          />
          <KpiCard label="Incassato" value={c.fatturato > 0 ? formatEuro(c.fatturato) : '—'} accent="emerald" />
          <KpiCard
            label="Da incassare"
            value={daIncassare > 0 ? formatEuro(daIncassare) : '—'}
            accent={daIncassare > 0 ? 'amber' : 'gray'}
          />
          <KpiCard
            label={marginePct != null ? `Margine (${marginePct}%)` : 'Margine'}
            value={riferimento > 0 ? formatEuro(margineBase) : '—'}
            accent={margineBase >= 0 ? 'emerald' : 'red'}
          />
          <KpiCard label="Costi materiali" value={formatEuro(c.costiMateriali)} />
          <KpiCard label="Costi manodopera" value={formatEuro(costiManodoperaDinamici)} />
          <KpiCard label="Costi fornitori" value={formatEuro(totaleFatturePassive)} />
        </div>
        {c.stato === 'aperta' && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠ Margine non definitivo — cantiere ancora aperto (lavorazioni in corso).
          </p>
        )}
        {c.stato !== 'aperta' && datiIncompleti && (
          <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠ Margine non definitivo — alcuni costi non ancora registrati (rapportini mancanti o ordini non consegnati).
          </p>
        )}
        {riferimento === 0 && (
          <p className="mt-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            Nessun importo preventivato. Il margine non è calcolabile.
          </p>
        )}
      </div>

      {/* Giornate */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Giornate lavorative
          </p>
          <p className="text-xs text-gray-500">
            {c.giornate.length} totali
            {giornateOggiMese > 0 && ` · ${giornateOggiMese} questo mese`}
            {oreOrdTotali > 0 && ` · ${oreOrdTotali}h ord.`}
            {oreStrTotali > 0 && ` + ${oreStrTotali}h str.`}
          </p>
        </div>

        {c.giornate.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-8 text-center">
            <p className="text-sm text-gray-400">Nessuna giornata lavorativa registrata.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mesiKeys.map(mese => {
              const giornateMese = giornatePerMese[mese]
              const [anno, mm] = mese.split('-')
              const dataRap = new Date(parseInt(anno), parseInt(mm) - 1, 1)
              return (
                <div key={mese} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600 capitalize">{meseLabel(dataRap)}</p>
                    <p className="text-xs text-gray-400">{giornateMese.length} giornate</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {giornateMese.map(g => {
                      const oreOrd = g.ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0)
                      const oreStr = g.ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0)
                      return (
                        <div key={g.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-900">{formatData(g.data)}</p>
                                <p className="text-xs text-gray-500">{g.operaio.nome}</p>
                                {oreOrd > 0 && <p className="text-xs text-gray-400">{oreOrd}h ord.</p>}
                                {oreStr > 0 && <p className="text-xs text-orange-500">{oreStr}h str.</p>}
                              </div>
                              {g.rapportino?.lavoroEseguito && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1 bg-gray-50 rounded-lg px-2 py-1">
                                  {g.rapportino.lavoroEseguito}
                                </p>
                              )}
                            </div>
                            {g.rapportino ? (
                              <Link
                                href={`/impresa/giornate/${g.id}/rapportino`}
                                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                              >
                                ✓ Rapportino
                              </Link>
                            ) : (
                              <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                                Bozza
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Materiali & Movimenti */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Materiali & Movimenti</p>
          {c.ordini.length > 0 && (
            <p className="text-xs text-gray-400">
              {c.ordini.length} {c.ordini.length === 1 ? 'ordine' : 'ordini'} · {formatEuro(totaleOrdini)} acquistato
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Riepilogo ordini */}
          {c.ordini.length > 0 && (
            <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                {c.ordini.filter(o => o.stato === 'richiesto' || o.stato === 'ordinato').length > 0 && (
                  <span>⏳ {c.ordini.filter(o => o.stato === 'richiesto' || o.stato === 'ordinato').length} in attesa</span>
                )}
                {ordiniConsegnati.length > 0 && (
                  <span>✓ {ordiniConsegnati.length} consegnati</span>
                )}
              </div>
            </div>
          )}

          {/* Movimenti recenti */}
          {c.movimenti.length === 0 && c.ordini.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Nessun movimento o ordine registrato.</p>
          ) : c.movimenti.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400">Nessun movimento magazzino registrato.</p>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="flex gap-3 text-xs text-gray-500">
                  {nCarichi > 0 && <span className="text-green-600">▲ {nCarichi} carichi</span>}
                  {nScarichi > 0 && <span className="text-red-500">▼ {nScarichi} scarichi</span>}
                  {nResi > 0 && <span className="text-amber-500">↩ {nResi} resi</span>}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {c.movimenti.map(mv => (
                  <div key={mv.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">
                        {mv.descrizione ?? mv.materiale?.descrizione ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">{formatData(mv.data)} · {mv.tipo}</p>
                    </div>
                    <p className={`text-xs font-semibold shrink-0 ${
                      mv.tipo === 'carico' ? 'text-green-600' :
                      mv.tipo === 'reso'   ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {mv.tipo === 'scarico' ? '−' : '+'}{mv.quantita} {mv.materiale?.unita ?? 'pz'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fatture attive */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fatture attive</p>
          {c.fattureAttive.length > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400">Totale: {formatEuro(totaleFattureAttive)}</p>
              <Link href={`/ufficio/fatture?commessaId=${c.id}`} className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                Lista completa →
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {c.fattureAttive.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Nessuna fattura attiva per questa commessa.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {c.fattureAttive.map(f => {
                const imponibile = totaleRighe(f.righe)
                const ivaAmt = Math.round(imponibile * f.aliquotaIva / 100)
                const totFattura = imponibile + ivaAmt
                const giaIncassato = f.importoIncassato ?? 0
                const residuoFattura = totFattura - giaIncassato
                const isParziale = f.stato === 'parzialmente_incassata'
                return (
                  <Link
                    key={f.id}
                    href={`/ufficio/fatture/${f.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">
                        Fattura {f.numero}/{f.anno}
                      </p>
                      <p className="text-xs text-gray-400">{formatData(f.data)}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        {isParziale ? (
                          <>
                            <p className="text-sm font-semibold text-amber-700">{formatEuro(residuoFattura)} residuo</p>
                            <p className="text-xs text-gray-400">su {formatEuro(totFattura)}</p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{formatEuro(totFattura)}</p>
                        )}
                        <Badge variant={STATO_FA_VARIANT[f.stato]}>{STATO_FA_LABEL[f.stato]}</Badge>
                      </div>
                      <span className="text-gray-300 group-hover:text-teal-400">›</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fatture passive */}
      {(c.fatturePassive.length > 0 || c.ordini.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fatture passive (fornitori)</p>
            {c.fatturePassive.length > 0 && (
              <p className="text-xs text-gray-400">Totale: {formatEuro(totaleFatturePassive)}</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {c.fatturePassive.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-gray-400">Nessuna fattura fornitore collegata a questa commessa.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {c.fatturePassive.map(f => (
                  <Link
                    key={f.id}
                    href={`/ufficio/fatture-passive/${f.id}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/70 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">
                        {f.fornitore?.nome ?? 'Fornitore n.d.'}{f.numero ? ` — n. ${f.numero}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">{formatData(f.data)}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatEuro(f.importo)}</p>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                            f.stato === 'pagata' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {f.stato === 'pagata' ? 'Pagata' : 'Da pagare'}
                          </span>
                          {f.controllata && (
                            <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-blue-100 text-blue-700">
                              ✓ Ctrl.
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300 group-hover:text-teal-400">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Varianti Lavori */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Varianti lavori (Extra)</p>
            {totaleVariantiApprovate > 0 && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                +{formatEuro(totaleVariantiApprovate)} approvato
              </span>
            )}
          </div>
          <Link
            href={`/ufficio/commesse/${c.id}/varianti/nuova`}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-0.5"
          >
            + Aggiungi variante
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {c.varianti.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Nessuna variante inserita per questa commessa.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {c.varianti.map(v => (
                <Link
                  key={v.id}
                  href={`/ufficio/commesse/${c.id}/varianti/${v.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/70 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 truncate">
                      {v.titolo}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {v.descrizione || 'Nessuna descrizione'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3 ml-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatEuro(v.importo)}</p>
                      {v.costoStimato > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium">Costo stimato: {formatEuro(v.costoStimato)}</p>
                      )}
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        {v.visibileCliente ? (
                          <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-medium border border-violet-100">Visibile al cliente</span>
                        ) : (
                          <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded font-medium border border-gray-200">Interna</span>
                        )}
                        <Badge variant={STATO_VAR_VARIANT[v.stato]}>{STATO_VAR_LABEL[v.stato]}</Badge>
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-teal-400">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Richieste Preventivi Fornitori */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Richieste preventivi fornitori</p>
          <Link
            href={`/ufficio/commesse/${c.id}/preventivi-fornitori/nuova`}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-0.5"
          >
            + Nuova richiesta
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {c.richiestePreventiviFornitori.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">Nessuna richiesta preventivo registrata.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {c.richiestePreventiviFornitori.map(rp => (
                <Link
                  key={rp.id}
                  href={`/ufficio/commesse/${c.id}/preventivi-fornitori/${rp.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/70 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 truncate">
                      {rp.fornitore.nome}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {rp.descrizione}
                    </p>
                    {rp.variante && (
                      <p className="text-[10px] text-teal-600 font-medium mt-0.5">
                        ↳ Variante: {rp.variante.titolo}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3 ml-4">
                    <div>
                      {rp.importo !== null && rp.importo !== undefined && (
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">{formatEuro(rp.importo)}</p>
                      )}
                      {rp.dataScadenza && (
                        <p className="text-[10px] text-gray-400">Scadenza: {formatData(rp.dataScadenza)}</p>
                      )}
                      <Badge variant={STATO_PREV_FORN_VARIANT[rp.stato]}>{STATO_PREV_FORN_LABEL[rp.stato]}</Badge>
                    </div>
                    <span className="text-gray-300 group-hover:text-teal-400">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function KpiCard({ label, value, accent = 'gray' }: {
  label: string
  value: string
  accent?: 'gray' | 'emerald' | 'amber' | 'red'
}) {
  const valueColor = {
    gray: 'text-gray-900',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  }[accent]

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}
