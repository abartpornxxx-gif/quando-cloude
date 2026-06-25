'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Calendar, MapPin, User, CheckCircle, Trash2, Clock, Plus, AlertCircle } from 'lucide-react'
import { getPromemoriaFiltro, creaPromemoria, completaPromemoria, eliminaPromemoria } from './actions'

type OperaioDropdown = { id: string; nome: string }

export default function PromemoriaPage() {
  const [filtro, setFiltro] = useState<'oggi' | 'futuri' | 'completati'>('oggi')
  const [items, setItems] = useState<any[]>([])
  const [operai, setOperai] = useState<OperaioDropdown[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  // Form State
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [luogo, setLuogo] = useState('')
  const [dataOra, setDataOra] = useState('')
  const [assegnatoAOperaioId, setAssegnatoAOperaioId] = useState('')
  const [perImpresa, setPerImpresa] = useState(false)
  const [message, setMessage] = useState('')

  // Load reminders and list of operai
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const promemoriaList = await getPromemoriaFiltro(filtro)
        setItems(promemoriaList)
        
        // Fetch operai list dynamically
        const response = await fetch('/api/operai')
        if (response.ok) {
          const data = await response.json()
          setOperai(data)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [filtro])

  // Reload lists
  async function reloadList() {
    try {
      const promemoriaList = await getPromemoriaFiltro(filtro)
      setItems(promemoriaList)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!titolo.trim() || !dataOra) {
      setMessage('❌ Titolo e Data/Ora sono richiesti.')
      return
    }
    setMessage('')
    
    startTransition(async () => {
      try {
        await creaPromemoria({
          titolo: `TEST_AI_FULL_QUADRO: ${titolo.trim()}`,
          descrizione: descrizione.trim() || undefined,
          luogo: luogo.trim() || undefined,
          dataOra,
          assegnatoAOperaioId: assegnatoAOperaioId || undefined,
          perImpresa,
        })
        setMessage('✅ Promemoria creato con successo!')
        setTitolo('')
        setDescrizione('')
        setLuogo('')
        setDataOra('')
        setAssegnatoAOperaioId('')
        setPerImpresa(false)
        await reloadList()
        setTimeout(() => setMessage(''), 3000)
      } catch (err) {
        console.error(err)
        setMessage('❌ Errore durante la creazione.')
      }
    })
  }

  async function handleToggleComplete(id: string, completato: boolean) {
    try {
      await completaPromemoria(id, completato)
      await reloadList()
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo promemoria?')) return
    try {
      await eliminaPromemoria(id)
      await reloadList()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>📅</span> Area Promemoria & Appuntamenti
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestisci e pianifica gli appuntamenti della giornata per l&apos;impresa o assegnali direttamente al personale operativo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form di Creazione */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-1 h-fit">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Plus size={16} className="text-teal-600" />
            Nuovo Appuntamento
          </h2>
          
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Titolo appuntamento *</label>
              <input
                type="text"
                value={titolo}
                onChange={e => setTitolo(e.target.value)}
                placeholder="Es: Antonio - Intervento Via Roma"
                className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Luogo / Indirizzo</label>
              <input
                type="text"
                value={luogo}
                onChange={e => setLuogo(e.target.value)}
                placeholder="Es: Via Roma 15, Milano"
                className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Data e Ora *</label>
                <input
                  type="datetime-local"
                  value={dataOra}
                  onChange={e => setDataOra(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Assegna a personale (Operaio)</label>
              <select
                value={assegnatoAOperaioId}
                onChange={e => {
                  setAssegnatoAOperaioId(e.target.value)
                  if (e.target.value) setPerImpresa(false) // auto-uncheck per impresa if assigned to operaio
                }}
                className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">— Nessuno (Promemoria libero) —</option>
                {operai.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="perImpresa"
                checked={perImpresa}
                onChange={e => {
                  setPerImpresa(e.target.checked)
                  if (e.target.checked) setAssegnatoAOperaioId('') // clear operaio assignment
                }}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <label htmlFor="perImpresa" className="text-gray-700 font-medium cursor-pointer">
                Contrassegna come promemoria Impresa
              </label>
            </div>

            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Note / Descrizione</label>
              <textarea
                value={descrizione}
                onChange={e => setDescrizione(e.target.value)}
                placeholder="Es: Portare attrezzatura per collaudo impianto termico..."
                className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                rows={3}
              />
            </div>

            {message && <p className="text-xs font-bold text-center mt-2">{message}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Plus size={14} />
              Crea Appuntamento
            </button>
          </form>
        </div>

        {/* Lista Promemoria */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4 flex flex-col">
          {/* Filtri */}
          <div className="flex border-b border-gray-200 gap-2 pb-1 text-xs font-semibold">
            {[
              { id: 'oggi', label: 'Oggi' },
              { id: 'futuri', label: 'Futuri' },
              { id: 'completati', label: 'Completati' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id as any)}
                className={`px-4 py-2 border-b-2 transition-colors ${
                  filtro === f.id
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List items */}
          {loading ? (
            <div className="flex-1 flex h-48 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-700" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 rounded-xl bg-slate-50/50">
              <AlertCircle size={32} className="text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-500">Nessun promemoria trovato</p>
              <p className="text-xs text-gray-400 mt-1">Crea un nuovo appuntamento compilando il modulo a sinistra.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {items.map(item => {
                const dateStr = new Date(item.dataOra).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const dayStr = new Date(item.dataOra).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                })

                return (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-xl transition-all flex items-start justify-between gap-4 ${
                      item.stato === 'completato' ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-white border-slate-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-none">{dayStr}</span>
                        <span className="text-xs font-black text-slate-800 mt-0.5 leading-none">{dateStr}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800 leading-snug">{item.titolo}</p>
                        {item.descrizione && <p className="text-xs text-slate-500 leading-relaxed">{item.descrizione}</p>}
                        
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 text-[10px] text-gray-400 font-semibold">
                          {item.luogo && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-teal-600" />
                              {item.luogo}
                            </span>
                          )}
                          {item.operaio && (
                            <span className="flex items-center gap-1">
                              <User size={11} className="text-indigo-600" />
                              Assegnato a: {item.operaio.nome}
                            </span>
                          )}
                          {item.perImpresa && (
                            <span className="flex items-center gap-1 text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">
                              🏛️ Promemoria Impresa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item.id, item.stato !== 'completato')}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          item.stato === 'completato'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-white'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200'
                        }`}
                        title={item.stato === 'completato' ? 'Segna come attivo' : 'Segna come completato'}
                      >
                        <CheckCircle size={14} className="fill-current text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
