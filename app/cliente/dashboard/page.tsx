import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatEuro, formatData } from '@/lib/format'
import { OnboardingGuida } from '@/components/onboarding/OnboardingGuida'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

export default async function ClienteDashboardPage() {
  const { user, cliente } = await requireCliente()

  const nome = user.user_metadata?.full_name ?? user.email ?? 'Cliente'

  const [commesse, fatture] = await Promise.all([
    prisma.commessa.findMany({
      where: { clienteId: cliente.id },
      include: {
        giornate: {
          include: { foto: { take: 1, orderBy: { createdAt: 'desc' } } },
          orderBy: { data: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fatturaAttiva.findMany({
      where: { clienteId: cliente.id },
      include: { righe: true },
      orderBy: { data: 'desc' },
      take: 5,
    }),
  ])

  const commesseAperte = commesse.filter(c => c.stato === 'aperta')
  const fattureDaIncassare = fatture.filter(f => f.stato === 'da_incassare' || f.stato === 'scaduta')

  function totale(righe: { quantita: number; prezzoUnitario: number }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round(imp * iva / 100)
  }

  const totaleDaPagare = fattureDaIncassare.reduce((acc, f) => acc + totale(f.righe, f.aliquotaIva), 0)

  const MENU = [
    {
      href: '/cliente/lavori',
      icon: '/immagini/icona-cantieri.png',
      titolo: 'I miei lavori',
      desc: commesseAperte.length > 0
        ? `${commesseAperte.length} cantiere${commesseAperte.length > 1 ? 'i' : ''} in corso`
        : commesse.length > 0 ? 'Tutti i lavori completati' : 'Nessun cantiere',
      badge: commesseAperte.length > 0 ? <Badge variant="success" dot>In corso</Badge> : null,
    },
    {
      href: '/cliente/pagamenti',
      icon: '/immagini/icona-pagamenti.png',
      titolo: 'Pagamenti',
      desc: fattureDaIncassare.length > 0
        ? `${fattureDaIncassare.length} fattura${fattureDaIncassare.length > 1 ? 'e' : ''} · ${formatEuro(totaleDaPagare)}`
        : fatture.length > 0 ? 'Tutto in regola ✓' : 'Nessuna fattura',
      badge: fattureDaIncassare.length > 0 ? <Badge variant="warning">In attesa</Badge> : null,
    },
    {
      href: '/cliente/documenti',
      icon: '/immagini/icona-dico.png',
      titolo: 'Documenti & Certificati',
      desc: 'Fatture e Richieste Di.Co.',
      badge: null,
    },
    {
      href: '/cliente/servizi',
      icon: '/immagini/icona-servizi.png',
      titolo: 'Servizi aggiuntivi',
      desc: 'Scopri le nostre offerte',
      badge: null,
    },
    {
      href: '/cliente/manutenzioni',
      icon: '🔧',
      titolo: 'Manutenzioni',
      desc: 'Controlli pianificati',
      badge: null,
    },
  ]

  return (
    <div className="space-y-7">
      <OnboardingGuida
        role="cliente"
        title="🏗️ Benvenuto nel tuo Portale QUADRO"
        subtitle="La tua finestra personale sui lavori eseguiti da CreCas Impianti S.r.l."
        features={[
          "Consultare l'avanzamento dei lavori dei tuoi cantieri attivi.",
          "Verificare e scaricare le fatture e richiedere la Di.Co.",
          "Visualizzare gli interventi programmati di manutenzione periodica.",
          "Accettare o rifiutare in tempo reale le nuove proposte di intervento."
        ]}
        actions={[
          "Controlla lo stato e le novità dei tuoi cantieri in corso in 'I miei lavori'.",
          "Esamina le fatture emesse e lo storico dei tuoi pagamenti.",
          "Richiedi all'impresa la tua Dichiarazione di Conformità in modo professionale.",
          "Controlla le prossime scadenze delle manutenzioni programmate."
        ]}
        finalMessage="“Il cliente non deve chiedere sempre aggiornamenti: QUADRO mostra ciò che serve in modo ordinato.”"
        localStorageKey="quadro_onboarding_seen_cliente"
      />
      {/* Welcome */}
      <div className="rounded-2xl mesh-bg-cliente text-white px-6 py-6 shadow-premium-lg border border-violet-900 flex items-center justify-between gap-4">
        <div>
          <p className="text-violet-200 text-xs font-semibold uppercase tracking-wider">Portale personale</p>
          <h1 className="text-2xl font-black mt-1 tracking-tight">Ciao, {nome.split(' ')[0]}!</h1>
          <p className="text-violet-100/90 text-sm mt-1.5 font-medium">
            {commesseAperte.length > 0
              ? `Hai ${commesseAperte.length} cantiere${commesseAperte.length > 1 ? 'i' : ''} in corso`
              : 'Benvenuto nel tuo portale QUADRO'}
          </p>
        </div>
        <Image
          src="/immagini/illustrazione-cliente.png"
          width={100}
          height={90}
          alt=""
          className="shrink-0 hidden sm:block opacity-90 select-none transition-transform duration-300 hover:scale-105"
        />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Attivi"
          value={commesseAperte.length}
          sub="Cantieri"
          href="/cliente/lavori"
          variant="info"
        />
        <StatCard
          label="Da pagare"
          value={fattureDaIncassare.length}
          sub="Fatture"
          href="/cliente/pagamenti"
          variant={fattureDaIncassare.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Totali"
          value={commesse.length}
          sub="Cantieri"
          href="/cliente/lavori"
          variant="default"
        />
      </div>

      {/* Menu sezioni */}
      <div className="space-y-3">
        {MENU.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-premium hover:border-violet-100 hover-lift active-press transition-all duration-300"
          >
            {item.icon.startsWith('/') ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100/50 group-hover:scale-105 transition-transform duration-300">
                <Image src={item.icon} width={26} height={26} alt="" className="opacity-90" />
              </div>
            ) : (
              <span className="text-2xl shrink-0 group-hover:scale-105 transition-transform duration-300">{item.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-violet-700 transition-colors leading-tight">{item.titolo}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium truncate">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.badge}
              <span className="text-gray-300 group-hover:text-violet-500 text-lg font-bold transition-colors group-hover:translate-x-0.5 duration-300">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Ultima foto cantiere */}
      {commesse.length > 0 && commesse[0].giornate[0]?.foto[0] && (
        <div className="pt-2">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Ultima foto dal cantiere</h2>
          <Link href={`/cliente/lavori/${commesse[0].id}`} className="block rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-premium hover-lift active-press transition-all duration-300">
            <img
              src={commesse[0].giornate[0].foto[0].url}
              alt="Ultima foto cantiere"
              className="w-full object-cover max-h-56 transition-transform duration-500 hover:scale-[1.02]"
            />
            <div className="px-5 py-4">
              <p className="text-sm font-bold text-gray-900 leading-tight">{commesse[0].nome}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{formatData(commesse[0].giornate[0].data)}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
