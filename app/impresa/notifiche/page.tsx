import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheImpresa } from '@/lib/notifiche'
import Link from 'next/link'
import { formatData } from '@/lib/format'

const TIPO_ICON: Record<string, string> = {
  rapportino: '📋',
  fattura: '💰',
  offerta: '✨',
  materiale: '📦',
  mezzo: '🚐',
}

// TODO LEGALE — art. 4 L. 300/1970:
// La sezione "Operai attivi ora" mostra solo giornate in corso come da DB (giornata.fase ≠ completata).
// NON è geolocalizzazione né rilevamento presenza in tempo reale.
// La geolocalizzazione è disabilitata per default (TODO nel WizardGiornata.tsx).
// Prima di attivare tracciamento posizione: accordo sindacale o autorizzazione ispettorato + informativa GDPR.

export default async function NotificheImpresaPage() {
  await requireImpresa()

  const [items, giornateAttive] = await Promise.all([
    listaNotificheImpresa(),
    // Operai con giornata aperta OGGI (non completata) — visione stato lavori, non presenza GPS
    prisma.giornata.findMany({
      where: {
        fase: { not: 'completata' },
        stato: 'bozza',
        data: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: {
        operaio: { select: { nome: true } },
        commessa: { select: { nome: true } },
      },
      orderBy: { inizioMattina: 'desc' },
    }),
  ])

  const urgenti = items.filter(i => i.urgente)
  const normali = items.filter(i => !i.urgente)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Centro notifiche</h1>
        <span className="text-sm text-gray-500">{items.length} elementi</span>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-semibold text-gray-700">Tutto in ordine</p>
          <p className="text-sm text-gray-400 mt-1">Nessun elemento richiede attenzione</p>
        </div>
      )}

      {/* Urgenti */}
      {urgenti.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">⚠ Da gestire subito ({urgenti.length})</h2>
          <div className="bg-white rounded-xl border border-red-200 divide-y">
            {urgenti.map(item => (
              <Link key={`${item.tipo}-${item.id}`} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-red-50">
                <span className="text-xl shrink-0">{TIPO_ICON[item.tipo] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.titolo}</p>
                  {item.sottotitolo && <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Normali */}
      {normali.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">In evidenza ({normali.length})</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {normali.map(item => (
              <Link key={`${item.tipo}-${item.id}`} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <span className="text-xl shrink-0">{TIPO_ICON[item.tipo] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.titolo}</p>
                  {item.sottotitolo && <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-400">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stato cantieri in corso — NOTE LEGALE: solo giornate DB, NON geolocalizzazione */}
      {giornateAttive.length > 0 && (
        <div>
          {/* TODO LEGALE — art. 4 L. 300/1970: questa sezione mostra lo stato operativo
              (giornata aperta nel DB). NON attivare geolocalizzazione senza accordo sindacale
              o autorizzazione ispettorato del lavoro + informativa GDPR agli operai. */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            🏗 Cantieri attivi oggi ({giornateAttive.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {giornateAttive.map(g => (
              <Link key={g.id} href={`/impresa/giornate/${g.id}/chat`}
                className="flex items-center gap-3 p-3 hover:bg-gray-50">
                <span className={`h-2 w-2 rounded-full shrink-0 ${g.fase === 'pausa' ? 'bg-yellow-400' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{g.operaio.nome}</p>
                  <p className="text-xs text-gray-500">{g.commessa.nome} · {g.fase}</p>
                </div>
                <span className="text-xs text-gray-400">💬</span>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1 italic">
            Stato giornata da DB · nessuna geolocalizzazione attiva
          </p>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">📬 Notifiche push e email</p>
        <p className="text-xs">Configura VAPID e Resend in <code className="bg-blue-100 px-1 rounded">.env.local</code> per ricevere notifiche anche fuori dall&apos;app.
        {' '}<Link href="/impresa/configurazione" className="underline">Vai alla configurazione →</Link></p>
      </div>
    </div>
  )
}
