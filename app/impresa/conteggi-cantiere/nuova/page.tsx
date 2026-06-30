'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { creaConteggio, getCommesseDropdown, getOperaiDropdown } from '../actions'
import { ClipboardCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Commessa = { id: string; nome: string; indirizzoCantiere?: string | null }
type Operaio = { id: string; nome: string }

export default function NuovoConteggio() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [operai, setOperai] = useState<Operaio[]>([])
  const [form, setForm] = useState({ commessaId: '', operaioId: '', noteImpresa: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCommesseDropdown(), getOperaiDropdown()]).then(([c, o]) => {
      setCommesse(c)
      setOperai(o)
    })
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.commessaId) { setError('Seleziona una commessa'); return }
    setError('')
    startTransition(async () => {
      try {
        const res = await creaConteggio({
          commessaId: form.commessaId,
          operaioId: form.operaioId || undefined,
          noteImpresa: form.noteImpresa || undefined,
        })
        if (res.success) {
          router.push(`/impresa/conteggi-cantiere/${res.id}`)
        } else {
          setError(res.error)
        }
      } catch {
        setError('Non è stato possibile creare il conteggio cantiere. Verifica commessa e operaio e riprova.')
      }
    })
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/impresa/conteggi-cantiere" className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo conteggio cantiere</h1>
          <p className="text-sm text-gray-500 mt-0.5">Richiedi il consuntivo lavorazioni a un operaio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
            <ClipboardCheck size={16} className="text-blue-600" />
          </div>
          <span className="text-sm font-bold text-gray-700">Dati richiesta</span>
        </div>

        {/* Commessa */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
            Commessa / Cantiere *
          </label>
          <select
            value={form.commessaId}
            onChange={e => setForm(f => ({ ...f, commessaId: e.target.value }))}
            required
            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
          >
            <option value="">— Seleziona commessa —</option>
            {commesse.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.indirizzoCantiere ? ` — ${c.indirizzoCantiere}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Operaio */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
            Assegna a operaio
          </label>
          <select
            value={form.operaioId}
            onChange={e => setForm(f => ({ ...f, operaioId: e.target.value }))}
            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
          >
            <option value="">— Nessun operaio specifico —</option>
            {operai.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>

        {/* Note impresa */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
            Istruzioni per l&apos;operaio
          </label>
          <textarea
            value={form.noteImpresa}
            onChange={e => setForm(f => ({ ...f, noteImpresa: e.target.value }))}
            rows={3}
            placeholder="Es. Conta tutto il quadro, inclusi differenziali. Fai foto degli ambienti principali."
            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/impresa/conteggi-cantiere"
            className="flex-1 text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Annulla
          </Link>
          <button
            type="submit"
            disabled={pending || !form.commessaId}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
          >
            {pending ? 'Creazione…' : 'Crea conteggio'}
          </button>
        </div>
      </form>
    </div>
  )
}
