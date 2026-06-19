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
  } & Partial<Importi>
}

export function CommessaForm({ action, clienti, tipiLavoro = [], defaultValues }: Props) {
  const [importi, setImporti] = useState<Importi>({
    preventivato: defaultValues?.preventivato ?? 0,
    costiMateriali: defaultValues?.costiMateriali ?? 0,
    costiManodopera: defaultValues?.costiManodopera ?? 0,
    costiMezzi: defaultValues?.costiMezzi ?? 0,
    fatturato: defaultValues?.fatturato ?? 0,
  })

  const margine = calcolaMargine(importi)
  const avanzamento = percentualeAvanzamento(importi)

  function handleImporto(field: keyof Importi, value: string) {
    setImporti(prev => ({ ...prev, [field]: euroToCents(value) }))
  }

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
              <option value="chiusa">Chiusa</option>
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <textarea name="note" rows={2} defaultValue={defaultValues?.note}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
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
