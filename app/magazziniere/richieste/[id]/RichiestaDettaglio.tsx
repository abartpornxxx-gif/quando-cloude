'use client'

import { useState, useRef, useTransition } from 'react'
import { aggiornaStatoRichiesta, uploadFotoConsegna } from '../actions'
import { useRouter } from 'next/navigation'

type Richiesta = {
  id: string
  descrizione: string
  urgente: boolean
  stato: string
  fotoUrl: string | null
  note: string | null
  createdAt: Date | string
  operaio: { nome: string }
  commessa: { nome: string; indirizzoCantiere: string | null }
}

export default function RichiestaDettaglio({ richiesta }: { richiesta: Richiesta }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function aggiornaStato(stato: 'in_preparazione' | 'consegnata') {
    startTransition(async () => {
      try {
        await aggiornaStatoRichiesta(richiesta.id, stato)
        router.refresh()
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      await uploadFotoConsegna(richiesta.id, fd)
      router.refresh()
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const statoLabel: Record<string, string> = {
    richiesta: 'Aperta',
    in_preparazione: 'In preparazione',
    consegnata: 'Consegnata',
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border p-4 space-y-2">
        {richiesta.urgente && (
          <p className="text-red-600 font-bold text-sm">🚨 URGENTE</p>
        )}
        <p className="font-semibold text-lg">{richiesta.descrizione}</p>
        <p className="text-sm text-gray-500">Operaio: {richiesta.operaio.nome}</p>
        <p className="text-sm text-gray-500">Cantiere: {richiesta.commessa.nome}</p>
        {richiesta.commessa.indirizzoCantiere && (
          <p className="text-sm text-gray-500">📍 {richiesta.commessa.indirizzoCantiere}</p>
        )}
        <p className="text-sm text-gray-400">{new Date(richiesta.createdAt).toLocaleString('it-IT')}</p>
        <p className="text-sm">
          Stato: <strong>{statoLabel[richiesta.stato] ?? richiesta.stato}</strong>
        </p>
        {richiesta.note && <p className="text-sm text-gray-600">Note: {richiesta.note}</p>}
      </div>

      {richiesta.fotoUrl && (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm font-semibold mb-2">Foto consegna</p>
          <img src={richiesta.fotoUrl} alt="foto consegna" className="rounded-xl max-w-full" />
        </div>
      )}

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      {richiesta.stato === 'richiesta' && (
        <button
          onClick={() => aggiornaStato('in_preparazione')}
          disabled={pending}
          className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          📦 Prendo in carico
        </button>
      )}

      {richiesta.stato === 'in_preparazione' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Scatta una foto del materiale prima di consegnarlo:</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoto}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-50 file:text-yellow-700"
          />
          {uploading && <p className="text-xs text-gray-400">Upload in corso…</p>}
          <button
            onClick={() => aggiornaStato('consegnata')}
            disabled={pending || uploading}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
          >
            ✅ Segna come consegnata
          </button>
        </div>
      )}

      {richiesta.stato === 'consegnata' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold">✅ Materiale consegnato</p>
        </div>
      )}
    </div>
  )
}
