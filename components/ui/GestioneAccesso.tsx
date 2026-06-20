'use client'

import { useState, useTransition } from 'react'
import { creaAccesso, reimpostaPassword } from '@/app/impresa/accessi/actions'

type Ruolo = 'operaio' | 'magazziniere' | 'cliente' | 'ufficio'

interface Props {
  email: string | null
  ruolo: Ruolo
  nome: string
  hasAccess: boolean
  revalidate?: string
}

type Messaggio = { tipo: 'ok' | 'errore'; testo: string }

export function GestioneAccesso({ email, ruolo, nome, hasAccess, revalidate }: Props) {
  const [localHasAccess, setLocalHasAccess] = useState(hasAccess)
  const [showReimposta, setShowReimposta] = useState(false)
  const [messaggio, setMessaggio] = useState<Messaggio | null>(null)
  const [isPending, startTransition] = useTransition()

  const ruoloLabel = ruolo === 'operaio' ? "l'operaio" : ruolo === 'magazziniere' ? 'il magazziniere' : ruolo === 'ufficio' ? 'il collaboratore ufficio' : 'il cliente'

  function handleCrea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const password = fd.get('password') as string
    setMessaggio(null)
    startTransition(async () => {
      try {
        await creaAccesso({ email: email!, password, ruolo, nome, revalidate })
        setLocalHasAccess(true)
        setMessaggio({ tipo: 'ok', testo: `Accesso creato. ${ruoloLabel.charAt(0).toUpperCase() + ruoloLabel.slice(1)} può ora entrare con email e password.` })
      } catch (err: unknown) {
        setMessaggio({ tipo: 'errore', testo: err instanceof Error ? err.message : 'Errore sconosciuto' })
      }
    })
  }

  function handleReimposta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nuovaPassword = fd.get('nuovaPassword') as string
    setMessaggio(null)
    startTransition(async () => {
      try {
        await reimpostaPassword({ email: email!, nuovaPassword, revalidate })
        setShowReimposta(false)
        setMessaggio({ tipo: 'ok', testo: 'Password reimpostata con successo.' })
      } catch (err: unknown) {
        setMessaggio({ tipo: 'errore', testo: err instanceof Error ? err.message : 'Errore sconosciuto' })
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Accesso all&apos;app</h2>

      {!email ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Aggiungi un&apos;email all&apos;anagrafica per poter creare l&apos;accesso.
        </p>
      ) : localHasAccess ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Accesso attivo
            </span>
            <span className="text-sm text-gray-500">{email}</span>
          </div>

          {!showReimposta ? (
            <button
              onClick={() => { setShowReimposta(true); setMessaggio(null) }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reimposta password
            </button>
          ) : (
            <form onSubmit={handleReimposta} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Nuova password</label>
                <input
                  type="password"
                  name="nuovaPassword"
                  minLength={8}
                  required
                  placeholder="Min. 8 caratteri"
                  className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? 'Salvataggio…' : 'Reimposta'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReimposta(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleCrea} className="space-y-4">
          <p className="text-sm text-gray-600">
            Crea le credenziali di accesso per <strong>{nome}</strong>{' '}
            <span className="text-gray-400">({email})</span>.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Password iniziale</label>
            <input
              type="password"
              name="password"
              minLength={8}
              required
              placeholder="Min. 8 caratteri"
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Comunica la password {ruoloLabel} a voce o via messaggio. Potrà cambiarla in seguito.
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? 'Creazione in corso…' : 'Crea accesso'}
          </button>
        </form>
      )}

      {messaggio && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            messaggio.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {messaggio.testo}
        </div>
      )}
    </div>
  )
}
