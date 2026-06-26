'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Calendar, MapPin, User, CheckCircle, Trash2, Clock,
  Plus, Star, Edit2, X, ChevronRight, CalendarDays, ListChecks,
} from 'lucide-react'
import {
  getPromemoriaFiltro, creaPromemoria, completaPromemoria,
  eliminaPromemoria, aggiornaPromemoria, toggleImportante, getOperaiDropdown,
} from './actions'

type Filtro = 'tutti' | 'oggi' | 'futuri' | 'completati'
type OperaioDropdown = { id: string; nome: string }
type Promemoria = {
  id: string; titolo: string; descrizione?: string | null; luogo?: string | null
  dataOra: Date; stato: string; importante: boolean; perImpresa: boolean
  assegnatoAOperaioId?: string | null
  operaio?: { nome: string } | null
}

const FILTRI = [
  { id: 'tutti',      icon: ListChecks,   label: 'Tutti',       desc: 'Tutti gli attivi' },
  { id: 'oggi',       icon: Calendar,     label: 'Oggi',        desc: 'Scadono oggi' },
  { id: 'futuri',     icon: ChevronRight, label: 'Prossimi',    desc: 'Futuri' },
  { id: 'completati', icon: CheckCircle,  label: 'Completati',  desc: 'Storico' },
] as const

const FORM_VUOTO = {
  titolo: '', descrizione: '', luogo: '',
  dataOra: '', assegnatoAOperaioId: '', perImpresa: true, importante: false,
}

function dataDefault() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export default function PromemoriaPage() {
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [items, setItems] = useState<Promemoria[]>([])
  const [operai, setOperai] = useState<OperaioDropdown[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  // Pannello destra: null = chiuso, 'new' = crea nuovo, '<id>' = modifica
  const [pannello, setPannello] = useState<string | null>(null)
  const [form, setForm] = useState<typeof FORM_VUOTO>({ ...FORM_VUOTO })

  useEffect(() => {
    getOperaiDropdown().then(setOperai).catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    getPromemoriaFiltro(filtro)
      .then(data => setItems(data as Promemoria[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filtro])

  function reload() {
    getPromemoriaFiltro(filtro)
      .then(data => setItems(data as Promemoria[]))
      .catch(console.error)
  }

  function apraNuovo() {
    setForm({ ...FORM_VUOTO, dataOra: dataDefault() })
    setPannello('new')
  }

  function apraModifica(item: Promemoria) {
    const d = new Date(item.dataOra)
    const off = d.getTimezoneOffset() * 60000
    const localISO = new Date(d.getTime() - off).toISOString().slice(0, 16)
    setForm({
      titolo: item.titolo,
      descrizione: item.descrizione ?? '',
      luogo: item.luogo ?? '',
      dataOra: localISO,
      assegnatoAOperaioId: item.assegnatoAOperaioId ?? '',
      perImpresa: item.perImpresa,
      importante: item.importante,
    })
    setPannello(item.id)
  }

  function handleSalva(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titolo.trim() || !form.dataOra) return
    startTransition(async () => {
      try {
        const payload = {
          titolo: form.titolo.trim(),
          descrizione: form.descrizione || undefined,
          luogo: form.luogo || undefined,
          dataOra: form.dataOra,
          assegnatoAOperaioId: form.assegnatoAOperaioId || undefined,
          perImpresa: !form.assegnatoAOperaioId,
          importante: form.importante,
        }
        if (pannello === 'new') {
          await creaPromemoria(payload)
        } else if (pannello) {
          await aggiornaPromemoria(pannello, payload)
        }
        setPannello(null)
        reload()
      } catch (err) { console.error(err) }
    })
  }

  async function handleCompleta(id: string, era: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, stato: era ? 'attivo' : 'completato' } : i))
    try { await completaPromemoria(id, !era); reload() }
    catch { reload() }
  }

  async function handleImportante(id: string, era: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, importante: !era } : i))
    try { await toggleImportante(id, !era); reload() }
    catch { reload() }
  }

  async function handleElimina(id: string) {
    if (!confirm('Eliminare questo promemoria?')) return
    try {
      await eliminaPromemoria(id)
      if (pannello === id) setPannello(null)
      reload()
    } catch { reload() }
  }

  const attivi = items.filter(i => i.stato === 'attivo').length
  const importanti = items.filter(i => i.importante && i.stato === 'attivo').length

  return (
    <div className="max-w-6xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Intestazione */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
              <CalendarDays size={20} />
            </div>
            Promemoria &amp; Appuntamenti
          </h1>
          <p className="text-sm text-slate-500 mt-1">Pianifica attività, cantieri e appuntamenti con il team.</p>
        </div>
        <button
          onClick={apraNuovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={16} />
          Nuovo promemoria
        </button>
      </div>

      <div className="flex flex-1 gap-5 min-h-0">

        {/* Sidebar */}
        <div className="w-56 flex flex-col gap-1.5 shrink-0">
          {FILTRI.map(f => {
            const Icon = f.icon
            const active = filtro === f.id
            return (
              <button
                key={f.id}
                onClick={() => { setFiltro(f.id); setPannello(null) }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium text-left ${
                  active
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span className="flex-1">{f.label}</span>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            )
          })}

          {/* Riepilogo */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Riepilogo</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Attivi</span>
              <span className="font-bold text-slate-800">{attivi}</span>
            </div>
            {importanti > 0 && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-amber-600">
                  <Star size={12} className="fill-amber-400" /> Importanti
                </span>
                <span className="font-bold text-amber-700">{importanti}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
                <div className="bg-slate-50 p-5 rounded-2xl mb-4">
                  <CalendarDays size={40} className="text-slate-300 mx-auto" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Nessun promemoria {filtro === 'oggi' ? 'per oggi' : filtro === 'completati' ? 'completato' : ''}</p>
                <p className="text-xs text-slate-400 mb-4">Crea il primo con il pulsante qui sopra.</p>
                <button
                  onClick={apraNuovo}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                >
                  <Plus size={14} /> Nuovo promemoria
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map(item => {
                  const completato = item.stato === 'completato'
                  const isEditing = pannello === item.id
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                        isEditing ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleCompleta(item.id, completato)}
                        className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                      >
                        {completato
                          ? <CheckCircle size={20} className="text-emerald-500 fill-emerald-50" />
                          : <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-400" />
                        }
                      </button>

                      {/* Contenuto */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${completato ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.importante && <Star size={11} className="inline fill-amber-400 text-amber-400 mr-1 mb-0.5" />}
                          {item.titolo}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Clock size={10} />
                            {new Date(item.dataOra).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {item.luogo && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin size={10} />{item.luogo}
                            </span>
                          )}
                          {item.operaio && (
                            <span className="flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <User size={10} />{item.operaio.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Azioni — sempre visibili */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleImportante(item.id, item.importante)}
                          title={item.importante ? 'Rimuovi da importanti' : 'Segna come importante'}
                          className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <Star size={15} className={item.importante ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'} />
                        </button>
                        <button
                          onClick={() => apraModifica(item)}
                          title="Modifica"
                          className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleElimina(item.id)}
                          title="Elimina"
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pannello dettaglio / creazione */}
        {pannello !== null && (
          <div className="w-80 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                {pannello === 'new'
                  ? <><Plus size={15} className="text-blue-600" /> Nuovo promemoria</>
                  : <><Edit2 size={15} className="text-blue-600" /> Modifica</>
                }
              </h3>
              <button onClick={() => setPannello(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalva} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Titolo *</label>
                <textarea
                  value={form.titolo}
                  onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
                  rows={2}
                  required
                  placeholder="Es. Sopralluogo Via Roma 15…"
                  className="w-full text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data e ora *</label>
                <input
                  type="datetime-local"
                  value={form.dataOra}
                  onChange={e => setForm(f => ({ ...f, dataOra: e.target.value }))}
                  required
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Luogo</label>
                <input
                  type="text"
                  value={form.luogo}
                  onChange={e => setForm(f => ({ ...f, luogo: e.target.value }))}
                  placeholder="Es. Via Roma 15, Roma"
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Assegna a operaio</label>
                <select
                  value={form.assegnatoAOperaioId}
                  onChange={e => setForm(f => ({ ...f, assegnatoAOperaioId: e.target.value }))}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                >
                  <option value="">— Solo per l'impresa —</option>
                  {operai.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Note</label>
                <textarea
                  value={form.descrizione}
                  onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
                  rows={3}
                  placeholder="Aggiungi dettagli o istruzioni…"
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-y"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setForm(f => ({ ...f, importante: !f.importante }))}
                  className={`w-10 h-5 rounded-full transition-colors ${form.importante ? 'bg-amber-400' : 'bg-slate-200'} relative`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.importante ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Star size={13} className={form.importante ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
                  Importante
                </span>
              </label>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={pending || !form.titolo.trim() || !form.dataOra}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
                >
                  {pending ? 'Salvataggio…' : pannello === 'new' ? 'Crea promemoria' : 'Salva modifiche'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
