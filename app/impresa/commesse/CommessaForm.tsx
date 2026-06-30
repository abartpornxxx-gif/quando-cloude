'use client'

import Link from 'next/link'
import { centsToInput, formatEuro } from '@/lib/format'
import { calcolaMargine, percentualeAvanzamento } from '@/lib/calcoli'
import { useEffect, useState } from 'react'
import { euroToCents } from '@/lib/format'

type Cliente = { id: string; nome: string }
type TipoLavoro = { id: string; nome: string }

interface Importi {
  preventivato: number
  costiMateriali: number
  costiManodopera: number
  costiMezzi: number
  fatturato: number
}

interface Props {
  action: (fd: FormData) => Promise<void>
  clienti: Cliente[]
  tipiLavoro?: TipoLavoro[]
  defaultValues?: {
    id?: string; nome?: string; clienteId?: string; indirizzoCantiere?: string
    stato?: string; note?: string; tipoLavoroId?: string
    istruzioniCantiere?: string; attrezzatureNecessarie?: string
    avanzamentoPercentuale?: number; tipoStruttura?: string
  } & Partial<Importi>
}

const TIPO_STRUTTURA_ICON: Record<string, string> = {
  SCALA: '🏢',
  APPARTAMENTO: '🏠',
  BOX: '📦',
  ESTERNO: '🌿',
  AREA_COMUNE: '🤝',
}

function generaAnteprima(
  scale: string[],
  apx: number,
  conBox: boolean,
  conEsterno: boolean,
  conAreaComune: boolean
): { tipo: string; nome: string; livello: number }[] {
  const nodi: { tipo: string; nome: string; livello: number }[] = []
  for (const scalaNome of scale) {
    const n = scalaNome.trim() || '?'
    nodi.push({ tipo: 'SCALA', nome: n, livello: 0 })
    const pref = n.replace(/^Scala\s*/i, '')
    for (let a = 1; a <= Math.min(apx, 20); a++) {
      nodi.push({ tipo: 'APPARTAMENTO', nome: `App. ${pref}${a}`, livello: 1 })
    }
  }
  if (conBox)       nodi.push({ tipo: 'BOX',         nome: 'Box',         livello: 0 })
  if (conEsterno)   nodi.push({ tipo: 'ESTERNO',     nome: 'Esterno',     livello: 0 })
  if (conAreaComune) nodi.push({ tipo: 'AREA_COMUNE', nome: 'Area comune', livello: 0 })
  return nodi
}

export function CommessaForm({ action, clienti, tipiLavoro = [], defaultValues }: Props) {
  const isNuova = !defaultValues?.id

  const [importi, setImporti] = useState<Importi>({
    preventivato: defaultValues?.preventivato ?? 0,
    costiMateriali: defaultValues?.costiMateriali ?? 0,
    costiManodopera: defaultValues?.costiManodopera ?? 0,
    costiMezzi: defaultValues?.costiMezzi ?? 0,
    fatturato: defaultValues?.fatturato ?? 0,
  })

  const [tipoStruttura, setTipoStruttura] = useState(defaultValues?.tipoStruttura ?? 'commessa_semplice')

  // Builder condominio
  const [scale, setScale] = useState<string[]>(['Scala A'])
  const [apx, setApx] = useState(4)
  const [conBox, setConBox] = useState(true)
  const [conEsterno, setConEsterno] = useState(false)
  const [conAreaComune, setConAreaComune] = useState(false)

  const margine = calcolaMargine(importi)
  const avanzamento = percentualeAvanzamento(importi)

  function handleImporto(field: keyof Importi, value: string) {
    setImporti(prev => ({ ...prev, [field]: euroToCents(value) }))
  }

  function addScala() {
    if (scale.length >= 10) return
    const nextLetter = String.fromCharCode(65 + scale.length)
    setScale(prev => [...prev, `Scala ${nextLetter}`])
  }

  function removeScala(idx: number) {
    setScale(prev => prev.filter((_, i) => i !== idx))
  }

  function updateScalaNome(idx: number, nome: string) {
    setScale(prev => prev.map((s, i) => (i === idx ? nome : s)))
  }

  const anteprima = generaAnteprima(scale, apx, conBox, conEsterno, conAreaComune)
  const showBuilder = isNuova && tipoStruttura === 'condominio_parco'

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {/* Dati base */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome commessa *</label>
          <input name="nome" required defaultValue={defaultValues?.nome}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <select name="clienteId" defaultValue={defaultValues?.clienteId ?? ''}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">— Nessun cliente —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stato</label>
            <select name="stato" defaultValue={defaultValues?.stato ?? 'aperta'}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="aperta">Aperta</option>
              <option value="finita">Finita (lavori completati)</option>
              <option value="chiusa">Chiusa (saldata)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Indirizzo cantiere</label>
          <input name="indirizzoCantiere" defaultValue={defaultValues?.indirizzoCantiere}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        {tipiLavoro.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo di lavoro</label>
            <select name="tipoLavoroId" defaultValue={defaultValues?.tipoLavoroId ?? ''}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">— Nessun tipo —</option>
              {tipiLavoro.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">Determina la checklist di adempimenti da applicare.</p>
          </div>
        )}

        {/* Tipo struttura cantiere */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo di cantiere</label>
          <select
            name="tipoStruttura"
            value={tipoStruttura}
            onChange={e => setTipoStruttura(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="commessa_semplice">Commessa semplice</option>
            <option value="condominio_parco">Condominio / Parco (scale e appartamenti)</option>
            <option value="cantiere_strutturato">Cantiere strutturato (zone personalizzate)</option>
          </select>
          {!isNuova && tipoStruttura !== 'commessa_semplice' && (
            <p className="mt-1 text-xs text-gray-400">Gestisci le zone dalla tab Struttura.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Note interne</label>
          <textarea name="note" rows={2} defaultValue={defaultValues?.note}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Note riservate all'impresa (non visibili all'operaio)" />
        </div>
      </div>

      {/* ── Builder struttura — solo in nuova commessa di tipo condominio ── */}
      {showBuilder && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-blue-900">Struttura iniziale cantiere</h2>
            <p className="mt-0.5 text-xs text-blue-700">
              Configura scale e appartamenti. Potrai modificare o aggiungere zone dopo la creazione.
            </p>
          </div>

          {/* Scale */}
          <div>
            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Scale</label>
            <div className="space-y-2">
              {scale.map((nome, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nome}
                    onChange={e => updateScalaNome(idx, e.target.value)}
                    placeholder={`Scala ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {scale.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScala(idx)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-400 hover:text-red-500 hover:border-red-200"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {scale.length < 10 && (
              <button
                type="button"
                onClick={addScala}
                className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900"
              >
                + Aggiungi scala
              </button>
            )}
          </div>

          {/* Appartamenti per scala */}
          <div>
            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">
              Appartamenti per scala: <span className="text-blue-900 font-bold">{apx}</span>
            </label>
            <input
              type="range" min={1} max={20} step={1}
              value={apx}
              onChange={e => setApx(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-blue-600 mt-0.5">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Aree comuni */}
          <div>
            <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Aree comuni</label>
            <div className="flex flex-wrap gap-4">
              {[
                { label: '📦 Box', value: conBox, set: setConBox },
                { label: '🌿 Esterno', value: conEsterno, set: setConEsterno },
                { label: '🤝 Area comune', value: conAreaComune, set: setConAreaComune },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={e => set(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span className="text-sm text-blue-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Anteprima */}
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">
              Anteprima — {anteprima.length} nodi
            </p>
            <div className="rounded-lg bg-white border border-blue-100 p-3 space-y-1 max-h-40 overflow-y-auto">
              {anteprima.map((n, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 text-xs ${n.livello === 1 ? 'pl-5 text-gray-500' : 'font-medium text-gray-800'}`}
                >
                  <span>{TIPO_STRUTTURA_ICON[n.tipo] ?? '●'}</span>
                  <span>{n.nome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden inputs per il server action */}
          <input type="hidden" name="struttura_scale" value={JSON.stringify(scale)} />
          <input type="hidden" name="struttura_apx" value={apx.toString()} />
          <input type="hidden" name="struttura_box" value={conBox ? 'true' : 'false'} />
          <input type="hidden" name="struttura_esterno" value={conEsterno ? 'true' : 'false'} />
          <input type="hidden" name="struttura_area_comune" value={conAreaComune ? 'true' : 'false'} />
        </div>
      )}

      {/* Istruzioni operative — visibili all'operaio */}
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-emerald-900">Istruzioni operative cantiere</h2>
          <p className="mt-0.5 text-xs text-emerald-700">
            Queste informazioni sono visibili all&apos;operaio durante tutta la giornata di lavoro.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-900">Istruzioni fisse del cantiere</label>
          <textarea
            name="istruzioniCantiere"
            rows={4}
            defaultValue={defaultValues?.istruzioniCantiere}
            className="mt-1 block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Es: il cliente apre alle 8, si entra dalla porta laterale, il quadro è nel locale tecnico al piano interrato…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-900">Attrezzature / materiale da portare sempre</label>
          <textarea
            name="attrezzatureNecessarie"
            rows={3}
            defaultValue={defaultValues?.attrezzatureNecessarie}
            className="mt-1 block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            placeholder="Es: porta sempre il tester digitale, cavo 4mm², fascette colorate, DPI livello 2…"
          />
        </div>
      </div>

      {/* Importi */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Importi (€)</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {[
            { label: 'Importo preventivato', name: 'preventivato', key: 'preventivato' as const },
            { label: 'Fatturato al cliente', name: 'fatturato', key: 'fatturato' as const },
            { label: 'Costi materiali', name: 'costiMateriali', key: 'costiMateriali' as const },
            { label: 'Costi manodopera', name: 'costiManodopera', key: 'costiManodopera' as const },
            { label: 'Costi mezzi', name: 'costiMezzi', key: 'costiMezzi' as const },
          ].map(({ label, name, key }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">€</span>
                <input
                  type="number" step="0.01" min="0"
                  name={name}
                  defaultValue={centsToInput(importi[key])}
                  onChange={e => handleImporto(key, e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Avanzamento manuale per Portale Cliente */}
        <div className="border-t border-gray-100 px-6 py-4">
          <label className="block text-sm font-medium text-gray-700">Avanzamento lavori (visibile al cliente) *</label>
          <div className="mt-2 flex items-center gap-4">
            <input
              type="range"
              name="avanzamentoPercentuale"
              min="0" max="100" step="5"
              defaultValue={defaultValues?.avanzamentoPercentuale ?? 0}
              onChange={e => {
                const el = document.getElementById('avanzamento-val')
                if (el) el.innerText = `${e.target.value}%`
              }}
              className="flex-1 accent-blue-600"
            />
            <span id="avanzamento-val" className="text-lg font-bold text-blue-600 w-12 text-right">
              {defaultValues?.avanzamentoPercentuale ?? 0}%
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Questa percentuale anima la barra di progresso nel Portale Cliente.</p>
        </div>

        {/* Dashboard margine */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Margine attuale</p>
              <p className={`mt-1 text-2xl font-bold ${margine >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatEuro(margine)}
                {importi.preventivato > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({margine >= 0 ? '+' : ''}{Math.round((margine / importi.preventivato) * 100)}%)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Avanzamento fatturato</p>
              <p className="mt-1 text-lg font-semibold text-gray-700">{avanzamento}%</p>
              <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${avanzamento}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Salva commessa
        </button>
        <Link href="/impresa/commesse" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}
