'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaUtenteImpresa, creaUtenteLibero } from './actions'
import { Building2, Briefcase, Eye, EyeOff } from 'lucide-react'

interface Props {
  ruolo: 'impresa' | 'libero'
}

export function CreaUtenteForm({ ruolo }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || password.length < 8) {
      setMsg({ type: 'err', text: 'Compila tutti i campi. La password deve avere almeno 8 caratteri.' })
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      if (ruolo === 'impresa') {
        await creaUtenteImpresa({ email: email.trim(), password, nome: nome.trim() })
      } else {
        await creaUtenteLibero({ email: email.trim(), password, nome: nome.trim() })
      }
      setMsg({ type: 'ok', text: `Account creato con successo! L'utente può accedere con ${email}.` })
      setNome('')
      setEmail('')
      setPassword('')
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  const Icon = ruolo === 'impresa' ? Building2 : Briefcase
  const label = ruolo === 'impresa' ? 'Impresa' : 'Libero professionista'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
          <Icon size={20} className="text-purple-700" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Crea account {label}</p>
          <p className="text-xs text-gray-500">L'accesso è immediato dopo la creazione</p>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-2.5 text-sm font-medium mb-4 ${msg.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
            {ruolo === 'impresa' ? 'Ragione sociale / Nome impresa' : 'Nome e cognome'}
          </label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder={ruolo === 'impresa' ? 'Es. Rossi Impianti S.r.l.' : 'Es. Mario Rossi'}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@esempio.it"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Password temporanea</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 caratteri"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-purple-400 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Comunica la password all'utente. Potrà cambiarla al primo accesso.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creazione in corso…' : `Crea account ${label}`}
        </button>
      </form>
    </div>
  )
}
