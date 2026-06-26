'use client'
import Link from 'next/link';

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { salvaOfferta } from './actions'

const CATEGORIE = [
  'Domotica', 'Videosorveglianza', 'Antifurto', 'Wallbox / Ricarica EV',
  'Fotovoltaico', 'Videocitofonia', 'Messa a norma', 'Illuminazione LED',
  'Impianto antenna', 'Altro',
]

type OffertaData = {
  id: string
  titolo: string
  categoria: string | null
  descrizione: string | null
  fotoUrl: string | null
  fotoPath: string | null
  prezzoDa: number | null
  attiva: boolean
  ordine: number
}

export default function CatalogoForm({ offerta }: { offerta?: OffertaData }) {
  const [fotoUrl, setFotoUrl] = useState(offerta?.fotoUrl ?? '')
  const [fotoPath, setFotoPath] = useState(offerta?.fotoPath ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `catalogo/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('foto-catalogo').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('foto-catalogo').getPublicUrl(path)
      setFotoUrl(publicUrl)
      setFotoPath(path)
    } catch {
      setUploadError('Errore upload. Verifica dimensione (max 5 MB) e formato (JPG/PNG/WebP).')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('fotoUrl', fotoUrl)
    formData.set('fotoPath', fotoPath)
    startTransition(async () => {
      await salvaOfferta(offerta?.id ?? null, formData)
    })
  }

  const prezzoInput = offerta?.prezzoDa != null ? (offerta.prezzoDa / 100).toFixed(2) : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Titolo *</label>
          <input
            name="titolo"
            required
            defaultValue={offerta?.titolo}
            placeholder="es. Impianto videosorveglianza"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <input
            name="categoria"
            list="categorie-list"
            defaultValue={offerta?.categoria ?? ''}
            placeholder="Seleziona o scrivi…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <datalist id="categorie-list">
            {CATEGORIE.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Prezzo "a partire da" (€)</label>
          <input
            name="prezzoDa"
            type="number"
            step="0.01"
            min="0"
            defaultValue={prezzoInput}
            placeholder="es. 500.00"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descrizione</label>
          <textarea
            name="descrizione"
            rows={4}
            defaultValue={offerta?.descrizione ?? ''}
            placeholder="Descrivi l'offerta, cosa include, i vantaggi…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Foto */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Foto offerta</label>
          <div className="mt-1 flex items-start gap-4">
            {fotoUrl && (
              <img src={fotoUrl} alt="preview" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && <p className="mt-1 text-xs text-blue-600">Caricamento in corso…</p>}
              {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
              <p className="mt-1 text-xs text-gray-400">JPG, PNG o WebP · max 5 MB</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Ordine di visualizzazione</label>
          <input
            name="ordine"
            type="number"
            min="0"
            defaultValue={offerta?.ordine ?? 0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-5">
          <input
            type="hidden"
            name="attiva"
            value="false"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="attiva"
              value="true"
              defaultChecked={offerta?.attiva ?? true}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Visibile ai clienti</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Salvataggio…' : offerta ? 'Aggiorna offerta' : 'Crea offerta'}
        </button>
        <Link href="/impresa/catalogo" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}
