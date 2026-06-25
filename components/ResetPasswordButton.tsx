'use client'

import React, { useState, useTransition } from 'react'
import { Copy, Check, Key } from 'lucide-react'

interface Props {
  id: string
  nome: string
  action: (id: string) => Promise<{ success: boolean; tempPassword?: string }>
}

export function ResetPasswordButton({ id, nome, action }: Props) {
  const [pending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleReset() {
    if (!confirm(`Sei sicuro di voler ripristinare la password per ${nome}? Il collaboratore verrà forzato a cambiarla al prossimo accesso.`)) {
      return
    }

    startTransition(async () => {
      try {
        const res = await action(id)
        if (res.success && res.tempPassword) {
          setTempPassword(res.tempPassword)
        }
      } catch (err: any) {
        console.error(err)
        alert(err.message || 'Errore durante il reset.')
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

  return (
    <>
      <button
        onClick={handleReset}
        disabled={pending}
        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        title="Ripristina password"
      >
        <Key size={13} />
        <span>{pending ? 'Resettando...' : 'Ripristina'}</span>
      </button>

      {tempPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4 text-left">
            <div className="text-center space-y-1">
              <span className="text-3xl">🔑</span>
              <h3 className="text-base font-black text-gray-900 tracking-tight">Password Ripristinata</h3>
              <p className="text-xs text-gray-500">
                Ecco la nuova password temporanea per **{nome}**. Verrà mostrata **una sola volta**.
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
              onClick={() => setTempPassword(null)}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Ho copiato la password, chiudi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
