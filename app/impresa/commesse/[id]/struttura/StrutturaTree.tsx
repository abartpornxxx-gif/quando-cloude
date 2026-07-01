'use client'

import { useState, useTransition } from 'react'
import { aggiungiNodo, eliminaNodo, toggleAttivoNodo, quickBuildStruttura } from './actions'

const TIPI: { value: string; label: string; icon: string }[] = [
  { value: 'SCALA',           label: 'Scala',              icon: '🏢' },
  { value: 'APPARTAMENTO',    label: 'Appartamento',       icon: '🏠' },
  { value: 'BOX',             label: 'Box / Cantina',      icon: '📦' },
  { value: 'ESTERNO',         label: 'Esterno',            icon: '🌳' },
  { value: 'AREA_COMUNE',     label: 'Area comune',        icon: '🚪' },
  { value: 'LOCALE_TECNICO',  label: 'Locale tecnico',     icon: '⚙️' },
  { value: 'QUADRO_ELETTRICO',label: 'Quadro elettrico',   icon: '⚡' },
  { value: 'GARAGE',          label: 'Garage',             icon: '🚗' },
  { value: 'CORTILE',         label: 'Cortile',            icon: '🏡' },
  { value: 'COPERTURA',       label: 'Copertura / Tetto',  icon: '🏗️' },
  { value: 'ALTRO',           label: 'Altro',              icon: '📌' },
]

function tipoIcon(tipo: string) {
  return TIPI.find(t => t.value === tipo)?.icon ?? '📌'
}
function tipoLabel(tipo: string) {
  return TIPI.find(t => t.value === tipo)?.label ?? tipo
}

type Nodo = {
  id: string
  tipo: string
  nome: string
  codice: string | null
  piano: string | null
  interno: string | null
  attivo: boolean
  ordinamento: number
  parentId: string | null
  children: Nodo[]
}

interface Props {
  commessaId: string
  nodi: Nodo[]
}

export function StrutturaTree({ commessaId, nodi }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errore, setErrore] = useState<string | null>(null)
  const [addingParentId, setAddingParentId] = useState<string | null | 'root'>('root')
  const [showQuickBuild, setShowQuickBuild] = useState(false)

  // Form stato per aggiunta nodo
  const [nuovoTipo, setNuovoTipo] = useState('SCALA')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoCodice, setNuovoCodice] = useState('')

  // Quick build stato
  const [qbScale, setQbScale] = useState(2)
  const [qbApp, setQbApp] = useState(4)
  const [qbNBox, setQbNBox] = useState(0)
  const [qbEsterno, setQbEsterno] = useState(false)
  const [qbAreeComuni, setQbAreeComuni] = useState<string[]>(['Androne'])

  function handleAggiungi(parentId: string | null) {
    if (!nuovoNome.trim()) { setErrore('Il nome è obbligatorio'); return }
    setErrore(null)
    startTransition(async () => {
      try {
        await aggiungiNodo({
          commessaId,
          parentId,
          tipo: nuovoTipo,
          nome: nuovoNome,
          codice: nuovoCodice || undefined,
        })
        setNuovoNome('')
        setNuovoCodice('')
        setAddingParentId(null)
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore')
      }
    })
  }

  function handleElimina(nodoId: string, nomeNodo: string) {
    if (!confirm(`Elimina "${nomeNodo}" e tutti i sotto-nodi?`)) return
    setErrore(null)
    startTransition(async () => {
      try {
        await eliminaNodo(nodoId, commessaId)
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore eliminazione')
      }
    })
  }

  function handleToggleAttivo(nodoId: string, attivo: boolean) {
    startTransition(async () => {
      await toggleAttivoNodo(nodoId, commessaId, attivo)
    })
  }

  function handleQuickBuild() {
    startTransition(async () => {
      try {
        await quickBuildStruttura(commessaId, {
          nScale: qbScale,
          appartamentiPerScala: qbApp,
          nBox: qbNBox,
          conEsterno: qbEsterno,
          areeComuni: qbAreeComuni,
        })
        setShowQuickBuild(false)
      } catch (e: unknown) {
        setErrore(e instanceof Error ? e.message : 'Errore quick build')
      }
    })
  }

  const hasNodi = nodi.length > 0

  return (
    <div className="space-y-4">
      {errore && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errore}
        </div>
      )}

      {/* Quick Build */}
      {!hasNodi && !showQuickBuild && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-5">
          <p className="text-sm font-semibold text-blue-800 mb-1">Struttura cantiere vuota</p>
          <p className="text-xs text-blue-600 mb-4">
            Usa il costruttore rapido per generare scale, appartamenti e aree comuni in un clic, oppure aggiungi i nodi manualmente.
          </p>
          <button
            onClick={() => setShowQuickBuild(true)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
          >
            Costruttore rapido
          </button>
        </div>
      )}

      {showQuickBuild && (
        <div className="rounded-2xl border border-blue-200 bg-white shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Costruttore rapido struttura</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Numero scale</label>
              <input
                type="number" min={1} max={10} value={qbScale}
                onChange={e => setQbScale(+e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Appartamenti per scala</label>
              <input
                type="number" min={1} max={20} value={qbApp}
                onChange={e => setQbApp(+e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Numero box</label>
              <input
                type="number" min={0} max={20} value={qbNBox}
                onChange={e => setQbNBox(+e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={qbEsterno} onChange={e => setQbEsterno(e.target.checked)} className="rounded" />
                Esterno
              </label>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Aree comuni</p>
            <div className="flex flex-wrap gap-3">
              {['Androne', 'Vano scala', 'Vano contatori', 'Locale tecnico', 'Garage', 'Cortile', 'Copertura'].map(a => (
                <label key={a} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qbAreeComuni.includes(a)}
                    onChange={() => setQbAreeComuni(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])}
                    className="rounded"
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleQuickBuild}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creazione...' : 'Crea struttura'}
            </button>
            <button
              onClick={() => setShowQuickBuild(false)}
              className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Albero nodi */}
      {hasNodi && (
        <div className="space-y-1">
          {nodi.map(n => (
            <NodoRow
              key={n.id}
              nodo={n}
              depth={0}
              commessaId={commessaId}
              isPending={isPending}
              onElimina={handleElimina}
              onToggleAttivo={handleToggleAttivo}
              addingParentId={addingParentId}
              setAddingParentId={setAddingParentId}
              nuovoTipo={nuovoTipo} setNuovoTipo={setNuovoTipo}
              nuovoNome={nuovoNome} setNuovoNome={setNuovoNome}
              nuovoCodice={nuovoCodice} setNuovoCodice={setNuovoCodice}
              onAggiungi={handleAggiungi}
            />
          ))}
        </div>
      )}

      {/* Form aggiungi nodo radice */}
      <div>
        {addingParentId === 'root' || !hasNodi ? (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {hasNodi ? 'Aggiungi zona al livello radice' : 'Aggiungi zona'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={nuovoTipo}
                onChange={e => setNuovoTipo(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm col-span-2"
              >
                {TIPI.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              <input
                placeholder="Nome (es. Scala A)"
                value={nuovoNome}
                onChange={e => setNuovoNome(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm col-span-2"
              />
              <input
                placeholder="Codice (opzionale)"
                value={nuovoCodice}
                onChange={e => setNuovoCodice(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleAggiungi(null)}
                disabled={isPending}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
              >
                + Aggiungi
              </button>
            </div>
          </div>
        ) : hasNodi && (
          <button
            onClick={() => setAddingParentId('root')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Aggiungi zona al livello radice
          </button>
        )}
      </div>
    </div>
  )
}

function NodoRow({
  nodo, depth, commessaId, isPending,
  onElimina, onToggleAttivo,
  addingParentId, setAddingParentId,
  nuovoTipo, setNuovoTipo,
  nuovoNome, setNuovoNome,
  nuovoCodice, setNuovoCodice,
  onAggiungi,
}: {
  nodo: Nodo
  depth: number
  commessaId: string
  isPending: boolean
  onElimina: (id: string, nome: string) => void
  onToggleAttivo: (id: string, attivo: boolean) => void
  addingParentId: string | null | 'root'
  setAddingParentId: (v: string | null | 'root') => void
  nuovoTipo: string; setNuovoTipo: (v: string) => void
  nuovoNome: string; setNuovoNome: (v: string) => void
  nuovoCodice: string; setNuovoCodice: (v: string) => void
  onAggiungi: (parentId: string | null) => void
}) {
  const indent = depth * 20

  return (
    <div>
      <div
        className={[
          'flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors',
          nodo.attivo ? 'bg-white border border-gray-200 shadow-sm' : 'bg-gray-50 border border-gray-100 opacity-60',
        ].join(' ')}
        style={{ marginLeft: indent }}
      >
        <span className="text-base shrink-0">{tipoIcon(nodo.tipo)}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${nodo.attivo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
            {nodo.nome}
            {nodo.codice && <span className="ml-1.5 text-xs text-gray-400">({nodo.codice})</span>}
          </p>
          <p className="text-xs text-gray-400">{tipoLabel(nodo.tipo)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setNuovoNome('')
              setNuovoCodice('')
              setAddingParentId(addingParentId === nodo.id ? null : nodo.id)
            }}
            title="Aggiungi sotto-zona"
            className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 font-medium"
          >
            +sub
          </button>
          <button
            onClick={() => onToggleAttivo(nodo.id, !nodo.attivo)}
            disabled={isPending}
            title={nodo.attivo ? 'Disattiva' : 'Riattiva'}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            {nodo.attivo ? '◉' : '○'}
          </button>
          <button
            onClick={() => onElimina(nodo.id, nodo.nome)}
            disabled={isPending}
            title="Elimina"
            className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Form aggiungi figlio */}
      {addingParentId === nodo.id && (
        <div
          className="rounded-xl border border-blue-100 bg-blue-50 p-3 mt-1 space-y-2"
          style={{ marginLeft: indent + 20 }}
        >
          <p className="text-xs font-semibold text-blue-700">Aggiungi in {nodo.nome}</p>
          <select
            value={nuovoTipo}
            onChange={e => setNuovoTipo(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {TIPI.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <input
            placeholder="Nome (es. Appartamento A1)"
            value={nuovoNome}
            onChange={e => setNuovoNome(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onAggiungi(nodo.id)}
              disabled={isPending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              Aggiungi
            </button>
            <button
              onClick={() => setAddingParentId(null)}
              className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 text-xs font-medium"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Figli */}
      {nodo.children.map(child => (
        <NodoRow
          key={child.id}
          nodo={child}
          depth={depth + 1}
          commessaId={commessaId}
          isPending={isPending}
          onElimina={onElimina}
          onToggleAttivo={onToggleAttivo}
          addingParentId={addingParentId}
          setAddingParentId={setAddingParentId}
          nuovoTipo={nuovoTipo} setNuovoTipo={setNuovoTipo}
          nuovoNome={nuovoNome} setNuovoNome={setNuovoNome}
          nuovoCodice={nuovoCodice} setNuovoCodice={setNuovoCodice}
          onAggiungi={onAggiungi}
        />
      ))}
    </div>
  )
}
