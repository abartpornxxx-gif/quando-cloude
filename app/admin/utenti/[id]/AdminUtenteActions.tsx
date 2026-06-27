'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  sospendiAccount,
  riabilitaAccount,
  reimpostaPasswordAdmin,
  cambiaRuolo,
  eliminaAccount,
} from '@/app/admin/actions'
import { ShieldOff, ShieldCheck, KeyRound, UserCog, Trash2 } from 'lucide-react'

interface Props {
  userId: string
  isBanned: boolean
  email: string
  nome: string
  ruolo: string
}

const inputClass =
  'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors'

export function AdminUtenteActions({ userId, isBanned, email, nome, ruolo }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [selectedRuolo, setSelectedRuolo] = useState(ruolo)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSospendi() {
    if (!confirm(`Sospendere l'account di ${nome || email}? L'utente non potrà più accedere.`)) return
    setLoading('sospendi')
    setMsg(null)
    try {
      await sospendiAccount(userId)
      setMsg({ type: 'ok', text: 'Account sospeso.' })
      router.refresh()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleRiabilita() {
    setLoading('riabilita')
    setMsg(null)
    try {
      await riabilitaAccount(userId)
      setMsg({ type: 'ok', text: 'Account riabilitato.' })
      router.refresh()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleResetPwd(e: React.FormEvent) {
    e.preventDefault()
    if (nuovaPassword.length < 8) {
      setMsg({ type: 'err', text: 'La password deve avere almeno 8 caratteri.' })
      return
    }
    setLoading('pwd')
    setMsg(null)
    try {
      await reimpostaPasswordAdmin({ userId, nuovaPassword })
      setMsg({ type: 'ok', text: 'Password reimpostata con successo.' })
      setNuovaPassword('')
      setShowPwdForm(false)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleCambiaRuolo() {
    setLoading('ruolo')
    setMsg(null)
    try {
      await cambiaRuolo({ userId, ruolo: selectedRuolo })
      setMsg({ type: 'ok', text: 'Ruolo aggiornato con successo.' })
      router.refresh()
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(null)
    }
  }

  async function handleElimina() {
    if (!confirm(`Eliminare definitivamente l'account di ${nome || email}? Questa azione è irreversibile.`)) return
    setLoading('elimina')
    setMsg(null)
    try {
      await eliminaAccount(userId)
      router.push('/admin/utenti')
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Azioni account */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Azioni account</h2>

        {msg && (
          <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {isBanned ? (
            <button
              onClick={handleRiabilita}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              <ShieldCheck size={15} />
              {loading === 'riabilita' ? 'Riabilitando…' : 'Riabilita account'}
            </button>
          ) : (
            <button
              onClick={handleSospendi}
              disabled={!!loading}
              className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              <ShieldOff size={15} />
              {loading === 'sospendi' ? 'Sospendendo…' : 'Sospendi account'}
            </button>
          )}

          <button
            onClick={() => { setShowPwdForm(v => !v); setMsg(null) }}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <KeyRound size={15} />
            Reimposta password
          </button>
        </div>

        {showPwdForm && (
          <form onSubmit={handleResetPwd} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Nuova password (min 8 caratteri)</label>
              <input
                type="password"
                value={nuovaPassword}
                onChange={e => setNuovaPassword(e.target.value)}
                placeholder="Nuova password"
                className={`w-full ${inputClass}`}
              />
            </div>
            <button
              type="submit"
              disabled={!!loading}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {loading === 'pwd' ? 'Salvando…' : 'Salva'}
            </button>
          </form>
        )}
      </div>

      {/* Cambio ruolo */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cambio ruolo</h2>
        <div className="flex gap-3 items-center">
          <select
            value={selectedRuolo}
            onChange={e => setSelectedRuolo(e.target.value)}
            className={`flex-1 ${inputClass}`}
          >
            <option value="impresa">Impresa</option>
            <option value="operaio">Operaio</option>
            <option value="cliente">Cliente</option>
            <option value="magazziniere">Magazziniere</option>
            <option value="ufficio">Ufficio</option>
            <option value="libero">Libero Professionista</option>
          </select>
          <button
            onClick={handleCambiaRuolo}
            disabled={!!loading || selectedRuolo === ruolo}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
          >
            <UserCog size={15} />
            {loading === 'ruolo' ? 'Salvando…' : 'Salva ruolo'}
          </button>
        </div>
      </div>

      {/* Zona pericolosa */}
      <div className="rounded-2xl border border-red-200 bg-white shadow-card p-6 space-y-4">
        <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Zona pericolosa</h2>
        <p className="text-sm text-gray-500">
          L&apos;eliminazione dell&apos;account è definitiva e irreversibile. Tutti i dati di autenticazione verranno rimossi.
        </p>
        <button
          onClick={handleElimina}
          disabled={!!loading}
          className="flex items-center gap-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          <Trash2 size={15} />
          {loading === 'elimina' ? 'Eliminando…' : 'Elimina account'}
        </button>
      </div>
    </div>
  )
}
