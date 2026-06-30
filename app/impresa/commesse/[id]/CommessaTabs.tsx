'use client'

import { useState } from 'react'
import { AdempimentiSection } from './AdempimentiSection'
import { CommessaForm } from '../CommessaForm'
import { OperaiManager } from './OperaiManager'
import { SopralluogoTab } from './SopralluogoTab'
import { formatEuro, formatData } from '@/lib/format'

type Tab = 'timeline' | 'sopralluogo' | 'adempimenti' | 'struttura' | 'documenti' | 'piano' | 'note'

type Adempimento = {
  id: string
  testo: string
  note: string | null
  collegamento: string | null
  fatto: boolean
  fattoDa: string | null
  fattoAt: string | null
  notaSpunta: string | null
  modelloId: string | null
}

type GiornataRow = {
  id: string
  data: string
  operaioNome: string
  oreOrdinarie: number
  oreStr: number
  fotoCount: number
  lavoroEseguito: string | null
}

type FatturaRow = {
  id: string
  numero: string
  anno: number
  stato: string
  data: string
  totale: number
}

type DicoRow = {
  id: string
  tipoImpianto: string
  data: string
}

type VarianteRow = {
  id: string
  titolo: string
  importo: number
  stato: string
  visibileCliente: boolean
}

type PianoRow = {
  id: string
  data: string
  operaioNome: string
  mezzoNome: string | null
  lavoroDaFare: string | null
  confermata: boolean
}

type DefaultValues = {
  id: string
  nome: string
  clienteId: string
  indirizzoCantiere: string
  stato: string
  note: string
  istruzioniCantiere: string
  attrezzatureNecessarie: string
  tipoLavoroId: string
  tipoStruttura: string
  preventivato: number
  costiMateriali: number
  costiManodopera: number
  costiMezzi: number
  fatturato: number
  avanzamentoPercentuale: number
}

type StrutturaRow = {
  tipo: string
  nome: string
}

interface Props {
  commessaId: string
  preventivoId: string | null
  formAction: (fd: FormData) => Promise<void>
  clienti: { id: string; nome: string }[]
  tipiLavoro: { id: string; nome: string }[]
  defaultValues: DefaultValues
  tipoLavoro: { id: string; nome: string } | null
  adempimenti: Adempimento[]
  giornate: GiornataRow[]
  fatture: FatturaRow[]
  dico: DicoRow[]
  piano: PianoRow[]
  operaiAssegnati: { operaioId: string; nome: string; ruolo: string | null }[]
  operaiDisponibili: { id: string; nome: string; ruolo: string | null }[]
  varianti: VarianteRow[]
  strutturaNodi: StrutturaRow[]
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'timeline',    label: 'Timeline',        icon: '📅' },
  { id: 'sopralluogo', label: 'Sopralluogo',     icon: '🔍' },
  { id: 'adempimenti', label: 'Adempimenti',     icon: '✓' },
  { id: 'struttura',   label: 'Struttura',       icon: '🏗️' },
  { id: 'documenti',   label: 'Documenti',       icon: '📄' },
  { id: 'piano',       label: 'Piano',           icon: '📆' },
  { id: 'note',        label: 'Note & Modifica', icon: '⚙' },
]

const STATI_FATTURA: Record<string, { label: string; cls: string }> = {
  da_incassare: { label: 'Da incassare', cls: 'bg-amber-100 text-amber-700' },
  incassata:    { label: 'Incassata',    cls: 'bg-emerald-100 text-emerald-700' },
  annullata:    { label: 'Annullata',    cls: 'bg-gray-100 text-gray-500' },
}

const STATI_VARIANTE: Record<string, { label: string; cls: string }> = {
  bozza:     { label: 'Bozza',     cls: 'bg-gray-100 text-gray-600' },
  inviata:   { label: 'Inviata',   cls: 'bg-blue-100 text-blue-700' },
  approvata: { label: 'Approvata', cls: 'bg-emerald-100 text-emerald-700' },
  rifiutata: { label: 'Rifiutata', cls: 'bg-red-100 text-red-700' },
  annullata: { label: 'Annullata', cls: 'bg-gray-100 text-gray-500' },
}

const TIPO_NODO_ICON: Record<string, string> = {
  SCALA:         '🏢',
  APPARTAMENTO:  '🏠',
  BOX:           '📦',
  ESTERNO:       '🌿',
  AREA_COMUNE:   '🤝',
  LOCALE_TECNICO:'⚙️',
  QUADRO_ELETTRICO:'⚡',
  GARAGE:        '🚗',
  CORTILE:       '🌳',
  COPERTURA:     '🏛️',
  ALTRO:         '●',
}

export function CommessaTabs({
  commessaId,
  preventivoId,
  formAction,
  clienti,
  tipiLavoro,
  defaultValues,
  tipoLavoro,
  adempimenti,
  giornate,
  fatture,
  dico,
  piano,
  operaiAssegnati,
  operaiDisponibili,
  varianti,
  sopralluogo,
  strutturaNodi,
}: Props & { sopralluogo: any }) {
  const [activeTab, setActiveTab] = useState<Tab>('timeline')

  return (
    <div>
      {/* Tab bar — overflow-x-auto per mobile */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white rounded-t-2xl shadow-sm hide-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0',
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      <div className="pt-5 space-y-4">

        {/* ── TIMELINE ── */}
        {activeTab === 'timeline' && (
          giornate.length === 0 ? (
            <EmptyPanel icon="📅" title="Nessuna giornata ancora" description="Le giornate lavorate su questo cantiere appariranno qui." />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">{giornate.length} giornata{giornate.length !== 1 ? 'e' : ''} — dalla più recente</p>
              {giornate.map(g => (
                <div key={g.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{formatData(g.data)}</p>
                        <span className="text-gray-300">·</span>
                        <p className="text-sm text-gray-600">{g.operaioNome}</p>
                      </div>
                      {g.lavoroEseguito && (
                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
                          {g.lavoroEseguito}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {g.oreOrdinarie > 0 && (
                        <p className="text-xs font-medium text-gray-700">{g.oreOrdinarie}h ord.</p>
                      )}
                      {g.oreStr > 0 && (
                        <p className="text-xs font-medium text-orange-600">{g.oreStr}h str.</p>
                      )}
                      {g.fotoCount > 0 && (
                        <p className="text-xs text-blue-600">📷 {g.fotoCount}</p>
                      )}
                      {g.lavoroEseguito !== null && (
                        <a
                          href={`/impresa/giornate/${g.id}/rapportino`}
                          className="block text-xs font-medium text-emerald-600 hover:text-emerald-800"
                        >
                          📋 Rapportino
                        </a>
                      )}
                      <a
                        href={`/impresa/giornate/${g.id}/chat`}
                        className="block text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        💬 Chat
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── SOPRALLUOGO ── */}
        {activeTab === 'sopralluogo' && (
          <SopralluogoTab commessaId={commessaId} sopralluogo={sopralluogo} />
        )}

        {/* ── ADEMPIMENTI ── */}
        {activeTab === 'adempimenti' && (
          <AdempimentiSection
            commessaId={commessaId}
            tipoLavoro={tipoLavoro}
            adempimenti={adempimenti}
          />
        )}

        {/* ── STRUTTURA CANTIERE ── */}
        {activeTab === 'struttura' && (
          <div className="space-y-4">
            {strutturaNodi.length === 0 ? (
              <div>
                <EmptyPanel
                  icon="🏗️"
                  title="Nessuna zona definita"
                  description={
                    defaultValues.tipoStruttura === 'commessa_semplice'
                      ? 'Questa è una commessa semplice. Per gestire zone e appartamenti, cambia il tipo in Note & Modifica.'
                      : 'Apri la struttura cantiere per definire scale, appartamenti, box e altre zone.'
                  }
                />
                <div className="mt-3 flex justify-center">
                  <a
                    href={`/impresa/commesse/${commessaId}/struttura`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    🏗️ Gestisci struttura →
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{strutturaNodi.length} zona{strutturaNodi.length !== 1 ? 'e' : ''} definita{strutturaNodi.length !== 1 ? 'e' : ''}</p>
                  <a
                    href={`/impresa/commesse/${commessaId}/struttura`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Gestisci struttura →
                  </a>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                  {strutturaNodi.slice(0, 10).map((n, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-base">{TIPO_NODO_ICON[n.tipo] ?? '●'}</span>
                      <span className="text-sm text-gray-800">{n.nome}</span>
                    </div>
                  ))}
                  {strutturaNodi.length > 10 && (
                    <div className="px-4 py-3 text-xs text-gray-400">
                      + altri {strutturaNodi.length - 10} nodi — apri la struttura per vederli tutti
                    </div>
                  )}
                </div>
                <a
                  href={`/impresa/commesse/${commessaId}/struttura`}
                  className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 hover:bg-blue-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏗️</span>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 group-hover:text-blue-700">Struttura completa</p>
                      <p className="text-xs text-blue-600">Aggiungi, modifica o riordina le zone del cantiere</p>
                    </div>
                  </div>
                  <span className="text-blue-400 group-hover:text-blue-600 text-lg">›</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTI ── */}
        {activeTab === 'documenti' && (
          <div className="space-y-4">
            {/* Materiali & Movimenti */}
            <a
              href={`/impresa/commesse/${commessaId}/materiali`}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔧</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Materiali & Movimenti</p>
                  <p className="text-xs text-gray-400">Costo materiali: {formatEuro(defaultValues.costiMateriali)}</p>
                </div>
              </div>
              <span className="text-gray-300 group-hover:text-blue-400 text-lg">›</span>
            </a>

            {/* Preventivo */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-800">Preventivo</h2>
              </div>
              <div className="p-5">
                {preventivoId ? (
                  <a
                    href={`/impresa/preventivi/${preventivoId}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    📋 Apri preventivo →
                  </a>
                ) : (
                  <p className="text-sm text-gray-400">Nessun preventivo collegato.</p>
                )}
              </div>
            </div>

            {/* Fatture attive */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Fatture attive</h2>
                <div className="flex items-center gap-3">
                  <a
                    href={`/impresa/fatture?commessaId=${commessaId}`}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Lista completa →
                  </a>
                  <a
                    href="/impresa/fatture/nuova"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    + Nuova
                  </a>
                </div>
              </div>
              {fatture.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">Nessuna fattura per questa commessa.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {fatture.map(f => {
                    const badge = STATI_FATTURA[f.stato] ?? { label: f.stato, cls: 'bg-gray-100 text-gray-500' }
                    return (
                      <div key={f.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                        <div>
                          <a
                            href={`/impresa/fatture/${f.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            {f.numero}/{f.anno}
                          </a>
                          <p className="text-xs text-gray-400">{formatData(f.data)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatEuro(f.totale)}</p>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Dichiarazioni di Conformità */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Dichiarazioni di Conformità (DiCo)</h2>
                <a
                  href="/impresa/dico/nuova"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Nuova
                </a>
              </div>
              {dico.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">Nessuna DiCo per questa commessa.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {dico.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                      <div>
                        <a
                          href={`/impresa/dico/${d.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {d.tipoImpianto}
                        </a>
                        <p className="text-xs text-gray-400">{formatData(d.data)}</p>
                      </div>
                      <a
                        href={`/impresa/dico/${d.id}/stampa`}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                      >
                        Stampa
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Varianti lavori */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">Varianti lavori</h2>
                <a
                  href={`/ufficio/commesse/${commessaId}/varianti/nuova`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Nuova
                </a>
              </div>
              {varianti.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">Nessuna variante per questa commessa.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {varianti.map(v => {
                    const badge = STATI_VARIANTE[v.stato] ?? { label: v.stato, cls: 'bg-gray-100 text-gray-500' }
                    return (
                      <div key={v.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                        <div className="min-w-0 flex-1">
                          <a
                            href={`/ufficio/commesse/${commessaId}/varianti/${v.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline truncate block"
                          >
                            {v.titolo}
                          </a>
                          {v.visibileCliente && (
                            <span className="text-xs text-violet-600 font-medium">Visibile al cliente</span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{formatEuro(v.importo)}</p>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PIANO ── */}
        {activeTab === 'piano' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {piano.length > 0 ? `${piano.length} pianificazion${piano.length !== 1 ? 'i' : 'e'} — dalla più recente` : 'Nessuna pianificazione ancora.'}
              </p>
              <a
                href="/impresa/pianificazione"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Vai alla pianificazione →
              </a>
            </div>
            {piano.length === 0 ? (
              <EmptyPanel
                icon="📆"
                title="Nessuna pianificazione"
                description="Le pianificazioni per questa commessa appariranno qui."
              />
            ) : (
              piano.map(p => (
                <div key={p.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{formatData(p.data)}</p>
                        {p.confermata && (
                          <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
                            Confermata
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{p.operaioNome}</p>
                      {p.mezzoNome && (
                        <p className="text-xs text-gray-400 mt-0.5">🚗 {p.mezzoNome}</p>
                      )}
                      {p.lavoroDaFare && (
                        <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                          {p.lavoroDaFare}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── NOTE & MODIFICA ── */}
        {activeTab === 'note' && (
          <div className="space-y-6">
            {/* Gestione operai */}
            <OperaiManager
              commessaId={commessaId}
              assegnati={operaiAssegnati}
              disponibili={operaiDisponibili}
            />

            {/* Form modifica commessa */}
            <CommessaForm
              action={formAction}
              clienti={clienti}
              tipiLavoro={tipiLavoro}
              defaultValues={defaultValues}
            />
          </div>
        )}

      </div>
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 px-6 text-center">
      <span className="text-4xl mb-3 select-none" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400 max-w-xs">{description}</p>
      )}
    </div>
  )
}
