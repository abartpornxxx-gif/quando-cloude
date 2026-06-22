'use client'

import { useState, useEffect, useActionState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import {
  creaPropostaIntervento,
  confermaPropostaManualmente,
  annullaPropostaIntervento,
  creaCommessaDaProposta,
  type PropostaState,
} from './actions'

type StatoProposta =
  | 'Inviata'
  | 'VistaDalCliente'
  | 'Accettata'
  | 'RifiutataCliente'
  | 'ConfermataManuale'
  | 'CommessaCreata'
  | 'Annullata'

export interface PropostaProp {
  id: string
  stato: StatoProposta
  dataPropostaPrevista: string   // ISO — serializzato da Next.js Server → Client
  messaggioImpresa: string | null
  rispostaCliente: string | null
  confermataDaImpresa: boolean
  commessa: { id: string; nome: string } | null
  createdAt: string
}

interface Props {
  manutenzioneId: string
  clienteHaEmail: boolean
  messaggioDefault: string
  dataSuggerita: string          // YYYY-MM-DD per il date input
  proposte: PropostaProp[]
}

const STATO_LABEL: Record<StatoProposta, string> = {
  Inviata: 'Inviata',
  VistaDalCliente: 'Vista dal cliente',
  Accettata: 'Accettata dal cliente',
  RifiutataCliente: 'Rifiutata dal cliente',
  ConfermataManuale: 'Confermata manualmente',
  CommessaCreata: 'Commessa creata',
  Annullata: 'Annullata',
}

type BadgeVariant = 'info' | 'success' | 'danger' | 'warning' | 'neutral'

const STATO_BADGE: Record<StatoProposta, BadgeVariant> = {
  Inviata: 'info',
  VistaDalCliente: 'info',
  Accettata: 'success',
  RifiutataCliente: 'danger',
  ConfermataManuale: 'success',
  CommessaCreata: 'success',
  Annullata: 'neutral',
}

function formatDataIT(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ProposteSection({
  manutenzioneId,
  clienteHaEmail,
  messaggioDefault,
  dataSuggerita,
  proposte,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [state, formAction, isPending] = useActionState<PropostaState, FormData>(
    creaPropostaIntervento,
    {},
  )

  useEffect(() => {
    if (state.success) setShowForm(false)
  }, [state.success])

  const propostaAperta = proposte.find(
    p => p.stato === 'Inviata' || p.stato === 'VistaDalCliente',
  )

  return (
    <div className="space-y-4">
      {/* Header sezione */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Proposte di intervento
        </h2>
        {!propostaAperta && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            + Proponi intervento
          </button>
        )}
      </div>

      {/* Avviso cliente senza email/portale */}
      {!clienteHaEmail && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-0.5">Cliente senza accesso portale</p>
          <p>Puoi comunque creare la proposta e gestirla con conferma manuale.</p>
        </div>
      )}

      {/* Lista proposte esistenti */}
      {proposte.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {proposte.map(p => (
            <div key={p.id} className="p-4 space-y-2">
              {/* Riga principale: data + badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">
                  {formatDataIT(p.dataPropostaPrevista)}
                </span>
                <Badge variant={STATO_BADGE[p.stato]}>
                  {STATO_LABEL[p.stato]}
                </Badge>
              </div>

              {/* Messaggio impresa */}
              {p.messaggioImpresa && (
                <p className="text-sm text-gray-600 italic">
                  &ldquo;{p.messaggioImpresa}&rdquo;
                </p>
              )}

              {/* Risposta cliente */}
              {p.rispostaCliente && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Risposta cliente: </span>
                  {p.rispostaCliente}
                </p>
              )}

              {/* Link commessa collegata */}
              {p.commessa && (
                <p className="text-sm">
                  <span className="text-gray-500">Commessa: </span>
                  <Link
                    href={`/impresa/commesse/${p.commessa.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {p.commessa.nome}
                  </Link>
                </p>
              )}

              {/* Azioni: proposta aperta */}
              {(p.stato === 'Inviata' || p.stato === 'VistaDalCliente') && (
                <div className="flex gap-2 pt-1 flex-wrap">
                  <form action={confermaPropostaManualmente.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Segna confermata manualmente
                    </button>
                  </form>
                  <form action={annullaPropostaIntervento.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Annulla proposta
                    </button>
                  </form>
                </div>
              )}

              {/* Crea commessa: solo Accettata/ConfermataManuale senza commessa già aperta */}
              {(p.stato === 'Accettata' || p.stato === 'ConfermataManuale') && !p.commessa && (
                <form action={creaCommessaDaProposta.bind(null, p.id)} className="pt-1">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Crea commessa
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {proposte.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-6">
          Nessuna proposta inviata per questa manutenzione.
        </p>
      )}

      {/* Info: proposta già aperta */}
      {propostaAperta && !showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          Esiste già una proposta aperta. Annullala prima di crearne una nuova.
        </div>
      )}

      {/* Form crea nuova proposta */}
      {showForm && (
        <form
          action={formAction}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4"
        >
          <input type="hidden" name="manutenzioneId" value={manutenzioneId} />

          <h3 className="text-sm font-semibold text-gray-800">Nuova proposta di intervento</h3>

          {state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data prevista intervento *
            </label>
            <input
              type="date"
              name="dataPropostaPrevista"
              required
              defaultValue={dataSuggerita}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Messaggio al cliente{' '}
              <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <textarea
              name="messaggioImpresa"
              rows={3}
              defaultValue={messaggioDefault}
              placeholder="Es. Gentile Rossi, la contatto per organizzare il controllo annuale…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Invio…' : 'Invia proposta'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
