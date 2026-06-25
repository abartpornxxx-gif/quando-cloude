'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { aggiornaStatoRichiesta, uploadFotoConsegna } from '../actions'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'

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

  const statoVariant: Record<string, 'danger' | 'warning' | 'success'> = {
    richiesta: 'danger',
    in_preparazione: 'warning',
    consegnata: 'success',
  }
  const statoLabel: Record<string, string> = {
    richiesta: 'Aperta',
    in_preparazione: 'In preparazione',
    consegnata: 'Consegnata',
  }

  return (
    <div className="space-y-4 py-6">
      {/* Back link */}
      <Link
        href="/magazziniere/richieste"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-semibold uppercase tracking-wider transition-all group"
      >
        <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span> Tutte le richieste
      </Link>

      {/* Card principale */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-premium p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {richiesta.urgente && (
              <div className="flex items-center gap-1.5 mb-2">
                <Image src="/immagini/icona-urgente.png" width={14} height={14} alt="" className="shrink-0" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Urgente</span>
              </div>
            )}
            <h1 className="text-lg font-bold text-gray-900">{richiesta.descrizione}</h1>
          </div>
          <Badge variant={statoVariant[richiesta.stato] ?? 'neutral'}>
            {statoLabel[richiesta.stato] ?? richiesta.stato}
          </Badge>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-700">Operaio:</span> {richiesta.operaio.nome}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-700">Cantiere:</span> {richiesta.commessa.nome}
          </p>
          {richiesta.commessa.indirizzoCantiere && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Image src="/immagini/icona-posizione.png" width={13} height={13} alt="" className="shrink-0 opacity-60" />
              {richiesta.commessa.indirizzoCantiere}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {new Date(richiesta.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {richiesta.note && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
              <span className="font-semibold">Note:</span> {richiesta.note}
            </p>
          )}
        </div>
      </div>

      {/* Collegamento al listino materiali */}
      {richiesta.stato !== 'consegnata' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-premium p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Collega al listino materiali</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Seleziona il materiale per aggiornare automaticamente la giacenza alla consegna.
            </p>
          </div>
          <select
            value={materialeId}
            onChange={e => setMaterialeId(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">— Nessun collegamento (materiale non in listino) —</option>
            {materiali.map(m => (
              <option key={m.id} value={m.id}>
                {m.codice ? `[${m.codice}] ` : ''}{m.descrizione}
              </option>
            ))}
          </select>
          {materialeId && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ La consegna creerà uno scarico automatico per questo materiale.
            </p>
          )}
        </div>
      )}

      {/* Materiale collegato (stato consegnata) */}
      {richiesta.materiale && richiesta.stato === 'consegnata' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            <span className="font-semibold">Materiale collegato:</span> {richiesta.materiale.descrizione}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">Giacenza aggiornata automaticamente</p>
        </div>
      )}

      {/* Foto consegna */}
      {richiesta.fotoUrl && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-premium p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Foto consegna</p>
          <img src={richiesta.fotoUrl} alt="foto consegna" className="rounded-xl w-full object-cover" />
        </div>
      )}

      {/* Errore */}
      {errore && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700 font-medium">{errore}</p>
        </div>
      )}

      {/* Azioni stato */}
      {richiesta.stato === 'richiesta' && (
        <button
          onClick={() => aggiornaStato('in_preparazione')}
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
        >
          <Image src="/immagini/icona-materiale.png" width={16} height={16} alt="" className="brightness-0 invert shrink-0" />
          Prendo in carico
        </button>
      )}

      {richiesta.stato === 'in_preparazione' && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Scatta una foto del materiale prima di consegnarlo:</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoto}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-amber-50 file:text-amber-700 file:font-semibold file:cursor-pointer"
          />
          {uploading && <p className="text-xs text-gray-400">Upload in corso…</p>}
          <button
            onClick={() => aggiornaStato('consegnata')}
            disabled={pending || uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
          >
            ✓ Segna come consegnata
          </button>
        </div>
      )}

      {richiesta.stato === 'consegnata' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-emerald-700 font-bold text-base">✓ Materiale consegnato</p>
        </div>
      )}

      {/* Chat operaio */}
      <Link
        href={`/magazziniere/chat/${richiesta.giornataId}`}
        className="flex items-center justify-center gap-2 w-full rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-semibold py-3 hover:bg-amber-100 transition-colors"
      >
        <Image src="/immagini/icona-chat.png" width={16} height={16} alt="" className="opacity-80" />
        Apri chat con l&apos;operaio
      </Link>
    </div>
  )
}
