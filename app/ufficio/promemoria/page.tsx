'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Calendar, MapPin, User, CheckCircle, Trash2, Clock, Plus, AlertCircle, Star, Edit2, X, Search, ChevronRight } from 'lucide-react'
import { getPromemoriaFiltro, creaPromemoria, completaPromemoria, eliminaPromemoria, aggiornaPromemoria, toggleImportante } from './actions'

type OperaioDropdown = { id: string; nome: string }

export default function PromemoriaPage() {
  const [filtro, setFiltro] = useState<'oggi' | 'futuri' | 'completati'>('oggi')
  const [items, setItems] = useState<any[]>([])
  const [operai, setOperai] = useState<OperaioDropdown[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  
  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('')

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // Load reminders and list of operai
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const promemoriaList = await getPromemoriaFiltro(filtro)
        setItems(promemoriaList)
        
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

  async function reloadList() {
    try {
      const promemoriaList = await getPromemoriaFiltro(filtro)
      setItems(promemoriaList)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return

    // Quick add default to today at current time + 1 hour
    const date = new Date()
    date.setHours(date.getHours() + 1)
    date.setMinutes(0)
    // Fix timezone offset for local ISO string
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);

    startTransition(async () => {
      try {
        await creaPromemoria({
          titolo: quickTitle.trim(),
          dataOra: localISOTime,
          perImpresa: true, // Default per l'impresa
          importante: false
        })
        setQuickTitle('')
        await reloadList()
      } catch (err) {
        console.error(err)
      }
    })
  }

  async function handleToggleComplete(id: string, completato: boolean) {
    // Optimistic update
    setItems(items.map(it => it.id === id ? { ...it, stato: completato ? 'completato' : 'attivo' } : it))
    try {
      await completaPromemoria(id, completato)
      await reloadList()
    } catch (err) {
      console.error(err)
      await reloadList()
    }
  }

  async function handleToggleImportante(id: string, importante: boolean) {
    // Optimistic update
    setItems(items.map(it => it.id === id ? { ...it, importante } : it))
    try {
      await toggleImportante(id, importante)
      await reloadList()
    } catch (err) {
      console.error(err)
      await reloadList()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return
    try {
      await eliminaPromemoria(id)
      await reloadList()
      if (editingId === id) setEditingId(null)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return

    startTransition(async () => {
      try {
        await aggiornaPromemoria(editingId, {
          titolo: editForm.titolo,
          descrizione: editForm.descrizione,
          luogo: editForm.luogo,
          dataOra: editForm.dataOra,
          assegnatoAOperaioId: editForm.assegnatoAOperaioId,
          perImpresa: editForm.perImpresa,
          importante: editForm.importante
        })
        setEditingId(null)
        await reloadList()
      } catch (err) {
        console.error(err)
      }
    })
  }

  function openEdit(item: any) {
    // Convert UTC dataOra to local datetime-local format
    const d = new Date(item.dataOra)
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);

    setEditForm({
      titolo: item.titolo || '',
      descrizione: item.descrizione || '',
      luogo: item.luogo || '',
      dataOra: localISOTime,
      assegnatoAOperaioId: item.assegnatoAOperaioId || '',
      perImpresa: item.perImpresa || false,
      importante: item.importante || false
    })
    setEditingId(item.id)
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header Premium */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-600/20">
              <CheckCircle size={24} />
            </div>
            Le mie Task
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Gestione rapida degli appuntamenti e promemoria in stile Google Tasks.</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Sidebar Nav */}
        <div className="w-64 flex flex-col gap-2 shrink-0">
          {[
            { id: 'oggi', icon: <Calendar size={18} />, label: 'Oggi' },
            { id: 'futuri', icon: <ChevronRight size={18} />, label: 'Programmati' },
            { id: 'completati', icon: <CheckCircle size={18} />, label: 'Completati' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFiltro(f.id as any); setEditingId(null) }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold text-sm ${
                filtro === f.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className={filtro === f.id ? 'text-blue-600' : 'text-slate-400'}>{f.icon}</div>
              {f.label}
              {filtro === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
            </button>
          ))}

          <div className="mt-8 px-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Statistiche veloci</div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-500 font-medium">Task totali</span>
                <span className="font-bold text-slate-800">{items.length}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
          
          {/* Quick Add Bar */}
          {filtro !== 'completati' && (
            <form onSubmit={handleQuickAdd} className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative flex items-center">
                <Plus size={20} className="absolute left-4 text-blue-600" />
                <input
                  type="text"
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder="Aggiungi una task veloce..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
                <button 
                  type="submit" 
                  disabled={!quickTitle.trim() || pending}
                  className="absolute right-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          )}

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <CheckCircle size={48} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Nessuna task {filtro === 'oggi' ? 'per oggi' : ''}</h3>
                <p className="text-sm text-slate-500">Usa la barra qui sopra per aggiungere rapidamente un promemoria.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.id} className="group relative">
                    <div 
                      onClick={() => openEdit(item)}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-slate-50 hover:border-slate-200 ${
                        item.stato === 'completato' ? 'opacity-60' : ''
                      } ${editingId === item.id ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(item.id, item.stato !== 'completato') }}
                        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                      >
                        {item.stato === 'completato' ? (
                          <CheckCircle size={20} className="text-emerald-500 fill-emerald-50" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-blue-400"></div>
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${item.stato === 'completato' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.titolo}
                          </p>
                          {item.importante && <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />}
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Clock size={10} />
                            {new Date(item.dataOra).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {item.luogo && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {item.luogo}
                            </span>
                          )}
                          
                          {item.operaio && (
                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <User size={10} /> {item.operaio.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleImportante(item.id, !item.importante) }}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Segna come importante"
                        >
                          <Star size={16} className={item.importante ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-slate-400"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Panel (Slide in if editing) */}
        {editingId && (
          <div className="w-80 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 overflow-y-auto shrink-0 animate-in slide-in-from-right-8 duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" />
                Dettagli Task
              </h3>
              <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Titolo</label>
                <textarea
                  value={editForm.titolo}
                  onChange={e => setEditForm({ ...editForm, titolo: e.target.value })}
                  className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data e Ora</label>
                <input
                  type="datetime-local"
                  value={editForm.dataOra}
                  onChange={e => setEditForm({ ...editForm, dataOra: e.target.value })}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Luogo</label>
                <input
                  type="text"
                  value={editForm.luogo}
                  onChange={e => setEditForm({ ...editForm, luogo: e.target.value })}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  placeholder="Es: Via Roma 15"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Assegnazione</label>
                <select
                  value={editForm.assegnatoAOperaioId}
                  onChange={e => setEditForm({ ...editForm, assegnatoAOperaioId: e.target.value, perImpresa: !e.target.value })}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                >
                  <option value="">Nessun operaio (Per Impresa)</option>
                  {operai.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Note</label>
                <textarea
                  value={editForm.descrizione}
                  onChange={e => setEditForm({ ...editForm, descrizione: e.target.value })}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-y"
                  rows={4}
                  placeholder="Aggiungi dettagli..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {pending ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
