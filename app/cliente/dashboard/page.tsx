import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatEuro, formatData } from '@/lib/format'
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
      titolo: 'Documenti',
      desc: 'Fatture e Dichiarazioni di Conformità',
      badge: null,
    },
    {
      href: '/cliente/servizi',
      icon: '/immagini/icona-servizi.png',
      titolo: 'Servizi aggiuntivi',
      desc: 'Scopri le nostre offerte',
      badge: null,
    },
  ]

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 text-white px-6 py-6 shadow-lg shadow-violet-200 flex items-center justify-between gap-4">
        <div>
          <p className="text-violet-200 text-sm font-medium">Portale personale</p>
          <h1 className="text-2xl font-bold mt-1">Ciao, {nome.split(' ')[0]}!</h1>
          <p className="text-violet-200 text-sm mt-1">
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
          className="shrink-0 hidden sm:block opacity-90 select-none"
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
      <div className="space-y-2.5">
        {MENU.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
          >
            {item.icon.startsWith('/') ? (
              <Image src={item.icon} width={28} height={28} alt="" className="shrink-0 opacity-80" />
            ) : (
              <span className="text-2xl shrink-0">{item.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700">{item.titolo}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.badge}
              <span className="text-gray-300 group-hover:text-violet-400 text-lg">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Ultima foto cantiere */}
      {commesse.length > 0 && commesse[0].giornate[0]?.foto[0] && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Ultima foto dal cantiere</h2>
          <Link href={`/cliente/lavori/${commesse[0].id}`} className="block rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <img
              src={commesse[0].giornate[0].foto[0].url}
              alt="Ultima foto cantiere"
              className="w-full object-cover max-h-52"
            />
            <div className="px-4 py-3 bg-white">
              <p className="text-sm font-medium text-gray-700">{commesse[0].nome}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatData(commesse[0].giornate[0].data)}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
