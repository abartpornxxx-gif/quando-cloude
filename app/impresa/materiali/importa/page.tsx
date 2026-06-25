'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { importaCSV } from '../actions'

type RigaCSV = { codice: string; descrizione: string; prezzo: string; unita: string }

export default function ImportaCSVPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [righe, setRighe] = useState<RigaCSV[]>([])
  const [errori, setErrori] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function parseCSV(text: string) {
    const lines = text.trim().split('\n')
    const result: RigaCSV[] = []
    const errs: string[] = []

    // Salta l'intestazione se presente (contiene "descrizione" o "codice")
    const start = lines[0].toLowerCase().includes('descrizione') ? 1 : 0

    for (let i = start; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 2 || !cols[1]) {
        errs.push(`Riga ${i + 1}: descrizione mancante`)
        continue
      }
      result.push({
        codice: cols[0] ?? '',
        descrizione: cols[1],
        prezzo: cols[2] ?? '0',
        unita: cols[3] ?? 'pz',
      })
    }

    setRighe(result)
    setErrori(errs)
  }

  async function handleImport() {
    if (righe.length === 0) return
    setLoading(true)
    await importaCSV(righe)
    router.push('/impresa/materiali')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/materiali" className="text-sm text-gray-500 hover:text-gray-700">← Materiali</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Import da CSV</h1>
      </div>

      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Formato atteso (separatore: virgola):</p>
        <pre className="mt-2 rounded bg-blue-100 p-2 font-mono text-xs">
          codice,descrizione,prezzo,unita{'\n'}
          MAT001,Cavo elettrico 2.5mm,2.50,mt{'\n'}
          MAT002,Interruttore bipolare,15.00,pz
        </pre>
        <p className="mt-2 text-xs text-blue-600">La prima riga di intestazione è ignorata automaticamente.</p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">Seleziona file CSV</label>
        <input ref={fileRef} type="file" accept=".csv,text/csv"
          onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = ev => parseCSV(ev.target?.result as string)
            reader.readAsText(file, 'utf-8')
          }}
          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {errori.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Errori trovati:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-red-600">
            {errori.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {righe.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">{righe.length} articoli pronti per l'importazione</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Codice</th>
                  <th className="px-4 py-2 text-left">Descrizione</th>
                  <th className="px-4 py-2 text-right">Prezzo</th>
                  <th className="px-4 py-2 text-left">U.M.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {righe.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.codice || '—'}</td>
                    <td className="px-4 py-2 text-gray-900">{r.descrizione}</td>
                    <td className="px-4 py-2 text-right text-gray-700">€ {r.prezzo}</td>
                    <td className="px-4 py-2 text-gray-500">{r.unita}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleImport} disabled={righe.length === 0 || loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Importazione in corso…' : `Importa ${righe.length} articoli`}
        </button>
        <Link href="/impresa/materiali" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </div>
  )
}
