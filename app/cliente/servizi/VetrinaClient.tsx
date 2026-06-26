'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { formatEuro } from '@/lib/format'
import { inviaRichiesta } from './actions'

type Offerta = {
  id: string
  titolo: string
  categoria: string | null
  descrizione: string | null
  fotoUrl: string | null
  prezzoDa: number | null
}

type Commessa = {
  id: string
  nome: string
}

interface Props {
  offerte: Offerta[]
  commesse: Commessa[]
}

export default function VetrinaClient({ offerte, commesse }: Props) {
  const [aperta, setAperta] = useState<Offerta | null>(null)
  const [note, setNote] = useState('')
  const [commessaId, setCommessaId] = useState('')
  const [inviata, setInviata] = useState<Set<string>>(new Set())
  const [errore, setErrore] = useState('')
  const [pending, startTransition] = useTransition()

  function apriModal(o: Offerta) {
    setAperta(o)
    setNote('')
    setCommessaId('')
    setErrore('')
  }

  function chiudiModal() {
    setAperta(null)
  }

  function invia() {
    if (!aperta) return
    startTransition(async () => {
      try {
        await inviaRichiesta(aperta.id, commessaId || null, note)
        setInviata(prev => new Set([...prev, aperta.id]))
        chiudiModal()
      } catch {
        setErrore('Errore durante l\'invio. Riprova.')
      }
    })
  }

  if (offerte.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-200 bg-white p-12 text-center">
        <Image src="/immagini/icona-offerte.png" width={72} height={72} alt="" className="mx-auto mb-3 opacity-70" />
        <p className="text-gray-600 font-medium">Nessun servizio disponibile al momento</p>
        <p className="text-sm text-gray-400 mt-1">Torna presto, il catalogo viene aggiornato periodicamente</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {offerte.map(o => {
          const giaInviata = inviata.has(o.id)
          return (
            <div key={o.id} className="rounded-xl border border-gray-200 bg-white shadow-card overflow-hidden flex flex-col">
              {o.fotoUrl ? (
                <img src={o.fotoUrl} alt={o.titolo} className="h-48 w-full object-cover" />
              ) : (
                <div className="h-48 bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center">
                  <Image src="/immagini/icona-offerte.png" width={72} height={72} alt="" className="opacity-60" />
                </div>
              )}
              <div className="p-4 flex flex-col flex-1 space-y-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{o.titolo}</h3>
                  {o.categoria && (
                    <span className="text-xs text-violet-600 font-medium bg-violet-50 rounded-full px-2 py-0.5">{o.categoria}</span>
                  )}
                </div>
                {o.prezzoDa != null && (
                  <p className="text-sm font-bold text-violet-700">A partire da {formatEuro(o.prezzoDa)}</p>
                )}
                {o.descrizione && (
                  <p className="text-sm text-gray-600 flex-1">{o.descrizione}</p>
                )}
                <div className="pt-2">
                  {giaInviata ? (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 font-medium text-center">
                      âœ“ Richiesta inviata!
                    </div>
                  ) : (
                    <button
                      onClick={() => apriModal(o)}
                      className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
                    >
                      Mi interessa â†’
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal "Mi interessa" */}
      {aperta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={chiudiModal}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Mi interessa</h2>
              <p className="text-sm text-violet-700 font-medium">{aperta.titolo}</p>
            </div>

            {commesse.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collega a un tuo cantiere <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <select
                  value={commessaId}
                  onChange={e => setCommessaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="">â€” Nessun cantiere â€”</option>
                  {commesse.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note o domande <span className="text-gray-400 font-normal">(opzionale)</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="es. Vorrei sapere i tempi di installazioneâ€¦"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none"
              />
            </div>

            {errore && <p className="text-sm text-red-600">{errore}</p>}

            <div className="flex gap-3">
              <button
                onClick={invia}
                disabled={pending}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {pending ? 'Invioâ€¦' : 'Invia richiesta'}
              </button>
              <button
                onClick={chiudiModal}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Un nostro tecnico ti contatterà per un sopralluogo gratuito
            </p>
          </div>
        </div>
      )}
    </>
  )
}

