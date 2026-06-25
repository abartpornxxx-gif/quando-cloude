'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { importaFatturePassive, FatturaImportInput } from './actions'
import { formatEuro } from '@/lib/format'
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, PlusCircle, ArrowLeft, Loader2, Trash2, Sparkles } from 'lucide-react'
import ImportatoreAIVisual from './ImportatoreAIVisual'

type IdNome = { id: string; nome: string }

interface Props {
  fornitori: IdNome[]
  commesse: IdNome[]
}

type ParsedRow = {
  id: string // local random key
  data: string // YYYY-MM-DD
  numero: string
  fornitoreRaw: string
  fornitoreId: string // matched
  commessaRaw: string
  commessaId: string // matched
  importoEuroStr: string // raw input
  importo: number // parsed cents
  dataScadenza: string // YYYY-MM-DD
  stato: 'da_pagare' | 'pagata'
  controllata: boolean
  note: string
  error?: string
  excluded: boolean
}

export default function ImportatoreClient({ fornitori, commesse }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [dragActive, setDragActive] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: upload, 2: edit/conferma, 3: success
  const [mode, setMode] = useState<'csv' | 'ai'>('csv')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [saving, setSaving] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // CSV parsing logic
  function parseCSV(text: string): string[][] {
    const lines: string[][] = []
    let row: string[] = []
    let col = ''
    let inQuotes = false
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          col += '"'
          i++ // skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' || char === ';') {
        if (inQuotes) {
          col += char
        } else {
          row.push(col.trim())
          col = ''
        }
      } else if (char === '\r' || char === '\n') {
        if (inQuotes) {
          col += char
        } else {
          if (char === '\r' && nextChar === '\n') {
            i++
          }
          row.push(col.trim())
          lines.push(row)
          row = []
          col = ''
        }
      } else {
        col += char
      }
    }
    if (col || row.length > 0) {
      row.push(col.trim())
      lines.push(row)
    }
    return lines.filter(r => r.some(c => c !== ''))
  }

  function findBestMatch(name: string, items: IdNome[]): string {
    if (!name) return ''
    const cleaned = name.trim().toLowerCase()
    // 1. Exact match
    let matched = items.find(item => item.nome.toLowerCase() === cleaned)
    if (matched) return matched.id
    
    // 2. Substring match
    matched = items.find(item => item.nome.toLowerCase().includes(cleaned) || cleaned.includes(item.nome.toLowerCase()))
    if (matched) return matched.id
    
    return ''
  }

  function parseDateStr(dateStr: string): string {
    if (!dateStr) return ''
    // Try dd/mm/yyyy
    const parts = dateStr.trim().split('/')
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const y = parseInt(parts[2], 10)
      const dateObj = new Date(y, m, d)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0]
      }
    }
    
    // Try yyyy-mm-dd
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0]
    }
    return ''
  }

  function parseAmount(val: string): number {
    if (!val) return 0
    let cleaned = val.replace(/[€\s]/g, '')
    cleaned = cleaned.replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : Math.round(num * 100)
  }

  function handleFileText(text: string) {
    try {
      const lines = parseCSV(text)
      if (lines.length < 2) {
        setErrorMsg('Il file caricato non contiene righe di dati sufficienti.')
        return
      }

      // Auto-detect columns based on headers
      const headers = lines[0].map(h => h.toLowerCase().trim())
      
      const colIndices = {
        data: headers.findIndex(h => h.includes('data') || h.includes('date')),
        numero: headers.findIndex(h => h.includes('numero') || h.includes('num') || h.includes('doc') || h.includes('fattura')),
        fornitore: headers.findIndex(h => h.includes('fornitore') || h.includes('forn') || h.includes('supplier') || h.includes('vendor')),
        commessa: headers.findIndex(h => h.includes('commessa') || h.includes('cantiere') || h.includes('project') || h.includes('job')),
        importo: headers.findIndex(h => h.includes('importo') || h.includes('totale') || h.includes('amount') || h.includes('prezzo') || h.includes('costo')),
        scadenza: headers.findIndex(h => h.includes('scadenza') || h.includes('scad') || h.includes('due')),
        stato: headers.findIndex(h => h.includes('stato') || h.includes('status') || h.includes('pagata') || h.includes('pagato')),
        controllata: headers.findIndex(h => h.includes('controllata') || h.includes('ctrl') || h.includes('check')),
        note: headers.findIndex(h => h.includes('note') || h.includes('desc') || h.includes('lavoro'))
      }

      // Fallback indices if header names aren't matched (simple default order)
      if (colIndices.data === -1) colIndices.data = 0
      if (colIndices.fornitore === -1) colIndices.fornitore = 1
      if (colIndices.importo === -1) colIndices.importo = 2
      if (colIndices.numero === -1) colIndices.numero = 3

      const parsedRows: ParsedRow[] = []

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i]
        if (row.length === 0 || (row.length === 1 && !row[0])) continue

        const dataRaw = colIndices.data !== -1 ? row[colIndices.data] : ''
        const fornitoreRaw = colIndices.fornitore !== -1 ? row[colIndices.fornitore] : ''
        const commessaRaw = colIndices.commessa !== -1 ? row[colIndices.commessa] : ''
        const importoRaw = colIndices.importo !== -1 ? row[colIndices.importo] : ''
        const numeroRaw = colIndices.numero !== -1 ? row[colIndices.numero] : ''
        const scadenzaRaw = colIndices.scadenza !== -1 ? row[colIndices.scadenza] : ''
        const statoRaw = colIndices.stato !== -1 ? row[colIndices.stato] : ''
        const controllataRaw = colIndices.controllata !== -1 ? row[colIndices.controllata] : ''
        const noteRaw = colIndices.note !== -1 ? row[colIndices.note] : ''

        const data = parseDateStr(dataRaw)
        const fornitoreId = findBestMatch(fornitoreRaw, fornitori)
        const commessaId = findBestMatch(commessaRaw, commesse)
        const importo = parseAmount(importoRaw)
        const dataScadenza = parseDateStr(scadenzaRaw)
        
        let stato: 'da_pagare' | 'pagata' = 'da_pagare'
        if (statoRaw) {
          const s = statoRaw.toLowerCase().trim()
          if (s.includes('pagata') || s.includes('pagato') || s === 'pagata' || s === 'si' || s === 'sì' || s === 'true' || s === 'paid') {
            stato = 'pagata'
          }
        }

        let controllata = false
        if (controllataRaw) {
          const c = controllataRaw.toLowerCase().trim()
          if (c === 'si' || c === 'sì' || c === 'true' || c === 'x' || c === 'checked' || c === 'controllata') {
            controllata = true
          }
        }

        parsedRows.push({
          id: Math.random().toString(36).substring(2, 9),
          data: data || new Date().toISOString().split('T')[0],
          numero: numeroRaw || '',
          fornitoreRaw,
          fornitoreId,
          commessaRaw,
          commessaId,
          importoEuroStr: importoRaw ? importoRaw.replace(/[€\s]/g, '') : '0',
          importo,
          dataScadenza: dataScadenza || '',
          stato,
          controllata,
          note: noteRaw || '',
          excluded: false
        })
      }

      setRows(parsedRows)
      setErrorMsg(null)
      setStep(2)
    } catch (err) {
      console.error(err)
      setErrorMsg('Si è verificato un errore nel parsing del file CSV.')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      handleFileText(text)
    }
    reader.readAsText(file, 'UTF-8')
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
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        handleFileText(text)
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      setErrorMsg('Per favore, carica un file CSV valido.')
    }
  }

  const updateRow = (id: string, field: keyof ParsedRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }
      
      // If we update importoEuroStr, also update parsed importo (cents)
      if (field === 'importoEuroStr') {
        updated.importo = parseAmount(value)
      }
      return updated
    }))
  }

  async function handleSalva() {
    const activeRows = rows.filter(r => !r.excluded)
    if (activeRows.length === 0) {
      alert('Nessuna riga attiva da importare.')
      return
    }

    // Validation
    const invalidRow = activeRows.find(r => !r.data || r.importo <= 0)
    if (invalidRow) {
      alert('Per favore, correggi i dati. Tutte le fatture attive devono avere una Data valida e un Importo maggiore di zero.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const payload: FatturaImportInput[] = activeRows.map(r => ({
        data: r.data,
        numero: r.numero,
        fornitoreId: r.fornitoreId || undefined,
        commessaId: r.commessaId || undefined,
        importo: r.importo,
        dataScadenza: r.dataScadenza || undefined,
        stato: r.stato,
        controllata: r.controllata,
        note: r.note
      }))

      const result = await importaFatturePassive(payload)
      setSuccessCount(result.count)
      setStep(3)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Si è verificato un errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/ufficio/fatture-passive" className="hover:text-teal-700">Fatture passive</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Importa</span>
      </div>

      {/* Tabs */}
      {step === 1 && (
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setMode('csv')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              mode === 'csv'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-gray-550 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet size={14} />
            Importa CSV
          </button>
          <button
            type="button"
            onClick={() => setMode('ai')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              mode === 'ai'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                : 'text-gray-550 hover:text-gray-950'
            }`}
          >
            <Sparkles size={14} className={mode === 'ai' ? 'text-yellow-250' : 'text-teal-600'} />
            Analizza PDF con IA ✨
          </button>
        </div>
      )}

      {mode === 'csv' ? (
        <>
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  📥 Importa Fatture Passive
                </h1>
                <p className="text-sm text-gray-600">
                  Carica un file CSV per registrare massivamente le fatture passive dei fornitori associate ai cantieri.
                </p>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="shrink-0 text-red-500 mt-0.5" size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    dragActive ? 'border-teal-500 bg-teal-50/50' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="rounded-2xl bg-teal-50 p-4 text-teal-600">
                    <UploadCloud size={32} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Trascina qui il file CSV o clicca per sfogliare</p>
                    <p className="text-xs text-gray-400 mt-1">Supporta file .csv delimitati da virgola (,) o punto e virgola (;)</p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 space-y-3 text-sm">
                  <p className="font-bold text-gray-800">Mappatura automatica colonne supportate:</p>
                  <p className="text-xs text-gray-500">
                    L&#39;importatore riconosce automaticamente le colonne in base al nome dell&#39;intestazione (in prima riga):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs mt-2">
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Data</span> (obbligatoria)
                      <p className="text-gray-400 mt-0.5">es. 23/06/2026, 2026-06-23</p>
                    </div>
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Fornitore</span> (auto-match)
                      <p className="text-gray-400 mt-0.5">Nome fornitore da associare</p>
                    </div>
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Importo</span> (obbligatorio)
                      <p className="text-gray-400 mt-0.5">es. 1200.50, 450,00 €</p>
                    </div>
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Numero</span> (opzionale)
                      <p className="text-gray-400 mt-0.5">Numero della fattura</p>
                    </div>
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Commessa</span> (auto-match)
                      <p className="text-gray-400 mt-0.5">Nome cantiere/commessa</p>
                    </div>
                    <div className="bg-white border p-2.5 rounded-lg">
                      <span className="font-bold text-teal-700">Scadenza</span> (opzionale)
                      <p className="text-gray-400 mt-0.5">Data scadenza pagamento</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Anteprima ed editing dati</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verifica l&#39;associazione automatica con fornitori e cantieri, modifica gli importi se necessario ed escludi le righe che non vuoi salvare.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Indietro
                    </button>
                    <button
                      onClick={handleSalva}
                      disabled={saving}
                      className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 shadow-sm flex items-center gap-1.5"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Salvataggio...
                        </>
                      ) : (
                        'Conferma e Salva'
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="shrink-0 text-red-500 mt-0.5" size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-3 w-12 text-center">Incl.</th>
                        <th className="px-3 py-3 w-36">Data Fattura</th>
                        <th className="px-3 py-3 w-28">Numero</th>
                        <th className="px-3 py-3 w-60">Fornitore</th>
                        <th className="px-3 py-3 w-60">Commessa/Cantiere</th>
                        <th className="px-3 py-3 w-32">Importo (€)</th>
                        <th className="px-3 py-3 w-36">Scadenza</th>
                        <th className="px-3 py-3 w-20 text-center">Ctrl.</th>
                        <th className="px-3 py-3 w-60">Note</th>
                        <th className="px-3 py-3 w-12 text-center">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {rows.map(row => {
                        const fornitoreUnmatched = !row.fornitoreId
                        const commessaUnmatched = !row.commessaId && row.commessaRaw
                        
                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              row.excluded ? 'opacity-40 bg-gray-50/30' : ''
                            }`}
                          >
                            {/* Exclude */}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={!row.excluded}
                                onChange={(e) => updateRow(row.id, 'excluded', !e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                              />
                            </td>

                            {/* Data */}
                            <td className="px-3 py-2.5">
                              <input
                                type="date"
                                value={row.data}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'data', e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50"
                              />
                            </td>

                            {/* Numero */}
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={row.numero}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'numero', e.target.value)}
                                placeholder="es. 123"
                                className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50"
                              />
                            </td>

                            {/* Fornitore Match */}
                            <td className="px-3 py-2.5">
                              <div className="space-y-1">
                                <select
                                  value={row.fornitoreId}
                                  disabled={row.excluded}
                                  onChange={(e) => updateRow(row.id, 'fornitoreId', e.target.value)}
                                  className={`w-full text-xs border rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50 ${
                                    fornitoreUnmatched && !row.excluded
                                      ? 'border-yellow-300 bg-yellow-50 text-yellow-900'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  <option value="">-- Seleziona Fornitore --</option>
                                  {fornitori.map(f => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                  ))}
                                </select>
                                {fornitoreUnmatched && row.fornitoreRaw && !row.excluded && (
                                  <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                    <AlertTriangle size={10} />
                                    Letto: &quot;{row.fornitoreRaw}&quot; (non trovato)
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Commessa Match */}
                            <td className="px-3 py-2.5">
                              <div className="space-y-1">
                                <select
                                  value={row.commessaId}
                                  disabled={row.excluded}
                                  onChange={(e) => updateRow(row.id, 'commessaId', e.target.value)}
                                  className={`w-full text-xs border rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50 ${
                                    commessaUnmatched && !row.excluded
                                      ? 'border-yellow-300 bg-yellow-50 text-yellow-900'
                                      : 'border-gray-300 bg-white'
                                  }`}
                                >
                                  <option value="">-- Nessun cantiere --</option>
                                  {commesse.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                  ))}
                                </select>
                                {commessaUnmatched && row.commessaRaw && !row.excluded && (
                                  <p className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                    <AlertTriangle size={10} />
                                    Letto: &quot;{row.commessaRaw}&quot; (non trovato)
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Importo */}
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={row.importoEuroStr}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'importoEuroStr', e.target.value)}
                                className="w-full text-xs font-semibold text-right border border-gray-300 rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50"
                              />
                            </td>

                            {/* Scadenza */}
                            <td className="px-3 py-2.5">
                              <input
                                type="date"
                                value={row.dataScadenza}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'dataScadenza', e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50"
                              />
                            </td>

                            {/* Controllata */}
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={row.controllata}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'controllata', e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 disabled:opacity-50"
                              />
                            </td>

                            {/* Note */}
                            <td className="px-3 py-2.5">
                              <input
                                type="text"
                                value={row.note}
                                disabled={row.excluded}
                                onChange={(e) => updateRow(row.id, 'note', e.target.value)}
                                placeholder="es. Acconto materiali"
                                className="w-full text-xs border border-gray-300 rounded-lg p-1.5 focus:border-teal-500 focus:ring-teal-500 disabled:bg-gray-50"
                              />
                            </td>

                            {/* Stato */}
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                disabled={row.excluded}
                                onClick={() => updateRow(row.id, 'stato', row.stato === 'pagata' ? 'da_pagare' : 'pagata')}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                  row.stato === 'pagata'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-orange-100 text-orange-800 border border-orange-200'
                                } disabled:opacity-50`}
                              >
                                {row.stato === 'pagata' ? 'Pagata' : 'Debito'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <span className="text-xs text-gray-500 self-center">
                    Totale attive: {rows.filter(r => !r.excluded).length} di {rows.length} righe ·{' '}
                    {formatEuro(rows.filter(r => !r.excluded).reduce((s, r) => s + r.importo, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-md mx-auto text-center space-y-6 pt-10">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm flex flex-col items-center gap-4">
                <div className="rounded-full bg-green-50 p-4 text-green-600">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Importazione completata!</h1>
                  <p className="text-sm text-gray-600 mt-2">
                    Sono state importate con successo <span className="font-bold text-gray-900">{successCount}</span> fatture passive.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full pt-4">
                  <Link
                    href="/ufficio/fatture-passive"
                    className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 shadow-sm"
                  >
                    Vai alla lista delle fatture
                  </Link>
                  <button
                    onClick={() => {
                      setRows([])
                      setStep(1)
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Importa un altro file
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <ImportatoreAIVisual
          fornitori={fornitori}
          commesse={commesse}
          onBack={() => setMode('csv')}
        />
      )}
    </div>
  )
}
