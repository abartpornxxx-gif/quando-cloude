import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'

export default async function ImpresaDashboardPage() {
  await requireImpresa()

  const [commesseAperte, rapportiniMancanti, scadenzeVicine, ordiniAperti, richiesteNuove] = await Promise.all([
    prisma.commessa.count({ where: { stato: 'aperta' } }),
    prisma.giornata.count({ where: { fase: 'fine', stato: 'bozza', rapportino: null } }),
    prisma.fatturaAttiva.count({
      where: {
        stato: { in: ['da_incassare', 'scaduta'] },
        dataScadenza: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.ordineFornitore.count({ where: { stato: { in: ['richiesto', 'ordinato'] } } }),
    prisma.richiestaOfferta.count({ where: { stato: 'nuova' } }),
  ])

  const commesseRecenti = await prisma.commessa.findMany({
    where: { stato: 'aperta' },
    include: { cliente: { select: { nome: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  const SEZIONI = [
    {
      titolo: 'Commesse & Cantieri',
      colore: 'blue',
      links: [
        { label: 'Commesse', href: '/impresa/commesse', desc: `${commesseAperte} aperte` },
        { label: 'Preventivi', href: '/impresa/preventivi', desc: 'Crea e invia' },
        { label: 'Giornate', href: '/impresa/giornate', desc: rapportiniMancanti > 0 ? `⚠ ${rapportiniMancanti} rapportini` : 'Storico' },
        { label: 'Pianificazione', href: '/impresa/pianificazione', desc: 'Calendario cantieri' },
      ],
    },
    {
      titolo: 'Anagrafiche',
      colore: 'gray',
      links: [
        { label: 'Clienti', href: '/impresa/clienti', desc: 'Anagrafica' },
        { label: 'Operai', href: '/impresa/operai', desc: 'Squadre e ore' },
        { label: 'Fornitori', href: '/impresa/fornitori', desc: 'Anagrafica' },
        { label: 'Configurazione', href: '/impresa/configurazione', desc: 'Orari e impostazioni' },
      ],
    },
    {
      titolo: 'Materiali & Logistica',
      colore: 'gray',
      links: [
        { label: 'Materiali', href: '/impresa/materiali', desc: 'Listino prezzi' },
        { label: 'Ordini', href: '/impresa/ordini', desc: ordiniAperti > 0 ? `${ordiniAperti} in corso` : 'Fornitori' },
        { label: 'Magazzino', href: '/impresa/magazzino', desc: 'Giacenza' },
        { label: 'Mezzi', href: '/impresa/mezzi', desc: 'Parco veicoli' },
      ],
    },
    {
      titolo: 'Fatture & Documenti',
      colore: 'gray',
      links: [
        { label: 'Fatture attive', href: '/impresa/fatture', desc: 'Da incassare' },
        { label: 'Fatture passive', href: '/impresa/fatture-passive', desc: 'Da pagare' },
        { label: 'Scadenzario', href: '/impresa/scadenzario', desc: scadenzeVicine > 0 ? `⚠ ${scadenzeVicine} in scadenza` : 'Tutte le scadenze' },
        { label: 'DiCo', href: '/impresa/dico', desc: 'DM 37/2008' },
      ],
    },
    {
      titolo: 'Catalogo & Offerte',
      colore: 'gray',
      links: [
        { label: 'Catalogo', href: '/impresa/catalogo', desc: 'Offerte ai clienti' },
        { label: 'Richieste', href: '/impresa/richieste-offerte', desc: richiesteNuove > 0 ? `📬 ${richiesteNuove} nuove` : 'Interessi clienti' },
        { label: 'Checklist', href: '/impresa/checklist', desc: 'Modelli' },
        { label: 'Attrezzature', href: '/impresa/attrezzature', desc: 'Inventario' },
      ],
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Panoramica dell'attività</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Cantieri aperti"
          value={commesseAperte}
          sub="Visualizza commesse →"
          href="/impresa/commesse"
          variant="info"
        />
        <StatCard
          label="Rapportini"
          value={rapportiniMancanti > 0 ? rapportiniMancanti : '✓'}
          sub={rapportiniMancanti > 0 ? 'Mancanti — da gestire' : 'Tutto in regola'}
          href="/impresa/giornate"
          variant={rapportiniMancanti > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Scadenze 30g"
          value={scadenzeVicine}
          sub={scadenzeVicine > 0 ? 'Fatture in scadenza' : 'Nessuna scadenza'}
          href="/impresa/scadenzario"
          variant={scadenzeVicine > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Ordini aperti"
          value={ordiniAperti}
          sub="Fornitori in corso"
          href="/impresa/ordini"
          variant="default"
        />
        <StatCard
          label="Richieste offerte"
          value={richiesteNuove > 0 ? richiesteNuove : '–'}
          sub={richiesteNuove > 0 ? 'Nuove da clienti' : 'Nessuna nuova'}
          href="/impresa/richieste-offerte"
          variant={richiesteNuove > 0 ? 'purple' : 'default'}
        />
      </div>

      {/* Commesse recenti */}
      {commesseRecenti.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Cantieri in corso</h2>
            <Link href="/impresa/commesse" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Vedi tutte →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {commesseRecenti.map(c => (
              <Link
                key={c.id}
                href={`/impresa/commesse/${c.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white border border-gray-200 px-4 py-3.5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{c.nome}</p>
                  {c.cliente && <p className="text-xs text-gray-400 mt-0.5">{c.cliente.nome}</p>}
                </div>
                <div className="flex flex-col items-end shrink-0 ml-3">
                  <p className="text-xs text-gray-500">{formatEuro(c.preventivato)}</p>
                  <Badge variant="success" dot>aperta</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sezioni di navigazione */}
      <div className="space-y-5">
        {SEZIONI.map(s => (
          <div key={s.titolo}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">{s.titolo}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {s.links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group rounded-xl bg-white border border-gray-200 px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{l.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{l.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
