'use client'

import { useState, useRef } from 'react'
import { analizzaFatturaPDFConIA, salvaFatturaPassivaSingola } from './actions'
import { UploadCloud, AlertTriangle, FileText, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

type IdNome = { id: string; nome: string }

interface Props {
  fornitori: IdNome[]
  commesse: IdNome[]
  onBack: () => void
}

export default function ImportatoreAIVisual({ fornitori, commesse, onBack }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form states (populated by AI)
  const [numero, setNumero] = useState('')
  const [data, setData] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [importoEuro, setImportoEuro] = useState('')
  const [fornitoreId, setFornitoreId] = useState('')
  const [commessaId, setCommessaId] = useState('')
  const [note, setNote] = useState('')
  const [stato, setStato] = useState<'da_pagare' | 'pagata'>('da_pagare')
  const [controllata, setControllata] = useState(false)

  const [saving, setSaving] = useState(false)

  // Convert file to base64
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const raw = reader.result as string
        // Remove the data url prefix (e.g. "data:application/pdf;base64,")
        const base64 = raw.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  function findFuzzyMatch(extractedName: string | null): string {
    if (!extractedName) return ''
    const cleaned = extractedName.trim().toLowerCase()
    
    // 1. Exact match
    let matched = fornitori.find(f => f.nome.toLowerCase() === cleaned)
    if (matched) return matched.id
    
    // 2. Substring match
    matched = fornitori.find(f => 
      f.nome.toLowerCase().includes(cleaned) || 
      cleaned.includes(f.nome.toLowerCase())
    )
    if (matched) return matched.id
    
    return ''
  }

  async function handleFile(file: File) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Per favore, carica un file PDF o un\'immagine (JPEG, PNG).')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccess(false)

    try {
      const base64 = await toBase64(file)
      const result = await analizzaFatturaPDFConIA(base64, file.type)

      // Prepopulate form states
      setNumero(result.numero || '')
      setData(result.data || '')
      setDataScadenza(result.dataScadenza || '')
      setImportoEuro(result.importo !== null ? result.importo.toString() : '')
      setNote(result.note || '')
      
      const matchedFornitoreId = findFuzzyMatch(result.fornitore)
      setFornitoreId(matchedFornitoreId)
      setCommessaId('') // User will select manually
      setStato('da_pagare')
      setControllata(false)

    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Si è verificato un errore durante l\'analisi del file.')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleSalva(e: React.FormEvent) {
    e.preventDefault()
    if (!data) { alert('Data obbligatoria'); return }
    const importoVal = parseFloat(importoEuro) || 0
    if (importoVal <= 0) { alert('L\'importo deve essere maggiore di zero'); return }

    setSaving(true)
    setErrorMsg(null)

    try {
      await salvaFatturaPassivaSingola({
        numero: numero || undefined,
        data,
        fornitoreId: fornitoreId || undefined,
        commessaId: commessaId || undefined,
        importo: Math.round(importoVal * 100), // convert to cents
        dataScadenza: dataScadenza || undefined,
        stato,
        controllata,
        note: note || undefined
      })
      setSuccess(true)
      // Reset form
      setNumero('')
      setData('')
      setDataScadenza('')
      setImportoEuro('')
      setFornitoreId('')
      setCommessaId('')
      setNote('')
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold uppercase tracking-wider transition-colors group"
      >
        <span className="transition-transform group-hover:translate-x-[-2px]">←</span> Indietro
      </button>

      {/* Hero Header */}
      <div className="rounded-2xl mesh-bg-ufficio border border-teal-850 p-6 shadow-premium-lg text-white">
        <p className="text-teal-200 text-xs font-semibold uppercase tracking-wider">Assistente Intelligenza Artificiale</p>
        <h1 className="text-2xl font-black tracking-tight mt-1">Lettore Fatture & Documenti</h1>
        <p className="text-teal-100/90 text-sm mt-1.5 font-medium">
          Trascina o seleziona un file PDF o un&apos;immagine (JPEG, PNG). L&apos;IA compilerà automaticamente i dettagli fiscali del fornitore.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="shrink-0 text-red-500 mt-0.5" size={16} />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-start gap-2.5 shadow-sm">
          <CheckCircle2 className="shrink-0 text-emerald-500 mt-0.5" size={16} />
          <span className="font-semibold">Fattura registrata con successo a sistema! Puoi caricarne un&apos;altra.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Upload column */}
        <div className="md:col-span-2 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all flex flex-col items-center justify-center gap-3 min-h-[260px] ${
              loading ? 'border-teal-300 bg-teal-55/20 cursor-not-allowed' :
              dragActive ? 'border-teal-500 bg-teal-50/50 cursor-pointer' :
              'border-gray-300 hover:border-teal-400 hover:bg-gray-50/50 cursor-pointer shadow-premium'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />

            {loading ? (
              <>
                <Loader2 className="animate-spin text-teal-600 h-10 w-10" />
                <div>
                  <p className="font-bold text-gray-700">Analisi con IA in corso...</p>
                  <p className="text-xs text-gray-450 mt-1 leading-normal">
                    Gemini sta leggendo i dati fiscali del PDF. Potrebbero volerci pochi secondi.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-teal-50 p-4 text-teal-600 border border-teal-100/50">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="font-bold text-gray-700">Carica PDF o Immagine</p>
                  <p className="text-xs text-gray-400 mt-1.5 leading-normal">
                    Trascina qui il file o clicca per sfogliare. supporta PDF, JPG, PNG.
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-xs text-gray-500 space-y-2.5 shadow-sm">
            <p className="font-bold text-gray-700">Come funziona:</p>
            <p>1. L&apos;IA Gemini legge il file ed estrae: Numero, Data, Scadenza, Importo e Fornitore.</p>
            <p>2. Il sistema cerca una corrispondenza esatta o parziale tra i fornitori memorizzati.</p>
            <p>3. Compila il modulo a destra dove puoi associare la commessa corretta ed eventualmente ritoccare i campi prima del salvataggio.</p>
          </div>
        </div>

        {/* Review form column */}
        <div className="md:col-span-3">
          <form onSubmit={handleSalva} className="rounded-2xl border border-slate-100 bg-white shadow-premium p-6 space-y-4">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight pb-3 border-b border-gray-100 flex items-center gap-2">
              <FileText size={18} className="text-teal-600" /> Dati Estratti dall&apos;IA
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Numero Fattura / Bolla</label>
                <input
                  type="text"
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                  placeholder="E.g. FATT-2026-10"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Importo Totale (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={importoEuro}
                  onChange={e => setImportoEuro(e.target.value)}
                  placeholder="0.00"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-semibold focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Data Documento *</label>
                <input
                  type="date"
                  value={data}
                  onChange={e => setData(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Data Scadenza Pagamento</label>
                <input
                  type="date"
                  value={dataScadenza}
                  onChange={e => setDataScadenza(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Fornitore Associtato</label>
              <select
                value={fornitoreId}
                onChange={e => setFornitoreId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">— Nessun fornitore associato (o inserisci manuale) —</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Associa a Commessa / Cantiere</label>
              <select
                value={commessaId}
                onChange={e => setCommessaId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">— Spesa generale (nessuna commessa) —</option>
                {commesse.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Note e Dettagli Materiali</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Riepilogo dei materiali estratti dall'IA..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={controllata}
                  onChange={e => setControllata(e.target.checked)}
                  className="h-5 w-5 rounded-lg border-gray-300"
                />
                Spunta per Riconciliazione
              </label>

              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="stato"
                    checked={stato === 'da_pagare'}
                    onChange={() => setStato('da_pagare')}
                  />
                  Da Pagare
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                  <input
                    type="radio"
                    name="stato"
                    checked={stato === 'pagata'}
                    onChange={() => setStato('pagata')}
                  />
                  Pagata
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || loading || !data || !importoEuro}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all hover-lift active-press disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {saving ? 'Registrazione in corso...' : '✅ Salva in Fatture Passive'}
            </button>
          </form>
        </div>

      </div>

    </div>
  )
}
