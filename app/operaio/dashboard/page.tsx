import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { OnboardingGuida } from '@/components/onboarding/OnboardingGuida'
import { MeteoBox } from '@/components/operaio/MeteoBox'
import { PuntiUtili } from '@/components/operaio/PuntiUtili'
import { MASCOTTE } from '@/lib/mascotte'
import { Clock, MapPin, Calendar, Wrench, Truck, Play, Coffee, StopCircle, CheckCircle2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'

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

  // Bullet list istruzioni
  const istruzioniBullet = pianificazioneOggi?.commessa.istruzioniCantiere
    ? pianificazioneOggi.commessa.istruzioniCantiere.split('\n').filter(r => r.trim())
    : []

  // Cantieri da mostrare nella lista in fondo (escluso quello già in evidenza)
  const altriCantieri = pianificazioneOggi
    ? commesseAperte.filter(a => a.commessaId !== pianificazioneOggi.commessaId)
    : commesseAperte.slice(1)

  // Trova la mascotte
  const mascotteSelezionata = MASCOTTE.find(m => m.id === operaio.avatarMascotte) || MASCOTTE[0]
  const colore = operaio.coloreMascotte || 'giallo'

  // Mappa i gradienti in base al colore del casco
  const colorGradients: Record<string, string> = {
    giallo: 'from-amber-500 to-yellow-600 border-yellow-400/20 text-amber-950',
    verde: 'from-emerald-600 to-teal-800 border-emerald-500/20 text-white',
    blu: 'from-blue-600 to-indigo-800 border-blue-500/20 text-white',
    rosso: 'from-rose-600 to-red-800 border-red-500/20 text-white'
  }
  const gradientClass = colorGradients[colore] || colorGradients.giallo

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
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 shadow-sm text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-extrabold text-sm text-red-800">Rapportino da completare</p>
              <p className="text-xs mt-0.5 text-red-700">
                {giornataRapportinoPendente.commessa.nome} ({new Date(giornataRapportinoPendente.data).toLocaleDateString('it-IT')})
              </p>
            </div>
          </div>
          <Link
            href={`/operaio/giornata/${giornataRapportinoPendente.id}/rapportino`}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors text-center"
          >
            Compila ora →
          </Link>
        </div>
      )}

      {/* ── 1. Greeting Card Cockpit (Rich Aesthetics) ── */}
      <div className={`rounded-3xl bg-gradient-to-r ${gradientClass} border p-5 shadow-lg relative overflow-hidden flex items-center justify-between gap-4`}>
        {/* Cerchio di luce decorativo background */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/40 shadow-md shrink-0 flex items-center justify-center p-1 bg-slate-50/10 backdrop-blur-xs">
            <Image
              src={mascotteSelezionata.file}
              alt={mascotteSelezionata.nome}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">
              Ciao, {operaio.nome.split(' ')[0]}!
            </h1>
            <p className="text-xs opacity-90 font-medium capitalize mt-0.5">
              📅 {dataOggiLabel}
            </p>
            {operaio.fraseDivertente && (
              <p className="text-[11px] italic opacity-85 mt-1 font-semibold truncate max-w-[200px] sm:max-w-md">
                &ldquo;{operaio.fraseDivertente}&rdquo;
              </p>
            )}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0 relative z-10 text-right">
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/10">
            Casco {colore}
          </span>
        </div>
      </div>

      {/* ── 2. Cockpit Stato Giornata (Stato giornata) ── */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            giornataAttiva 
              ? giornataAttiva.fase === 'pausa'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-600 animate-pulse'
              : 'bg-slate-100 text-slate-400'
          }`}>
            {giornataAttiva 
              ? giornataAttiva.fase === 'pausa'
                ? <Coffee size={20} />
                : <Play size={20} />
              : <Clock size={20} />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Stato giornata</span>
            <span className="text-sm font-bold text-slate-800">
              {giornataAttiva 
                ? giornataAttiva.fase === 'pausa'
                  ? 'In Pausa Caffè'
                  : `In Servizio su ${giornataAttiva.commessa.nome}`
                : 'Non Iniziata'}
            </span>
          </div>
        </div>
        
        {giornataAttiva ? (
          <Link
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="w-full sm:w-auto text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            Gestisci Turno
          </Link>
        ) : (
          !giornataRapportinoPendente && (
            <Link
              href="/operaio/giornata/nuova"
              className="w-full sm:w-auto text-center bg-emerald-655 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Play size={12} />
              Inizia Giornata
            </Link>
          )
        )}
      </div>

      {/* ── 3. Card Intervento di Oggi (Card intervento) ── */}
      {cantiereOggi ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Intestazione ticket */}
          <div className="bg-slate-50 border-b border-gray-150 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Intervento Odierno
              </span>
              <h3 className="font-black text-slate-900 text-base mt-1.5 leading-tight">{cantiereOggi.nome}</h3>
              {cantiereOggi.cliente && (
                <p className="text-xs text-gray-500 mt-0.5">{cantiereOggi.cliente.nome}</p>
              )}
            </div>
            <span className="text-xl">🛠️</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Indirizzo + GPS button */}
            {cantiereOggi.indirizzoCantiere ? (
              <div className="flex items-center justify-between gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-3">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-gray-700 truncate leading-snug">
                    {cantiereOggi.indirizzoCantiere}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cantiereOggi.indirizzoCantiere)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  GPS <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Posizione non configurata per questo cantiere.</p>
            )}

            {/* Note di lavoro da fare */}
            {pianificazioneOggi?.lavoroDaFare && (
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dettaglio attività</span>
                <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-line bg-slate-50/50 border rounded-xl p-3">
                  {pianificazioneOggi.lavoroDaFare}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : commesseAperte.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-xs">
          <span className="text-3xl block mb-2">📂</span>
          <p className="text-sm font-bold text-gray-700">Nessun cantiere programmato</p>
          <p className="text-xs text-gray-400 mt-1">Non ci sono cantieri attivi assegnati alla tua scheda.</p>
        </div>
      ) : (
        /* Nessuna pianificazione specifica oggi, mostriamo il cantiere permanente */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">Cantiere Assegnato</span>
              <h3 className="font-extrabold text-slate-800 text-base mt-1">{commesseAperte[0].commessa.nome}</h3>
            </div>
            <span className="text-lg">📁</span>
          </div>
          {commesseAperte[0].commessa.indirizzoCantiere && (
            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
              <span className="text-xs text-slate-600 truncate">📍 {commesseAperte[0].commessa.indirizzoCantiere}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(commesseAperte[0].commessa.indirizzoCantiere)}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-lg hover:bg-blue-700"
              >
                Naviga
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Timeline / Appuntamenti di Oggi (Promemoria) ── */}
      {promemoriaOggi.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-3.5">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} /> I tuoi Appuntamenti di Oggi
          </p>
          <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-4.5 before:w-0.5 before:bg-slate-100">
            {promemoriaOggi.map((p) => {
              const ora = new Date(p.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const cleanTitolo = p.titolo.replace(/^TEST_AI_FULL_QUADRO:\s*/, '')
              return (
                <div key={p.id} className="relative pl-7 space-y-1">
                  {/* Pallino timeline */}
                  <span className="absolute left-3.5 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white shrink-0"></span>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 uppercase tracking-wide">
                      <Clock size={8} /> {ora}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">{cleanTitolo}</h4>
                    {p.descrizione && (
                      <p className="text-[11px] text-gray-500 leading-normal">{p.descrizione}</p>
                    )}
                    {p.luogo && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 mt-2 text-[10px]">
                        <span className="text-gray-400 truncate max-w-[70%]">📍 {p.luogo}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.luogo)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-bold hover:underline shrink-0"
                        >
                          Apri Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 5. Checklist Mezzo e Attrezzatura (Checklist mezzo) ── */}
      {(pianificazioneOggi?.mezzo || pianificazioneOggi?.commessa.attrezzatureNecessarie || pianificazioneOggi?.noteMateriale) && (
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Wrench size={12} /> Checklist Mezzo & Attrezzatura
          </p>

          <div className="space-y-3">
            {pianificazioneOggi.mezzo && (
              <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Veicolo Assegnato</p>
                  <p className="text-[11px] text-gray-500">
                    {pianificazioneOggi.mezzo.nome} {pianificazioneOggi.mezzo.targa && `· ${pianificazioneOggi.mezzo.targa}`}
                  </p>
                </div>
              </div>
            )}

            {pianificazioneOggi.commessa.attrezzatureNecessarie && (
              <div className="border border-slate-150 rounded-2xl p-3.5 space-y-1.5">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">🔧 Attrezzatura Necessaria</span>
                <p className="text-xs font-semibold text-slate-700 whitespace-pre-line leading-relaxed">
                  {pianificazioneOggi.commessa.attrezzatureNecessarie}
                </p>
              </div>
            )}

            {pianificazioneOggi.noteMateriale && (
              <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-3.5 space-y-1">
                <span className="block text-[9px] font-bold text-blue-500 uppercase tracking-widest">📦 Note sul Materiale</span>
                <p className="text-xs font-semibold text-blue-950 whitespace-pre-line leading-relaxed">
                  {pianificazioneOggi.noteMateriale}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. Istruzioni operative cantiere ── */}
      {istruzioniBullet.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 size={12} /> Checklist Operatività Cantiere
          </p>
          <ul className="space-y-2">
            {istruzioniBullet.map((istr, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-200/60 text-amber-800 text-[10px] font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{istr}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 7. Utility Hub (Meteo elegante & Punti utili placeholders) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MeteoBox indirizzo={cantiereOggi?.indirizzoCantiere ?? null} />
        {cantiereOggi?.indirizzoCantiere ? (
          <PuntiUtili indirizzo={cantiereOggi.indirizzoCantiere} />
        ) : (
          <div className="bg-gray-55 bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Punti utili</p>
            <p className="text-xs text-gray-500">Imposta un cantiere per vedere bar e punti di interesse vicini.</p>
          </div>
        )}
      </div>

      {/* ── 8. Altri cantieri assegnati (Permanenti/Chiusi) ── */}
      {(altriCantieri.length > 0 || commesseChiuse.length > 0) && (
        <div className="space-y-3.5">
          {altriCantieri.length > 0 && (
            <>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2">
                Altri Cantieri Assegnati
              </h4>
              <div className="space-y-2.5">
                {altriCantieri.map(a => {
                  const c = a.commessa
                  const uGiornata = c.giornate[0]
                  return (
                    <div key={a.commessaId} className="bg-white rounded-2xl border border-gray-250 p-4 shadow-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h5 className="text-xs font-black text-gray-900 truncate">{c.nome}</h5>
                        {c.indirizzoCantiere && <p className="text-[11px] text-gray-400 truncate mt-0.5">📍 {c.indirizzoCantiere}</p>}
                      </div>
                      <Badge variant="success">Attivo</Badge>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {commesseChiuse.length > 0 && (
            <>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-350 pt-2">
                Cantieri Chiusi di Recente
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {commesseChiuse.map(a => (
                  <div key={a.commessaId} className="bg-slate-50 border border-slate-150 rounded-xl p-3 opacity-60">
                    <p className="text-xs font-bold text-slate-600 truncate">{a.commessa.nome}</p>
                    <p className="text-[10px] text-slate-400 truncate">Stato: Chiuso</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
