'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Cliente { id: string; nome: string }

interface DefaultValues {
  id?: string
  clienteId?: string
  titolo?: string
  tipoImpianto?: string
  tipoImpiantoAltro?: string
  intervalloValore?: number
  intervalloUnita?: string
  dataUltimoIntervento?: string
  dataProssimoIntervento?: string
  note?: string
  attiva?: boolean
}

interface Props {
  action: (fd: FormData) => Promise<void>
  clienti: Cliente[]
  defaultValues?: DefaultValues
}

const TIPI_IMPIANTO = [
  { value: 'Elettrico',   label: 'Elettrico' },
  { value: 'Allarme',     label: 'Allarme' },
  { value: 'Automazioni', label: 'Automazioni' },
  { value: 'Altro',       label: 'Altro (specifica)' },
]

export function ManutenzioneForm({ action, clienti, defaultValues }: Props) {
  const [tipoImpianto, setTipoImpianto] = useState(defaultValues?.tipoImpianto ?? 'Elettrico')
  const [attiva, setAttiva] = useState(defaultValues?.attiva ?? true)

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="attiva" value={attiva ? 'true' : 'false'} />

      {/* Cliente */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Dati principali</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
          <select
            name="clienteId"
            required
            defaultValue={defaultValues?.clienteId ?? ''}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">— Seleziona cliente —</option>
            {clienti.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titolo / descrizione *</label>
          <input
            name="titolo"
            required
            defaultValue={defaultValues?.titolo}
            placeholder="Es. Controllo impianto elettrico annuale"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo impianto *</label>
          <select
            name="tipoImpianto"
            required
            value={tipoImpianto}
            onChange={e => setTipoImpianto(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {TIPI_IMPIANTO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {tipoImpianto === 'Altro' && (
            <input
              name="tipoImpiantoAltro"
              defaultValue={defaultValues?.tipoImpiantoAltro}
              placeholder="Specifica il tipo di impianto"
              required
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Ricorrenza */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Ricorrenza</h2>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ogni *</label>
            <input
              type="number"
              name="intervalloValore"
              required
              min={1}
              defaultValue={defaultValues?.intervalloValore ?? 6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unità *</label>
            <select
              name="intervalloUnita"
              required
              defaultValue={defaultValues?.intervalloUnita ?? 'Mesi'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="Mesi">Mesi</option>
              <option value="Giorni">Giorni</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Es. "6 Mesi" = controllo ogni 6 mesi, "90 Giorni" = ogni 90 giorni.
        </p>
      </div>

      {/* Date */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Date</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ultimo intervento <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <input
              type="date"
              name="dataUltimoIntervento"
              defaultValue={defaultValues?.dataUltimoIntervento}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prossimo intervento *
            </label>
            <input
              type="date"
              name="dataProssimoIntervento"
              required
              defaultValue={defaultValues?.dataProssimoIntervento}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Note + stato */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Note e stato</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            name="note"
            rows={3}
            defaultValue={defaultValues?.note}
            placeholder="Note interne sulla manutenzione…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={attiva}
            onClick={() => setAttiva(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              attiva ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                attiva ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {attiva ? 'Manutenzione attiva' : 'Manutenzione sospesa'}
          </span>
        </label>
      </div>

      {/* Azioni */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          Salva
        </button>
        <Link
          href="/impresa/manutenzioni"
          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </Link>
      </div>
    </form>
  )
}
