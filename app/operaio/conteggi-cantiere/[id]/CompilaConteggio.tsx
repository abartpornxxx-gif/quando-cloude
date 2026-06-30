'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, ToggleLeft, Lightbulb, Zap, FileText, Camera,
  ChevronDown, ChevronUp, Plus, Minus, Trash2, Send, Save, ArrowLeft,
} from 'lucide-react'
import { salvaConteggioOperaio, aggiungiFotoConteggio, eliminaFotoConteggio } from '../actions'
import { calcolaPlacche, CODICI_SUPPORTI_PLACCHE } from '@/lib/conteggio-cantiere-defaults'
import type { VocePredefinita, PresetQuadro } from '@/lib/conteggio-cantiere-defaults'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Riga = { id: string; categoria: string; codice?: string | null; descrizione: string; quantita: number; datiExtra?: unknown }
type Foto = { id: string; url: string; descrizione?: string | null }
type Conteggio = {
  id: string; stato: string; tipoLavorazione?: string | null; serieCivile?: string | null
  placcheMontate: boolean; placcheCalcolate: number; placcheManuali?: number | null
  noteImpresa?: string | null; noteOperaio?: string | null
  commessa: { nome: string; indirizzoCantiere?: string | null }
  righe: Riga[]
  foto: Foto[]
}
type CircuitoRow = { tempId: string; descrizione: string; tipo: string; amperaggio: string; curva: string; poli: string; tensione: string; quantita: number }

interface Props {
  conteggio: Conteggio
  vociPredefinite: VocePredefinita[]
  tipiLavorazione: string[]
  serieCivili: string[]
  presetQuadro: PresetQuadro[]
  amperaggiQuadro: string[]
  tipiInterruttore: { value: string; label: string }[]
  poliQuadro: string[]
  curveQuadro: string[]
  tensioniQuadro: string[]
}

function buildInitialQty(righe: Riga[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const r of righe) {
    if (r.categoria === 'STANDARD' && r.codice) {
      map[r.codice] = r.quantita
    }
  }
  return map
}

function buildInitialCircuiti(righe: Riga[]): CircuitoRow[] {
  return righe
    .filter(r => r.categoria === 'QUADRO')
    .map(r => {
      const d = (r.datiExtra ?? {}) as Record<string, string>
      return {
        tempId: r.id,
        descrizione: r.descrizione,
        tipo: d.tipo ?? 'magnetotermico',
        amperaggio: d.amperaggio ?? '16A',
        curva: d.curva ?? 'C',
        poli: d.poli ?? '1P+N',
        tensione: d.tensione ?? '220V',
        quantita: r.quantita,
      }
    })
}

const SEZIONI = ['SUPPORTI', 'FRUTTI', 'ILLUMINAZIONE', 'QUADRO', 'ALTRO'] as const
const ICONA: Record<string, React.ElementType> = {
  SUPPORTI: Box, FRUTTI: ToggleLeft, ILLUMINAZIONE: Lightbulb, QUADRO: Zap, ALTRO: FileText,
}
const TITOLO_SEZIONE: Record<string, string> = {
  SUPPORTI: 'Supporti & Scatole', FRUTTI: 'Frutti serie civile', ILLUMINAZIONE: 'Illuminazione',
  QUADRO: 'Quadro elettrico', ALTRO: 'Lavorazioni particolari',
}

export function CompilaConteggio({ conteggio, vociPredefinite, tipiLavorazione, serieCivili, presetQuadro, amperaggiQuadro, tipiInterruttore, poliQuadro, curveQuadro, tensioniQuadro }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const readonly = conteggio.stato === 'approvato' || conteggio.stato === 'inviato'

  const [qty, setQty] = useState<Record<string, number>>(buildInitialQty(conteggio.righe))
  const [circuiti, setCircuiti] = useState<CircuitoRow[]>(buildInitialCircuiti(conteggio.righe))
  const [tipoLav, setTipoLav] = useState(conteggio.tipoLavorazione ?? '')
  const [serieCiv, setSerieCiv] = useState(conteggio.serieCivile ?? '')
  const [noteOp, setNoteOp] = useState(conteggio.noteOperaio ?? '')
  const [placcheMontate, setPlaccheMontate] = useState(conteggio.placcheMontate)
  const [placcheManuali, setPlaccheManuali] = useState<number | null>(conteggio.placcheManuali ?? null)
  const [altroTesto, setAltroTesto] = useState(
    conteggio.righe.find(r => r.categoria === 'ALTRO')?.descrizione ?? ''
  )
  const [aperte, setAperte] = useState<Record<string, boolean>>({ SUPPORTI: true })
  const [foto, setFoto] = useState<Foto[]>(conteggio.foto)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoDescrizione, setFotoDescrizione] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const placcheCalcolate = calcolaPlacche(qty)
  const placcheFinali = placcheManuali ?? placcheCalcolate

  function toggleSezione(s: string) {
    setAperte(prev => ({ ...prev, [s]: !prev[s] }))
  }

  function incr(codice: string) {
    if (readonly) return
    setQty(prev => ({ ...prev, [codice]: (prev[codice] ?? 0) + 1 }))
  }

  function decr(codice: string) {
    if (readonly) return
    setQty(prev => ({ ...prev, [codice]: Math.max(0, (prev[codice] ?? 0) - 1) }))
  }

  function setManuale(codice: string, val: string) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0) setQty(prev => ({ ...prev, [codice]: n }))
    else if (val === '') setQty(prev => ({ ...prev, [codice]: 0 }))
  }

  function addCircuito(preset?: PresetQuadro) {
    const c: CircuitoRow = {
      tempId: `tmp_${Date.now()}`,
      descrizione: preset?.descrizione ?? '',
      tipo: preset?.tipo ?? 'magnetotermico',
      amperaggio: preset?.amperaggio ?? '16A',
      curva: preset?.curva ?? 'C',
      poli: preset?.poli ?? '1P+N',
      tensione: preset?.tensione ?? '220V',
      quantita: 1,
    }
    setCircuiti(prev => [...prev, c])
  }

  function removeCircuito(id: string) { setCircuiti(prev => prev.filter(c => c.tempId !== id)) }

  function updateCircuito(id: string, field: keyof CircuitoRow, val: string | number) {
    setCircuiti(prev => prev.map(c => c.tempId === id ? { ...c, [field]: val } : c))
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `conteggi-cantiere/${conteggio.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('conteggi-cantiere').upload(path, file, { upsert: false })
      if (upErr) { setError('Errore upload foto: ' + upErr.message); return }
      const { data: urlData } = supabase.storage.from('conteggi-cantiere').getPublicUrl(path)
      const url = urlData?.publicUrl ?? ''
      await aggiungiFotoConteggio(conteggio.id, url, path, fotoDescrizione)
      setFoto(prev => [...prev, { id: Date.now().toString(), url, descrizione: fotoDescrizione }])
      setFotoDescrizione('')
    } catch (err) {
      setError(String(err))
    } finally {
      setUploadingFoto(false)
      e.target.value = ''
    }
  }

  async function handleEliminaFoto(fotoId: string) {
    await eliminaFotoConteggio(fotoId, conteggio.id)
    setFoto(prev => prev.filter(f => f.id !== fotoId))
  }

  function buildPayload() {
    return {
      conteggioId: conteggio.id,
      tipoLavorazione: tipoLav,
      serieCivile: serieCiv,
      quantitaMap: qty,
      circuitiQuadro: circuiti.map(c => ({
        descrizione: c.descrizione,
        tipo: c.tipo,
        amperaggio: c.amperaggio,
        curva: c.curva,
        poli: c.poli,
        tensione: c.tensione,
        quantita: c.quantita,
      })),
      noteOperaio: noteOp,
      placcheMontate,
      placcheManuali: placcheMontate ? placcheManuali : null,
      altroTesto,
    }
  }

  function handleSalva() {
    if (readonly) return
    setError('')
    startTransition(async () => {
      try {
        await salvaConteggioOperaio(buildPayload(), false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (err) { setError(String(err)) }
    })
  }

  function handleInvia() {
    if (readonly) return
    if (!confirm('Inviare il conteggio all\'Impresa? Potrai ancora essere ricontattato.')) return
    setError('')
    startTransition(async () => {
      try {
        await salvaConteggioOperaio(buildPayload(), true)
        router.push('/operaio/conteggi-cantiere')
      } catch (err) { setError(String(err)) }
    })
  }

  const totPerSezione = (cat: string) => {
    if (cat === 'QUADRO') return circuiti.reduce((s, c) => s + c.quantita, 0)
    if (cat === 'ALTRO') return altroTesto.trim() ? 1 : 0
    return vociPredefinite.filter(v => v.categoria === cat).reduce((s, v) => s + (qty[v.codice] ?? 0), 0)
  }

  return (
    <div className="space-y-0 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/operaio/conteggi-cantiere" className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Conteggio cantiere</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{conteggio.commessa.nome}</h1>
          {conteggio.commessa.indirizzoCantiere && (
            <p className="text-xs text-gray-500">{conteggio.commessa.indirizzoCantiere}</p>
          )}
        </div>
        {readonly && (
          <span className="ml-auto text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
            {conteggio.stato === 'approvato' ? 'Approvato' : 'Inviato'}
          </span>
        )}
      </div>

      {/* Note impresa */}
      {conteggio.noteImpresa && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 mb-4">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Istruzioni impresa</p>
          <p className="text-sm text-blue-800">{conteggio.noteImpresa}</p>
        </div>
      )}

      {/* Tipo lavorazione & Serie civile */}
      {!readonly && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-4 mb-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Tipo lavorazione</label>
            <select value={tipoLav} onChange={e => setTipoLav(e.target.value)}
              className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none">
              <option value="">— Seleziona —</option>
              {tipiLavorazione.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Serie civile montata</label>
            <select value={serieCiv} onChange={e => setSerieCiv(e.target.value)}
              className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none">
              <option value="">— Seleziona —</option>
              {serieCivili.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {readonly && (tipoLav || serieCiv) && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 mb-4 flex gap-6">
          {tipoLav && <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Lavorazione</p><p className="text-sm font-semibold text-gray-800">{tipoLav}</p></div>}
          {serieCiv && <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Serie civile</p><p className="text-sm font-semibold text-gray-800">{serieCiv}</p></div>}
        </div>
      )}

      {/* Sezioni fisarmonica */}
      {SEZIONI.map(cat => {
        const aperta = aperte[cat] ?? false
        const Icon = ICONA[cat]
        const tot = totPerSezione(cat)
        const voci = vociPredefinite.filter(v => v.categoria === cat)

        return (
          <div key={cat} className="rounded-2xl border border-gray-200 bg-white shadow-sm mb-3 overflow-hidden">
            <button
              onClick={() => toggleSezione(cat)}
              className="w-full flex items-center gap-3 px-4 py-4 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 shrink-0">
                <Icon size={18} className="text-emerald-700" />
              </div>
              <span className="flex-1 text-sm font-bold text-gray-800">{TITOLO_SEZIONE[cat]}</span>
              {tot > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{tot}</span>
              )}
              {aperta ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {aperta && (
              <div className="border-t border-gray-100">
                {/* SEZIONI STANDARD (supporti, frutti, illuminazione) */}
                {cat !== 'QUADRO' && cat !== 'ALTRO' && (
                  <div className="divide-y divide-gray-50">
                    {voci.map(voce => {
                      const q = qty[voce.codice] ?? 0
                      return (
                        <div key={voce.codice} className="flex items-center gap-3 px-4 py-3">
                          <p className="flex-1 text-sm text-gray-700 leading-snug">{voce.descrizione}</p>
                          <span className="text-[10px] text-gray-400 mr-1">{voce.unita}</span>
                          {readonly ? (
                            <span className="text-base font-bold text-gray-900 w-8 text-right">{q}</span>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => decr(voce.codice)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors active:scale-95"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={q || ''}
                                onChange={e => setManuale(voce.codice, e.target.value)}
                                placeholder="0"
                                className="w-14 text-center text-base font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                              <button
                                onClick={() => incr(voce.codice)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors active:scale-95"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {/* Placche (solo nella sezione SUPPORTI) */}
                    {cat === 'SUPPORTI' && (
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Placche da montare</p>
                            <p className="text-xs text-slate-400">Auto-calcolo da supporti 503+504+506 = {placcheCalcolate}</p>
                          </div>
                          {!readonly && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div
                                onClick={() => { setPlaccheMontate(v => !v); if (!placcheMontate) setPlaccheManuali(null) }}
                                className={`w-10 h-5 rounded-full transition-colors relative ${placcheMontate ? 'bg-emerald-500' : 'bg-slate-200'}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${placcheMontate ? 'left-5' : 'left-0.5'}`} />
                              </div>
                              <span className="text-xs text-slate-600">Sì</span>
                            </label>
                          )}
                        </div>
                        {placcheMontate && (
                          <div className="mt-3">
                            <p className="text-xs font-bold text-slate-500 mb-1.5">
                              Placche calcolate: <span className="text-emerald-700">{placcheCalcolate}</span>
                              {placcheManuali != null && placcheManuali !== placcheCalcolate && (
                                <span className="text-orange-600 ml-2">→ correzione manuale: {placcheManuali}</span>
                              )}
                            </p>
                            {!readonly && (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-500 w-28">Correzione (opzionale):</p>
                                <input
                                  type="number"
                                  min={0}
                                  value={placcheManuali ?? ''}
                                  onChange={e => {
                                    const n = parseInt(e.target.value, 10)
                                    setPlaccheManuali(isNaN(n) ? null : n)
                                  }}
                                  placeholder={String(placcheCalcolate)}
                                  className="w-20 text-center text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-xl py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SEZIONE QUADRO */}
                {cat === 'QUADRO' && (
                  <div className="px-4 py-3 space-y-3">
                    {!readonly && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <p className="w-full text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Preset rapidi</p>
                        {presetQuadro.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => addCircuito(p)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors border border-indigo-100"
                          >
                            {p.descrizione}
                          </button>
                        ))}
                        <button
                          onClick={() => addCircuito()}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors flex items-center gap-1"
                        >
                          <Plus size={11} /> Circuito vuoto
                        </button>
                      </div>
                    )}

                    {circuiti.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Nessun circuito aggiunto.</p>
                    )}

                    {circuiti.map(c => (
                      <div key={c.tempId} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <input
                            value={c.descrizione}
                            onChange={e => updateCircuito(c.tempId, 'descrizione', e.target.value)}
                            disabled={readonly}
                            placeholder="Descrizione circuito"
                            className="flex-1 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:bg-gray-50"
                          />
                          {!readonly && (
                            <button onClick={() => removeCircuito(c.tempId)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Tipo</p>
                            <select value={c.tipo} onChange={e => updateCircuito(c.tempId, 'tipo', e.target.value)} disabled={readonly}
                              className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none disabled:bg-gray-50">
                              {tipiInterruttore.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Amperaggio</p>
                            <select value={c.amperaggio} onChange={e => updateCircuito(c.tempId, 'amperaggio', e.target.value)} disabled={readonly}
                              className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none disabled:bg-gray-50">
                              {amperaggiQuadro.map(a => <option key={a}>{a}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Poli</p>
                            <select value={c.poli} onChange={e => updateCircuito(c.tempId, 'poli', e.target.value)} disabled={readonly}
                              className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none disabled:bg-gray-50">
                              {poliQuadro.map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Curva</p>
                            <select value={c.curva} onChange={e => updateCircuito(c.tempId, 'curva', e.target.value)} disabled={readonly}
                              className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none disabled:bg-gray-50">
                              {curveQuadro.map(cv => <option key={cv}>{cv}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Quantità:</span>
                          {readonly ? (
                            <span className="text-base font-bold text-gray-900">{c.quantita}</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateCircuito(c.tempId, 'quantita', Math.max(1, c.quantita - 1))}
                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors">
                                <Minus size={12} />
                              </button>
                              <span className="text-base font-bold text-gray-900 w-6 text-center">{c.quantita}</span>
                              <button onClick={() => updateCircuito(c.tempId, 'quantita', c.quantita + 1)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SEZIONE ALTRO */}
                {cat === 'ALTRO' && (
                  <div className="px-4 py-3 space-y-3">
                    <textarea
                      value={altroTesto}
                      onChange={e => setAltroTesto(e.target.value)}
                      disabled={readonly}
                      rows={4}
                      placeholder="Descrivi eventuali lavorazioni speciali o particolari non presenti nelle altre sezioni…"
                      className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none disabled:bg-gray-50"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Note operaio */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-4 mt-3">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
          Note aggiuntive
        </label>
        <textarea
          value={noteOp}
          onChange={e => setNoteOp(e.target.value)}
          disabled={readonly}
          rows={3}
          placeholder="Aggiungi osservazioni, difficoltà riscontrate, materiale mancante…"
          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none disabled:bg-gray-50"
        />
      </div>

      {/* Foto */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-4 mt-3 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={11} /> Foto cantiere
        </p>

        {foto.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {foto.map(f => (
              <div key={f.id} className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={f.url} alt={f.descrizione ?? ''} className="w-full h-24 object-cover" />
                {f.descrizione && <p className="text-[10px] text-gray-500 px-1.5 py-1 truncate">{f.descrizione}</p>}
                {!readonly && (
                  <button
                    onClick={() => handleEliminaFoto(f.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readonly && (
          <div className="space-y-2">
            <input
              type="text"
              value={fotoDescrizione}
              onChange={e => setFotoDescrizione(e.target.value)}
              placeholder="Descrizione foto (opzionale)"
              className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-emerald-400 hover:text-emerald-600 transition-colors">
              <Camera size={16} />
              {uploadingFoto ? 'Caricamento…' : 'Scatta o scegli foto'}
              <input type="file" accept="image/*" capture="environment" onChange={handleUploadFoto} disabled={uploadingFoto} className="hidden" />
            </label>
            <p className="text-[10px] text-gray-400 text-center">
              Bucket Supabase richiesto: <code>conteggi-cantiere</code> (da creare in Supabase Storage)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mt-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Bottom bar fisso */}
      {!readonly && (
        <div className="fixed bottom-16 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 max-w-2xl mx-auto">
          <button
            onClick={handleSalva}
            disabled={pending}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saved ? 'Salvato ✓' : 'Salva bozza'}
          </button>
          <button
            onClick={handleInvia}
            disabled={pending}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send size={15} /> Invia all&apos;Impresa
          </button>
        </div>
      )}
    </div>
  )
}
