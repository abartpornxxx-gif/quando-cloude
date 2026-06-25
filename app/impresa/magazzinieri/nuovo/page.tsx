'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { creaMagazziniere } from '../actions'
import { Copy, Check, ShieldAlert } from 'lucide-react'

export default function NuovoMagazzinierePage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    if (!nome.trim() || !email.trim()) {
      setError('Nome ed Email sono obbligatori.')
      return
    }

    startTransition(async () => {
      try {
        const res = await creaMagazziniere({
          nome: nome.trim(),
          email: email.trim(),
          note: note.trim() || undefined,
        })
        
        if (res.tempPassword) {
          setTempPassword(res.tempPassword)
        } else {
          router.push('/impresa/magazzinieri')
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Errore durante la creazione.')
      }
    })
  }

  function handleCopy() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleCloseModal() {
    setTempPassword(null)
    router.push('/impresa/magazzinieri')
  }

  return (
    <div className="mx-auto max-w-2xl relative">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/magazzinieri" className="text-sm text-gray-500 hover:text-gray-700">
          ← Magazzinieri
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuovo magazziniere</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome completo *</label>
            <input 
              value={nome}
              onChange={e => setNome(e.target.value)}
              required 
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" 
            />
            <p className="mt-1 text-xs text-gray-400">Necessaria per creare l&apos;accesso all&apos;app.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3} 
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button 
            type="submit" 
            disabled={pending}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? 'Salvataggio...' : 'Crea magazziniere'}
          </button>
          <Link href="/impresa/magazzinieri" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annulla
          </Link>
        </div>
      </form>

      {/* Modal Visualizzazione Password Temporanea */}
      {tempPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-3xl">🔑</span>
              <h3 className="text-base font-black text-gray-900 tracking-tight">Password Temporanea Creata</h3>
              <p className="text-xs text-gray-500">
                Questa password verrà mostrata **solo una volta**. Copiala e consegnala al magazziniere in sicurezza.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-3 flex items-center justify-between gap-3">
              <code className="text-sm font-mono font-bold text-blue-800 tracking-wider">{tempPassword}</code>
              <button 
                onClick={handleCopy}
                className="shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                title="Copia negli appunti"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>

            <button 
              onClick={handleCloseModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Ho copiato la password, chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
