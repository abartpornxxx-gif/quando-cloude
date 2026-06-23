import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

export default async function OperaioDashboardPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assegnazioni, giornataAttiva, giornataRapportinoPendente] = await Promise.all([
    prisma.commessaOperaio.findMany({
      where: { operaioId: operaio.id },
      include: {
        commessa: {
          include: {
            cliente: { select: { nome: true } },
            giornate: {
              where: { operaioId: operaio.id },
              orderBy: { data: 'desc' },
              take: 1,
              select: { data: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, data: today, stato: 'bozza' },
      select: { id: true, fase: true, commessa: { select: { nome: true } } },
    }),
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: null },
      select: { id: true, data: true, commessa: { select: { nome: true } } },
      orderBy: { data: 'desc' },
    }),
  ])

  const commesseAperte = assegnazioni.filter(a => a.commessa.stato === 'aperta')
  const commesseChiuse = assegnazioni.filter(a => a.commessa.stato === 'chiusa')

  const cantiereOggi = commesseAperte[0]?.commessa ?? null
  const dataOggiLabel = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  const istruzioniBullet = cantiereOggi?.istruzioniCantiere
    ? cantiereOggi.istruzioniCantiere.split('\n').filter(r => r.trim())
    : []

  const PUNTI_UTILI = [
    { label: '☕ Bar', q: 'bar' },
    { label: '🅿️ Parcheggio', q: 'parcheggio' },
    { label: '🔧 Ferramenta', q: 'ferramenta' },
    { label: '⛽ Distributore', q: 'distributore carburante' },
  ]

  return (
    <div className="space-y-4">

      {/* ── Banner rapportino urgente ── */}
      {giornataRapportinoPendente && (
        <div className="rounded-2xl bg-red-600 text-white p-5 shadow-lg shadow-red-200">
          <p className="font-bold text-base flex items-center gap-2">
            <Image src="/immagini/icona-avviso.png" width={18} height={18} alt="" className="brightness-0 invert shrink-0" />
            Rapportino da compilare
          </p>
          <p className="text-sm mt-1 text-red-200">
            {giornataRapportinoPendente.commessa.nome}
            {' · '}
            {new Date(giornataRapportinoPendente.data).toLocaleDateString('it-IT')}
          </p>
          <a
            href={`/operaio/giornata/${giornataRapportinoPendente.id}/rapportino`}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-white text-red-600 font-bold py-3 rounded-xl text-sm"
          >
            Compila ora →
          </a>
        </div>
      )}

      {/* ── 1. Saluto + data ── */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao, {operaio.nome.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{dataOggiLabel}</p>
      </div>

      {/* ── 2. Card "Cantiere di oggi" ── */}
      {cantiereOggi ? (
        <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-emerald-700 px-4 py-4">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-0.5">
              Cantiere di oggi
            </p>
            <h2 className="font-bold text-white text-xl leading-tight">{cantiereOggi.nome}</h2>
            {cantiereOggi.cliente && (
              <p className="text-sm text-emerald-200 mt-0.5">{cantiereOggi.cliente.nome}</p>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {cantiereOggi.indirizzoCantiere ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm text-gray-700 min-w-0 flex-1 leading-snug">
                  📍 {cantiereOggi.indirizzoCantiere}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cantiereOggi.indirizzoCantiere)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
                >
                  🗺 Maps
                </a>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-sm text-gray-400 italic">📍 Indirizzo non disponibile</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Image src="/immagini/vuoto-cantieri.png" width={80} height={80} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="text-sm font-semibold text-gray-700">Nessun cantiere assegnato</p>
          <p className="text-xs text-gray-400 mt-1">Chiedi alla tua impresa</p>
        </div>
      )}

      {/* ── 3. Card "Istruzioni cantiere" (elenco puntato) ── */}
      {istruzioniBullet.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
            📋 Istruzioni cantiere
          </p>
          <ul className="space-y-2">
            {istruzioniBullet.map((riga, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-snug">{riga}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 4. Card "Mezzo e attrezzatura" ── */}
      {cantiereOggi?.attrezzatureNecessarie && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            🔧 Attrezzatura necessaria
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {cantiereOggi.attrezzatureNecessarie}
          </p>
        </div>
      )}

      {/* ── 5. CTA giornata ── */}
      {giornataAttiva ? (
        <div className="rounded-2xl bg-emerald-600 p-5 shadow-lg shadow-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wide">
                Giornata in corso
              </p>
              <p className="text-sm font-bold text-white mt-0.5">{giornataAttiva.commessa.nome}</p>
            </div>
            <Badge variant="success" dot>
              {giornataAttiva.fase === 'pausa' ? 'Pausa' : 'Attiva'}
            </Badge>
          </div>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-emerald-700 font-bold py-3.5 text-base hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-sm"
          >
            ▶ Riprendi giornata
          </a>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/chat`}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-500 text-white py-2.5 text-sm font-semibold hover:bg-emerald-400 active:scale-95 transition-all"
          >
            💬 Chat cantiere
          </a>
        </div>
      ) : (
        !giornataRapportinoPendente && (
          <Link
            href="/operaio/giornata/nuova"
            className="flex items-center gap-4 rounded-2xl bg-emerald-600 px-5 py-5 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shrink-0">
              <Image src="/immagini/icona-cantieri.png" width={32} height={32} alt="" className="brightness-0 invert" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">Inizia giornata</p>
              <p className="text-emerald-200 text-sm mt-0.5">Registra ore e materiale</p>
            </div>
          </Link>
        )
      )}

      {/* ── 6. Meteo placeholder ── */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 shadow-sm px-4 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">⛅ Meteo</p>
        <p className="text-sm text-gray-500">Meteo non disponibile — verifica prima di partire.</p>
        {cantiereOggi?.indirizzoCantiere && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=meteo+${encodeURIComponent(cantiereOggi.indirizzoCantiere)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Cerca meteo zona cantiere →
          </a>
        )}
      </div>

      {/* ── 6b. Vicino al cantiere ── */}
      {cantiereOggi?.indirizzoCantiere && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Vicino al cantiere
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PUNTI_UTILI.map(p => (
              <a
                key={p.q}
                href={`https://www.google.com/maps/search/?api=1&query=${p.q}+vicino+${encodeURIComponent(cantiereOggi.indirizzoCantiere!)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
              >
                {p.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. Altri cantieri assegnati ── */}
      {commesseAperte.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Altri cantieri
          </p>
          {commesseAperte.slice(1).map(a => {
            const c = a.commessa
            const ultimaGiornata = c.giornate[0]
            return (
              <div key={a.commessaId} className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                    {c.cliente && <p className="text-sm text-gray-500 mt-0.5">{c.cliente.nome}</p>}
                    {c.indirizzoCantiere ? (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
                          📍 {c.indirizzoCantiere}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.indirizzoCantiere)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                        >
                          Maps →
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-1">📍 Posizione non disponibile</p>
                    )}
                  </div>
                  <Badge variant="success" dot>Aperta</Badge>
                </div>
                {ultimaGiornata && (
                  <p className="mt-2.5 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    Ultima giornata: {formatData(ultimaGiornata.data)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {commesseChiuse.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">Cantieri chiusi</p>
          {commesseChiuse.map(a => (
            <div key={a.commessaId} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 opacity-50">
              <p className="font-medium text-gray-600 text-sm">{a.commessa.nome}</p>
              {a.commessa.cliente && <p className="text-xs text-gray-400">{a.commessa.cliente.nome}</p>}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
