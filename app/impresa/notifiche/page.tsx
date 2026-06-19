import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheImpresa } from '@/lib/notifiche'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

// TODO LEGALE — art. 4 L. 300/1970:
// La sezione "Operai attivi ora" mostra solo giornate in corso come da DB (giornata.fase ≠ completata).
// NON è geolocalizzazione né rilevamento presenza in tempo reale.
// La geolocalizzazione è disabilitata per default.
// Prima di attivare tracciamento posizione: accordo sindacale o autorizzazione ispettorato + informativa GDPR.

const TIPO_ICON: Record<string, string> = {
  rapportino: '📋',
  fattura:    '💰',
  offerta:    '✨',
  materiale:  '📦',
  mezzo:      '🚐',
  chat:       '💬',
}

const FASE_LABEL: Record<string, string> = {
  inizio:      'Inizio',
  mattina:     'Mattina',
  pausa:       'Pausa pranzo',
  pomeriggio:  'Pomeriggio',
  fine:        'Fine giornata',
  completata:  'Completata',
}

export default async function NotificheImpresaPage() {
  await requireImpresa()

  // Messaggi recenti non letti (ultimi 24h, non da impresa)
  const ieri = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [items, giornateAttive, messaggiRecenti] = await Promise.all([
    listaNotificheImpresa(),
    // Operai con giornata aperta OGGI — visione stato lavori, non presenza GPS
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
    // Messaggi recenti con info mittente
    prisma.chatMessaggio.findMany({
      where: {
        ruolo: { not: 'impresa' },
        createdAt: { gte: ieri },
      },
      include: {
        giornata: {
          select: {
            id: true,
            operaio: { select: { nome: true } },
            commessa: { select: { nome: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      distinct: ['giornataId'],
    }),
  ])

  const urgenti = items.filter(i => i.urgente)
  const normali = items.filter(i => !i.urgente)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro notifiche</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length + messaggiRecenti.length} elementi</p>
        </div>
      </div>

      {items.length === 0 && messaggiRecenti.length === 0 && (
        <EmptyState
          icon="/immagini/successo.png"
          title="Tutto in ordine"
          description="Nessun elemento richiede attenzione in questo momento"
        />
      )}

      {/* Messaggi chat recenti — con mittente visibile */}
      {messaggiRecenti.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            💬 Messaggi recenti ({messaggiRecenti.length})
          </h2>
          <div className="rounded-2xl border border-blue-200 bg-white shadow-sm divide-y divide-gray-100">
            {messaggiRecenti.map(m => (
              <Link
                key={m.id}
                href={`/impresa/giornate/${m.giornataId}/chat`}
                className="flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-700">
                  {m.giornata.operaio.nome.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.giornata.operaio.nome}</p>
                    <Badge variant="info">{m.ruolo === 'magazziniere' ? 'Magazziniere' : 'Operaio'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{m.testo ?? '📷 Foto'}</p>
                  <p className="text-xs text-gray-400">{m.giornata.commessa.nome}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span className="text-xs text-blue-600 font-medium">Apri →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Urgenti */}
      {urgenti.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
            ⚠ Da gestire subito ({urgenti.length})
          </h2>
          <div className="rounded-2xl border border-red-200 bg-white shadow-sm divide-y divide-gray-100">
            {urgenti.map(item => (
              <Link key={`${item.tipo}-${item.id}`} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-red-50 transition-colors">
                <span className="text-xl shrink-0">{TIPO_ICON[item.tipo] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.titolo}</p>
                  {item.sottotitolo && <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-400 text-sm">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Normali */}
      {normali.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            In evidenza ({normali.length})
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {normali.map(item => (
              <Link key={`${item.tipo}-${item.id}`} href={item.href}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                <span className="text-xl shrink-0">{TIPO_ICON[item.tipo] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.titolo}</p>
                  {item.sottotitolo && <p className="text-xs text-gray-500 truncate">{item.sottotitolo}</p>}
                </div>
                {item.data && <p className="text-xs text-gray-400 shrink-0">{formatData(item.data)}</p>}
                <span className="text-gray-400 text-sm">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stato cantieri in corso */}
      {giornateAttive.length > 0 && (
        <div>
          {/* TODO LEGALE — art. 4 L. 300/1970: questa sezione mostra lo stato operativo
              (giornata aperta nel DB). NON attivare geolocalizzazione senza accordo sindacale
              o autorizzazione ispettorato del lavoro + informativa GDPR agli operai. */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            🏗 Cantieri attivi oggi ({giornateAttive.length})
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {giornateAttive.map(g => (
              <Link key={g.id} href={`/impresa/giornate/${g.id}/chat`}
                className="flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  g.fase === 'pausa' ? 'bg-amber-400' :
                  g.fase === 'fine' ? 'bg-orange-400' :
                  'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{g.operaio.nome}</p>
                  <p className="text-xs text-gray-500">{g.commessa.nome}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{FASE_LABEL[g.fase] ?? g.fase}</p>
                  <p className="text-xs text-blue-600 font-medium">Chat →</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 italic">
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
