import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { OnboardingGuida } from '@/components/onboarding/OnboardingGuida'
import { MeteoBox } from '@/components/operaio/MeteoBox'
import { PuntiUtili } from '@/components/operaio/PuntiUtili'
import { Clock, MapPin } from 'lucide-react'


export default async function OperaioDashboardPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assegnazioni, giornataAttiva, giornataRapportinoPendente, pianificazioneOggi, promemoriaOggi] = await Promise.all([
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
    prisma.promemoria.findMany({
      where: {
        assegnatoAOperaioId: operaio.id,
        dataOra: {
          gte: today,
          lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        },
        stato: 'attivo',
      },
      orderBy: {
        dataOra: 'asc',
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

  // Bullet list istruzioni: split su newline, filtra righe vuote
  const istruzioniBullet = pianificazioneOggi?.commessa.istruzioniCantiere
    ? pianificazioneOggi.commessa.istruzioniCantiere.split('\n').filter(r => r.trim())
    : []

  // Cantieri da mostrare nella lista in fondo (escluso quello già in evidenza)
  const altriCantieri = pianificazioneOggi
    ? commesseAperte.filter(a => a.commessaId !== pianificazioneOggi.commessaId)
    : commesseAperte.slice(1)

  return (
    <div className="space-y-6">
      <OnboardingGuida
        role="operaio"
        title="🔨 Ciao! Questa è la tua area cantiere in QUADRO"
        subtitle="La tua guida per la giornata di lavoro in CreCas Impianti S.r.l."
        features={[
          "Vedere i cantieri assegnati e le relative istruzioni operative.",
          "Registrare gli orari di lavoro (Inizio cantiere, Pause, Fine giornata).",
          "Scattare e caricare foto dell'avanzamento dei lavori.",
          "Inviare il rapportino di fine giornata ed indicare le note per domani."
        ]}
        actions={[
          "Controlla il Cantiere Assegnato per oggi nella dashboard.",
          "Fai clic su 'Apri Maps' per navigare con GPS fino al cantiere.",
          "Leggi attentamente le istruzioni e porta l'attrezzatura necessaria.",
          "Registra l'inizio del lavoro facendo clic su 'Inizia giornata'.",
          "Avanza le fasi lavorative e scatta foto dei lavori completati.",
          "Invia il rapportino prima di andare via dal cantiere."
        ]}
        finalMessage="“QUADRO ti evita chiamate inutili: ti dice dove andare, cosa portare e cosa registrare.”"
        localStorageKey="quadro_onboarding_seen_operaio"
      />

      {/* ── Banner rapportino urgente ── */}
      {giornataRapportinoPendente && (
        <div className="rounded-2xl bg-red-50/70 border border-red-200 p-5 shadow-premium text-red-900 transition-all hover-lift">
          <p className="font-extrabold text-base flex items-center gap-2 text-red-800">
            <Image src="/immagini/icona-avviso.png" width={18} height={18} alt="" className="shrink-0" />
            Rapportino da compilare
          </p>
          <p className="text-sm mt-1.5 font-medium text-red-700">
            {giornataRapportinoPendente.commessa.nome}
            {' · '}
            <span className="font-bold">{new Date(giornataRapportinoPendente.data).toLocaleDateString('it-IT')}</span>
          </p>
          <a
            href={`/operaio/giornata/${giornataRapportinoPendente.id}/rapportino`}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-red-655 bg-red-600 text-white hover:bg-red-700 font-bold py-3.5 rounded-xl text-sm transition-all hover-lift active-press"
          >
            Compila ora →
          </a>
        </div>
      )}

      {/* ── 1. Saluto + data ── */}
      <div className="pt-2 pb-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Ciao, {operaio.nome.split(' ')[0]}! 👋
        </h1>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1 capitalize">{dataOggiLabel}</p>
      </div>

      {/* ── Promemoria / Appuntamenti di Oggi ── */}
      {promemoriaOggi.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-premium space-y-3.5">
          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="text-sm">📅</span> I tuoi Appuntamenti di Oggi
          </p>
          <div className="space-y-3">
            {promemoriaOggi.map((p) => {
              const ora = new Date(p.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const cleanTitolo = p.titolo.replace(/^TEST_AI_FULL_QUADRO:\s*/, '')
              return (
                <div key={p.id} className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 uppercase tracking-wide">
                        <Clock size={10} />
                        {ora}
                      </span>
                      <h3 className="text-xs font-bold text-slate-800 leading-snug">{cleanTitolo}</h3>
                      {p.descrizione && (
                        <p className="text-[11px] text-gray-500 leading-normal">{p.descrizione}</p>
                      )}
                    </div>
                  </div>
                  {p.luogo && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/60 text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1 truncate max-w-[70%]">
                        <MapPin size={11} className="shrink-0 text-teal-500" />
                        {p.luogo}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.luogo)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-teal-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-teal-700 active-press transition-all duration-300"
                      >
                        Apri Maps
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 2. Card "Cantiere di oggi" ── */}
      {pianificazioneOggi ? (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden transition-all duration-300 hover-lift">
          {/* Header mesh gradient */}
          <div className="mesh-bg-operaio px-5 py-5 border-b border-emerald-800/10">
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-0.5">
              Cantiere di oggi
            </p>
            <h2 className="font-black text-white text-xl leading-tight tracking-tight">
              {pianificazioneOggi.commessa.nome}
            </h2>
            {pianificazioneOggi.commessa.cliente && (
              <p className="text-xs font-medium text-emerald-100/90 mt-1">
                {pianificazioneOggi.commessa.cliente.nome}
              </p>
            )}
          </div>

          {/* Corpo */}
          <div className="divide-y divide-slate-100/60">
            {/* Indirizzo + Maps */}
            {pianificazioneOggi.commessa.indirizzoCantiere ? (
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <p className="text-sm text-gray-700 flex-1 min-w-0 leading-snug font-medium">
                  📍 {pianificazioneOggi.commessa.indirizzoCantiere}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pianificazioneOggi.commessa.indirizzoCantiere)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 hover-lift active-press transition-all duration-300 shadow-sm"
                >
                  🗺 Apri Maps
                </a>
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-400 italic">📍 Posizione non disponibile</p>
              </div>
            )}

            {/* Lavoro di oggi */}
            {pianificazioneOggi.lavoroDaFare && (
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lavoro di oggi</p>
                <p className="text-sm font-semibold text-gray-800 whitespace-pre-line leading-relaxed">
                  {pianificazioneOggi.lavoroDaFare}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : commesseAperte.length === 0 ? (
        /* Nessun cantiere */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-premium">
          <Image src="/immagini/vuoto-cantieri.png" width={80} height={80} alt="" className="mx-auto mb-4 opacity-70" />
          <p className="text-sm font-bold text-gray-700">Nessun cantiere assegnato</p>
          <p className="text-xs text-gray-400 mt-1.5">Chiedi alla tua impresa</p>
        </div>
      ) : (
        /* Cantiere da assegnazione permanente, nessuna pianificazione oggi */
        <div className="rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden transition-all duration-300 hover-lift">
          <div className="bg-slate-50 px-5 py-5 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Cantiere assegnato
            </p>
            <h2 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
              {commesseAperte[0].commessa.nome}
            </h2>
            {commesseAperte[0].commessa.cliente && (
              <p className="text-xs font-medium text-slate-500 mt-1">
                {commesseAperte[0].commessa.cliente.nome}
              </p>
            )}
          </div>
          {commesseAperte[0].commessa.indirizzoCantiere && (
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <p className="text-sm text-gray-700 flex-1 min-w-0 leading-snug font-medium">
                📍 {commesseAperte[0].commessa.indirizzoCantiere}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(commesseAperte[0].commessa.indirizzoCantiere)}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 hover-lift active-press transition-all duration-300 shadow-sm"
              >
                🗺 Apri Maps
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Card "Istruzioni cantiere" — elenco puntato ── */}
      {istruzioniBullet.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/75 shadow-premium p-5 transition-all duration-300 hover-lift">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-3">
            📋 Istruzioni cantiere
          </p>
          <ul className="space-y-2.5">
            {istruzioniBullet.map((riga, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900 font-medium">
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
      {(pianificazioneOggi?.mezzo || pianificazioneOggi?.commessa.attrezzatureNecessarie || pianificazioneOggi?.noteMateriale) && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-premium p-5 space-y-4 transition-all duration-300 hover-lift">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Mezzo e attrezzatura
          </p>

          {pianificazioneOggi.mezzo && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100/50">
                <span className="text-lg">🚗</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{pianificazioneOggi.mezzo.nome}</p>
                {pianificazioneOggi.mezzo.targa && (
                  <p className="text-xs text-gray-400 font-medium">{pianificazioneOggi.mezzo.targa}</p>
                )}
              </div>
            </div>
          )}

          {pianificazioneOggi.commessa.attrezzatureNecessarie && (
            <div className="rounded-xl bg-slate-50 border border-slate-100/50 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">🔧 Porta con te</p>
              <p className="text-sm text-slate-700 whitespace-pre-line font-semibold leading-relaxed">
                {pianificazioneOggi.commessa.attrezzatureNecessarie}
              </p>
            </div>
          )}

          {pianificazioneOggi.noteMateriale && (
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-4 py-3">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">📦 Note materiale</p>
              <p className="text-sm text-blue-900 whitespace-pre-line font-semibold leading-relaxed">
                {pianificazioneOggi.noteMateriale}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CTA giornata ── */}
      {giornataAttiva ? (
        /* Giornata in corso */
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 shadow-premium-lg space-y-4 text-white transition-all duration-300 hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">
                Giornata in corso
              </p>
              <p className="text-base font-black text-white tracking-tight mt-1">
                {giornataAttiva.commessa.nome}
              </p>
            </div>
            <Badge variant="success" dot>
              {giornataAttiva.fase === 'pausa' ? 'Pausa' : 'Attiva'}
            </Badge>
          </div>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-emerald-800 font-extrabold py-3.5 text-base hover:bg-emerald-50 active-press hover-lift transition-all shadow-sm"
          >
            ▶ Riprendi giornata
          </a>
          <div className="flex gap-3">
            {giornataAttiva.commessa.indirizzoCantiere && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(giornataAttiva.commessa.indirizzoCantiere)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-white py-3 text-sm font-bold hover-lift active-press transition-all border border-emerald-400/25"
              >
                🗺 Maps
              </a>
            )}
            <a
              href={`/operaio/giornata/${giornataAttiva.id}/chat`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-white py-3 text-sm font-bold hover-lift active-press transition-all border border-emerald-400/25"
            >
              💬 Chat cantiere
            </a>
          </div>
        </div>
      ) : (
        /* Nessuna giornata: pulsante Inizia */
        !giornataRapportinoPendente && (
          <Link
            href="/operaio/giornata/nuova"
            className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-5 text-white shadow-premium-lg hover:from-emerald-700 hover:to-teal-700 hover-lift active-press transition-all duration-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 border border-white/10 shrink-0 shadow-sm">
              <Image src="/immagini/icona-cantieri.png" width={32} height={32} alt="" className="brightness-0 invert" />
            </div>
            <div>
              <p className="font-extrabold text-lg tracking-tight leading-tight">Inizia giornata</p>
              <p className="text-emerald-100/90 text-sm mt-0.5 font-medium">Registra ore e materiale</p>
            </div>
          </Link>
        )
      )}

      {/* ── 6. Meteo + Punti utili (standalone, fuori dalla card cantiere) ── */}
      <MeteoBox indirizzo={cantiereOggi?.indirizzoCantiere ?? null} />
      {cantiereOggi?.indirizzoCantiere && (
        <PuntiUtili indirizzo={cantiereOggi.indirizzoCantiere} />
      )}

      {/* ── 7. Altri cantieri assegnati ── */}
      {(altriCantieri.length > 0 || commesseChiuse.length > 0) && (
        <div className="space-y-4">
          {altriCantieri.length > 0 && (
            <>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-2">
                Altri cantieri
              </h2>
              {altriCantieri.map(a => {
                const c = a.commessa
                const ultimaGiornata = c.giornate[0]
                return (
                  <div key={a.commessaId} className="rounded-2xl border border-slate-100 bg-white shadow-premium overflow-hidden transition-all duration-300 hover-lift">
                    <div className="px-5 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate leading-tight">{c.nome}</p>
                          {c.cliente && (
                            <p className="text-xs text-gray-400 mt-1 font-medium">{c.cliente.nome}</p>
                          )}
                          {c.indirizzoCantiere ? (
                            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-gray-400 truncate max-w-[200px] font-medium">
                                📍 {c.indirizzoCantiere}
                              </p>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.indirizzoCantiere)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0 transition-colors"
                              >
                                Maps →
                              </a>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic mt-2.5">Posizione non disponibile</p>
                          )}
                        </div>
                        <Badge variant="success" dot>Aperta</Badge>
                      </div>
                      {ultimaGiornata && (
                        <p className="mt-3.5 text-xs text-gray-400 border-t border-slate-100/80 pt-3 font-medium">
                          Ultima giornata: {formatData(ultimaGiornata.data)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {commesseChiuse.length > 0 && (
            <>
              <h2 className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Cantieri chiusi
              </h2>
              {commesseChiuse.map(a => (
                <div key={a.commessaId} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 opacity-60">
                  <p className="font-bold text-slate-600 text-sm">{a.commessa.nome}</p>
                  {a.commessa.cliente && (
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{a.commessa.cliente.nome}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

    </div>
  )
}
