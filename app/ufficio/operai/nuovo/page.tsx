'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { creaOperaioUfficio } from '../actions'
import { Copy, Check, ShieldAlert } from 'lucide-react'

export default function NuovoOperaioUfficioPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState('')
  const [zona, setZona] = useState('')
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
        const res = await creaOperaioUfficio({
          nome: nome.trim(),
          email: email.trim(),
          ruolo: ruolo.trim() || undefined,
          zona: zona.trim() || undefined,
          note: note.trim() || undefined,
        })
        
        if (res.tempPassword) {
          setTempPassword(res.tempPassword)
        } else {
          router.push('/ufficio/operai')
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
    router.push('/ufficio/operai')
  }

  return (
    <div className="max-w-xl relative">
      <PageHeader title="Nuovo operaio" backHref="/ufficio/operai" />
      
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
            <input 
              value={nome}
              onChange={e => setNome(e.target.value)}
              required 
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ruolo</label>
            <input 
              placeholder="es. Elettricista" 
              value={ruolo}
              onChange={e => setRuolo(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Zona operativa</label>
            <input 
              value={zona}
              onChange={e => setZona(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" 
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2} 
              className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none" 
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button 
            type="submit" 
            disabled={pending}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            {pending ? 'Salvataggio...' : 'Salva'}
          </button>
          <Link href="/ufficio/operai" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
                Questa password verrà mostrata **solo una volta**. Copiala e consegnala all&apos;operaio in sicurezza.
              </p>
            </div>

            <div className="bg-slate-50 border rounded-xl p-3 flex items-center justify-between gap-3">
              <code className="text-sm font-mono font-bold text-teal-800 tracking-wider">{tempPassword}</code>
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
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Ho copiato la password, chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
