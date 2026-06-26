import { requireUfficio } from '@/lib/auth'
import { listaNotificheUfficio } from '@/lib/notifiche'
import { segnaTutteLetteUfficio } from './actions'
import Link from 'next/link'
import { AlertCircle, Receipt, CheckCircle, BellOff } from 'lucide-react'

function formatData(d: Date | string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT')
}

export default async function NotificheUfficioPage() {
  const { user } = await requireUfficio()
  const items = await listaNotificheUfficio(user.id)
  const nonLette = items.filter(i => !i.letta)
  const urgenti = nonLette.filter(n => n.urgente)
  const normali = nonLette.filter(n => !n.urgente)
  const lette = items.filter(i => i.letta)

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mb-1">
            <Link href="/ufficio/dashboard" className="text-sm text-teal-600 hover:text-teal-800">
              â† Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Avvisi operativi</h1>
          <p className="text-sm text-gray-500 mt-1">
            Saldi pendenti e fatture da gestire.
          </p>
        </div>

        {nonLette.length > 0 && (
          <form action={segnaTutteLetteUfficio}>
            <button
              type="submit"
              className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 text-sm font-medium shadow-sm"
            >
              Segna tutte come lette
            </button>
          </form>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-900">Tutto in ordine</p>
          <p className="text-sm text-gray-500 mt-1">Nessun saldo pendente o fattura da gestire.</p>
        </div>
      )}

      {/* Urgenti non lette */}
      {urgenti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Urgenti â€” fatture scadute ({urgenti.length})
          </p>
          <div className="rounded-2xl border border-red-200 bg-white shadow-card overflow-hidden">
            <div className="divide-y divide-red-100">
              {urgenti.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-red-50 transition-colors group"
                >
                  <div className="shrink-0 mt-0.5">
                    <AlertCircle size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700">
                      {item.titolo}
                    </p>
                    {item.sottotitolo && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.sottotitolo}</p>
                    )}
                    {item.data && (
                      <p className="text-xs text-gray-400 mt-1">{formatData(item.data)}</p>
                    )}
                  </div>
                  <span className="text-gray-400 shrink-0 mt-1">â€º</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Normali non lette */}
      {normali.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Saldi pendenti ({normali.length})
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
            <div className="divide-y divide-gray-100">
              {normali.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="shrink-0 mt-0.5">
                    <Receipt size={18} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-teal-700">
                      {item.titolo}
                    </p>
                    {item.sottotitolo && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.sottotitolo}</p>
                    )}
                    {item.data && (
                      <p className="text-xs text-gray-400 mt-1">{formatData(item.data)}</p>
                    )}
                  </div>
                  <span className="text-gray-400 shrink-0 mt-1">â€º</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Link gestione saldi */}
      {nonLette.length > 0 && (
        <div className="flex justify-center">
          <Link
            href="/ufficio/saldi-pendenti"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Gestisci tutti i saldi pendenti â†’
          </Link>
        </div>
      )}

      {/* Già lette */}
      {lette.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Già lette ({lette.length})
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden opacity-60">
            <div className="divide-y divide-gray-100">
              {lette.map(item => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    <BellOff size={16} className="text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500">{item.titolo}</p>
                    {item.sottotitolo && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.sottotitolo}</p>
                    )}
                  </div>
                  <span className="text-gray-300 shrink-0 mt-1">â€º</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

