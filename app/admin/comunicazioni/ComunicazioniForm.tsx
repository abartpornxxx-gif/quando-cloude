'use client'
import { useState } from 'react'
import { inviaComunicazione } from './actions'

interface Props {
  conteggioPerRuolo: Record<string, number>
}

const OPZIONI_RUOLO: { value: string; label: string }[] = [
  { value: 'tutti', label: 'Tutti gli utenti' },
  { value: 'impresa', label: 'Solo Imprese' },
  { value: 'operaio', label: 'Solo Operai' },
  { value: 'cliente', label: 'Solo Clienti' },
  { value: 'magazziniere', label: 'Solo Magazzinieri' },
  { value: 'libero', label: 'Solo Liberi Professionisti' },
]

function calcolaDestinatari(
  ruoloTarget: string,
  conteggioPerRuolo: Record<string, number>,
): number {
  if (ruoloTarget === 'tutti') {
    return Object.values(conteggioPerRuolo).reduce((a, b) => a + b, 0)
  }
  return conteggioPerRuolo[ruoloTarget] ?? 0
}

export function ComunicazioniForm({ conteggioPerRuolo }: Props) {
  const [ruoloTarget, setRuoloTarget] = useState('tutti')
  const [oggetto, setOggetto] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [anteprimaAperta, setAnteprimaAperta] = useState(false)
  const [loading, setLoading] = useState(false)
  const [esito, setEsito] = useState<{ tipo: 'success' | 'error'; testo: string } | null>(null)

  const numDestinatari = calcolaDestinatari(ruoloTarget, conteggioPerRuolo)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!oggetto.trim() || !messaggio.trim()) return
    setLoading(true)
    setEsito(null)
    try {
      const result = await inviaComunicazione({ ruoloTarget, oggetto, messaggio })
      setEsito({
        tipo: 'success',
        testo: `Comunicazione inviata a ${result.inviati} utent${result.inviati === 1 ? 'e' : 'i'}.`,
      })
      setOggetto('')
      setMessaggio('')
    } catch {
      setEsito({ tipo: 'error', testo: 'Errore durante l\'invio. Riprova.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {esito && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            esito.tipo === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {esito.testo}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Destinatari */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Destinatari
            </label>
            <select
              value={ruoloTarget}
              onChange={(e) => setRuoloTarget(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors"
            >
              {OPZIONI_RUOLO.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              <span className="font-semibold text-purple-700">{numDestinatari}</span>{' '}
              utent{numDestinatari === 1 ? 'e' : 'i'} riceverann{numDestinatari === 1 ? 'à' : 'o'} questa email
            </p>
          </div>

          {/* Oggetto */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Oggetto email
            </label>
            <input
              type="text"
              required
              value={oggetto}
              onChange={(e) => setOggetto(e.target.value)}
              placeholder="Es. Aggiornamento piattaforma QUADRO"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Messaggio */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 block">
              Messaggio
            </label>
            <textarea
              required
              rows={6}
              value={messaggio}
              onChange={(e) => setMessaggio(e.target.value)}
              placeholder="Scrivi il contenuto dell'email..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors resize-none"
            />
          </div>

          {/* Pulsante */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setAnteprimaAperta((v) => !v)}
              className="rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {anteprimaAperta ? 'Nascondi anteprima' : 'Mostra anteprima'}
            </button>
            <button
              type="submit"
              disabled={loading || !oggetto.trim() || !messaggio.trim()}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Invio in corso…' : 'Invia comunicazione'}
            </button>
          </div>
        </form>
      </div>

      {/* Anteprima collassabile */}
      {anteprimaAperta && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Anteprima email
            </p>
          </div>
          <div className="p-6">
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
                  Oggetto
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {oggetto || <span className="text-gray-400 font-normal italic">Nessun oggetto inserito</span>}
                </p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">
                  Messaggio
                </p>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {messaggio || <span className="text-gray-400 italic">Nessun messaggio inserito</span>}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-400">
                  Inviato da: QUADRO Piattaforma &mdash; nessuna risposta a questa email
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
