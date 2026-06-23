'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { aggiornaStatoRichiesta, uploadFotoConsegna } from '../actions'
import { useRouter } from 'next/navigation'

type Richiesta = {
  id: string
  giornataId: string
  descrizione: string
  urgente: boolean
  stato: string
  fotoUrl: string | null
  note: string | null
  createdAt: Date | string
  operaio: { nome: string }
  commessa: { nome: string; indirizzoCantiere: string | null }
  materiale: { id: string; descrizione: string } | null
}

type Materiale = { id: string; codice: string | null; descrizione: string }

export default function RichiestaDettaglio({
  richiesta,
  materiali,
}: {
  richiesta: Richiesta
  materiali: Materiale[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [errore, setErrore] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [materialeId, setMaterialeId] = useState(richiesta.materiale?.id ?? '')

  function aggiornaStato(stato: 'in_preparazione' | 'consegnata') {
    startTransition(async () => {
      try {
        await aggiornaStatoRichiesta(richiesta.id, stato, materialeId || undefined)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
        return
      }
      // router.refresh() fuori dal try-catch: errori di re-render gestiti da React, non da setErrore
      router.refresh()
    })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    let uploadOk = false
    try {
      const fd = new FormData()
      fd.append('foto', file)
      if (materialeId && !richiesta.materiale) {
        await aggiornaStatoRichiesta(richiesta.id, 'in_preparazione', materialeId)
      }
      await uploadFotoConsegna(richiesta.id, fd)
      uploadOk = true
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    if (uploadOk) router.refresh()
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
          <p className="text-red-600 font-bold text-sm flex items-center gap-1.5">
            <Image src="/immagini/icona-urgente.png" width={14} height={14} alt="" className="shrink-0" />
            URGENTE
          </p>
        )}
        <p className="font-semibold text-lg">{richiesta.descrizione}</p>
        <p className="text-sm text-gray-500">Operaio: {richiesta.operaio.nome}</p>
        <p className="text-sm text-gray-500">Cantiere: {richiesta.commessa.nome}</p>
        {richiesta.commessa.indirizzoCantiere && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Image src="/immagini/icona-posizione.png" width={13} height={13} alt="" className="shrink-0 opacity-60" />
            {richiesta.commessa.indirizzoCantiere}
          </p>
        )}
        <p className="text-sm text-gray-400">{new Date(richiesta.createdAt).toLocaleString('it-IT')}</p>
        <p className="text-sm">
          Stato: <strong>{statoLabel[richiesta.stato] ?? richiesta.stato}</strong>
        </p>
        {richiesta.note && <p className="text-sm text-gray-600">Note: {richiesta.note}</p>}
      </div>

      {/* Collegamento al listino materiali (tracciamento magazzino) */}
      {richiesta.stato !== 'consegnata' && (
        <div className="bg-white rounded-xl border p-4 space-y-2">
          <p className="text-sm font-semibold">Collega al listino materiali</p>
          <p className="text-xs text-gray-500">
            Seleziona il materiale dal listino per aggiornare automaticamente la giacenza del magazzino.
          </p>
          <select
            value={materialeId}
            onChange={e => setMaterialeId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Nessun collegamento (materiale non in listino) —</option>
            {materiali.map(m => (
              <option key={m.id} value={m.id}>
                {m.codice ? `[${m.codice}] ` : ''}{m.descrizione}
              </option>
            ))}
          </select>
          {materialeId && (
            <p className="text-xs text-green-600">
              La consegna creerà uno scarico in magazzino per questo materiale.
            </p>
          )}
        </div>
      )}

      {richiesta.materiale && richiesta.stato === 'consegnata' && (
        <div className="bg-gray-50 rounded-xl border p-3 text-sm">
          <p className="text-gray-600">Materiale collegato: <strong>{richiesta.materiale.descrizione}</strong></p>
        </div>
      )}

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
          <Image src="/immagini/icona-materiale.png" width={16} height={16} alt="" className="brightness-0 invert shrink-0" />
          Prendo in carico
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
          {richiesta.materiale && (
            <p className="text-green-600 text-sm mt-1">Giacenza aggiornata automaticamente</p>
          )}
        </div>
      )}

      {/* Link alla chat della giornata */}
      <a
        href={`/magazziniere/chat/${richiesta.giornataId}`}
        className="flex items-center justify-center gap-2 w-full border border-yellow-300 bg-yellow-50 text-yellow-800 font-semibold py-3 rounded-xl hover:bg-yellow-100"
      >
        <Image src="/immagini/icona-chat.png" width={16} height={16} alt="" className="opacity-80" />
        Apri chat con l&apos;operaio
      </a>
    </div>
  )
}
