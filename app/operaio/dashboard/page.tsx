import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { MeteoBox } from '@/components/operaio/MeteoBox'
import { PuntiUtili } from '@/components/operaio/PuntiUtili'

export default async function OperaioDashboardPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assegnazioni, giornataAttiva, giornataRapportinoPendente, pianificazioneOggi] = await Promise.all([
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
      select: {
        id: true,
        fase: true,
        commessa: { select: { nome: true, indirizzoCantiere: true } },
      },
    }),
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: null },
      select: { id: true, data: true, commessa: { select: { nome: true } } },
      orderBy: { data: 'desc' },
    }),
    prisma.pianificazione.findFirst({
      where: { operaioId: operaio.id, data: today, sostituito: false },
      include: {
        commessa: {
          select: {
            id: true,
            nome: true,
            indirizzoCantiere: true,
            istruzioniCantiere: true,
            attrezzatureNecessarie: true,
            cliente: { select: { nome: true } },
          },
        },
        mezzo: { select: { nome: true, targa: true } },
      },
    }),
  ])

  const commesseAperte = assegnazioni.filter(a => a.commessa.stato === 'aperta')
  const commesseChiuse = assegnazioni.filter(a => a.commessa.stato === 'chiusa')

  // Cantiere principale del giorno (da pianificazione o prima commessa aperta)
  const cantiereOggi = pianificazioneOggi?.commessa ?? commesseAperte[0]?.commessa ?? null

  const dataOggiLabel = today.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-5">
      {/* Banner rapportino urgente */}
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
            className="mt-4 flex items-center justify-center gap-2 w-full bg-white text-red-600 font-bold py-2.5 rounded-xl text-sm"
          >
            Compila ora →
          </a>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Ciao, {operaio.nome.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{dataOggiLabel}</p>
      </div>

      {/* Piano del giorno — da pianificazione impresa */}
      {pianificazioneOggi && (
        <div className="rounded-2xl overflow-hidden border border-emerald-200 shadow-sm">
          <div className="bg-emerald-900 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-0.5">
              Piano dell&apos;impresa per oggi
            </p>
            <h2 className="font-bold text-white text-lg leading-tight">
              {pianificazioneOggi.commessa.nome}
            </h2>
            {pianificazioneOggi.commessa.cliente && (
              <p className="text-sm text-emerald-300 mt-0.5">{pianificazioneOggi.commessa.cliente.nome}</p>
            )}
          </div>

          <div className="bg-white divide-y divide-gray-100">
            {/* Indirizzo */}
            {pianificazioneOggi.commessa.indirizzoCantiere ? (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Posizione</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {pianificazioneOggi.commessa.indirizzoCantiere}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pianificazioneOggi.commessa.indirizzoCantiere)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all"
                >
                  🗺 Apri Maps
                </a>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Posizione</p>
                <p className="text-sm text-gray-400 italic">Posizione non disponibile</p>
              </div>
            )}

            {/* Mezzo */}
            {pianificazioneOggi.mezzo && (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Mezzo</p>
                <p className="text-sm font-medium text-gray-900">
                  🚗 {pianificazioneOggi.mezzo.nome}
                  {pianificazioneOggi.mezzo.targa ? ` (${pianificazioneOggi.mezzo.targa})` : ''}
                </p>
              </div>
            )}

            {/* Lavoro da fare */}
            {pianificazioneOggi.lavoroDaFare && (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Lavoro di oggi</p>
                <p className="text-sm font-medium text-gray-900 whitespace-pre-line">
                  {pianificazioneOggi.lavoroDaFare}
                </p>
              </div>
            )}

            {/* Istruzioni cantiere */}
            {pianificazioneOggi.commessa.istruzioniCantiere && (
              <details className="group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Istruzioni cantiere</p>
                    <p className="text-sm font-medium text-gray-700 line-clamp-1">
                      {pianificazioneOggi.commessa.istruzioniCantiere}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm shrink-0 ml-2 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 pt-1">
                  <p className="text-sm text-gray-700 whitespace-pre-line bg-amber-50 border border-amber-200 rounded-xl p-3">
                    {pianificazioneOggi.commessa.istruzioniCantiere}
                  </p>
                </div>
              </details>
            )}

            {/* Attrezzatura necessaria */}
            {pianificazioneOggi.commessa.attrezzatureNecessarie && (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">🔧 Porta con te</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {pianificazioneOggi.commessa.attrezzatureNecessarie}
                </p>
              </div>
            )}

            {/* Note materiale */}
            {pianificazioneOggi.noteMateriale && (
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">📦 Note materiale</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {pianificazioneOggi.noteMateriale}
                </p>
              </div>
            )}

            {/* Meteo */}
            <div className="px-4 py-3">
              <MeteoBox indirizzo={pianificazioneOggi.commessa.indirizzoCantiere} />
            </div>

            {/* Punti utili */}
            {pianificazioneOggi.commessa.indirizzoCantiere && (
              <div className="px-4 py-3">
                <PuntiUtili indirizzo={pianificazioneOggi.commessa.indirizzoCantiere} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA principale */}
      {giornataAttiva ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Giornata in corso</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{giornataAttiva.commessa.nome}</p>
            </div>
            <Badge variant="success" dot>
              {giornataAttiva.fase === 'pausa' ? 'Pausa' : 'Attiva'}
            </Badge>
          </div>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-white font-bold text-base shadow-sm shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            ▶ Riprendi giornata
          </a>
          {/* Azioni rapide giornata attiva */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {giornataAttiva.commessa.indirizzoCantiere && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(giornataAttiva.commessa.indirizzoCantiere)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                🗺 Apri Maps
              </a>
            )}
            <a
              href={`/operaio/giornata/${giornataAttiva.id}/chat`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
              💬 Chat cantiere
            </a>
          </div>
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

      {/* Cantieri assegnati */}
      {commesseAperte.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Image src="/immagini/vuoto-cantieri.png" width={80} height={80} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="text-sm font-semibold text-gray-700">Nessun cantiere assegnato</p>
          <p className="text-xs text-gray-400 mt-1">Chiedi alla tua impresa</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">I tuoi cantieri</h2>
          {commesseAperte.map(a => {
            const c = a.commessa
            const ultimaGiornata = c.giornate[0]
            return (
              <div key={a.commessaId} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                      {c.cliente && (
                        <p className="text-sm text-gray-500 mt-0.5">{c.cliente.nome}</p>
                      )}
                      {c.indirizzoCantiere ? (
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Image src="/immagini/icona-posizione.png" width={12} height={12} alt="" className="shrink-0 opacity-60" />
                            {c.indirizzoCantiere}
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.indirizzoCantiere)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
                          >
                            🗺 Maps
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic mt-1">Posizione non disponibile</p>
                      )}
                    </div>
                    <Badge variant="success" dot>Aperta</Badge>
                  </div>
                  {ultimaGiornata && (
                    <p className="mt-2.5 text-xs text-gray-400 border-t border-gray-100 pt-2">
                      Ultima giornata: {formatData(ultimaGiornata.data)}
                    </p>
                  )}
                </div>

                {/* Punti utili inline nella card cantiere (solo se indirizzo presente) */}
                {c.indirizzoCantiere && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                    <PuntiUtili indirizzo={c.indirizzoCantiere} />
                  </div>
                )}
              </div>
            )
          })}

          {commesseChiuse.length > 0 && (
            <>
              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Cantieri chiusi</h2>
              {commesseChiuse.map(a => (
                <div key={a.commessaId} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 opacity-60">
                  <p className="font-medium text-gray-700 text-sm">{a.commessa.nome}</p>
                  {a.commessa.cliente && <p className="text-xs text-gray-500">{a.commessa.cliente.nome}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
