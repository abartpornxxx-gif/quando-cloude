import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'

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
    take: 5,
  })

  const SEZIONI = [
    {
      titolo: 'Commesse & Preventivi',
      links: [
        { label: 'Commesse', href: '/impresa/commesse', desc: `${commesseAperte} aperte` },
        { label: 'Preventivi', href: '/impresa/preventivi', desc: 'Crea e invia' },
        { label: 'Giornate', href: '/impresa/giornate', desc: rapportiniMancanti > 0 ? `⚠ ${rapportiniMancanti} rapportini` : 'Storico' },
        { label: 'Pianificazione', href: '/impresa/pianificazione', desc: 'Calendario cantieri' },
      ],
    },
    {
      titolo: 'Anagrafiche',
      links: [
        { label: 'Clienti', href: '/impresa/clienti', desc: 'Anagrafica' },
        { label: 'Operai', href: '/impresa/operai', desc: 'Squadre e ore' },
        { label: 'Fornitori', href: '/impresa/fornitori', desc: 'Anagrafica' },
        { label: 'Configurazione', href: '/impresa/configurazione', desc: 'Orari e impostazioni' },
      ],
    },
    {
      titolo: 'Materiali & Mezzi',
      links: [
        { label: 'Materiali', href: '/impresa/materiali', desc: 'Listino prezzi' },
        { label: 'Ordini', href: '/impresa/ordini', desc: ordiniAperti > 0 ? `${ordiniAperti} in corso` : 'Fornitori' },
        { label: 'Magazzino', href: '/impresa/magazzino', desc: 'Giacenza' },
        { label: 'Mezzi', href: '/impresa/mezzi', desc: 'Parco veicoli' },
      ],
    },
    {
      titolo: 'Fatture & Documenti',
      links: [
        { label: 'Fatture attive', href: '/impresa/fatture', desc: 'Da incassare' },
        { label: 'Fatture passive', href: '/impresa/fatture-passive', desc: 'Da pagare' },
        { label: 'Scadenzario', href: '/impresa/scadenzario', desc: scadenzeVicine > 0 ? `⚠ ${scadenzeVicine} in scadenza` : 'Tutte le scadenze' },
        { label: 'DiCo', href: '/impresa/dico', desc: 'DM 37/2008' },
      ],
    },
    {
      titolo: 'Catalogo & Offerte',
      links: [
        { label: 'Catalogo', href: '/impresa/catalogo', desc: 'Offerte ai clienti' },
        { label: 'Richieste', href: '/impresa/richieste-offerte', desc: richiesteNuove > 0 ? `📬 ${richiesteNuove} nuove` : 'Interessi clienti' },
      ],
    },
    {
      titolo: 'Strumenti',
      links: [
        { label: 'Checklist', href: '/impresa/checklist', desc: 'Modelli' },
        { label: 'Attrezzature', href: '/impresa/attrezzature', desc: 'Inventario' },
        { label: 'Report assenze', href: '/impresa/assenze', desc: 'Richieste operai' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Gestione cantieri e amministrazione</p>
      </div>

      {/* KPI rapidi */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Link href="/impresa/commesse" className="rounded-xl bg-blue-50 border border-blue-100 p-4 hover:bg-blue-100 transition-colors">
          <p className="text-xs text-blue-600 font-medium">Cantieri aperti</p>
          <p className="text-2xl font-bold text-blue-900">{commesseAperte}</p>
        </Link>
        <Link href="/impresa/giornate" className={`rounded-xl border p-4 transition-colors ${rapportiniMancanti > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
          <p className={`text-xs font-medium ${rapportiniMancanti > 0 ? 'text-red-600' : 'text-gray-500'}`}>Rapportini</p>
          <p className={`text-2xl font-bold ${rapportiniMancanti > 0 ? 'text-red-700' : 'text-gray-700'}`}>
            {rapportiniMancanti > 0 ? `⚠ ${rapportiniMancanti}` : '✓'}
          </p>
        </Link>
        <Link href="/impresa/scadenzario" className={`rounded-xl border p-4 transition-colors ${scadenzeVicine > 0 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
          <p className={`text-xs font-medium ${scadenzeVicine > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Scadenze 30g</p>
          <p className={`text-2xl font-bold ${scadenzeVicine > 0 ? 'text-amber-700' : 'text-gray-700'}`}>{scadenzeVicine}</p>
        </Link>
        <Link href="/impresa/ordini" className="rounded-xl bg-gray-50 border border-gray-100 p-4 hover:bg-gray-100 transition-colors">
          <p className="text-xs text-gray-500 font-medium">Ordini aperti</p>
          <p className="text-2xl font-bold text-gray-700">{ordiniAperti}</p>
        </Link>
        <Link href="/impresa/richieste-offerte" className={`rounded-xl border p-4 transition-colors ${richiesteNuove > 0 ? 'bg-violet-50 border-violet-200 hover:bg-violet-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
          <p className={`text-xs font-medium ${richiesteNuove > 0 ? 'text-violet-600' : 'text-gray-500'}`}>Richieste offerte</p>
          <p className={`text-2xl font-bold ${richiesteNuove > 0 ? 'text-violet-700' : 'text-gray-700'}`}>
            {richiesteNuove > 0 ? `📬 ${richiesteNuove}` : '–'}
          </p>
        </Link>
      </div>

      {/* Commesse recenti */}
      {commesseRecenti.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Commesse recenti</h2>
          <div className="bg-white rounded-xl border divide-y">
            {commesseRecenti.map(c => (
              <Link key={c.id} href={`/impresa/commesse/${c.id}`} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium">{c.nome}</p>
                  {c.cliente && <p className="text-xs text-gray-500">{c.cliente.nome}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatEuro(c.preventivato)}</p>
                  <p className="text-xs text-green-600">aperta</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sezioni */}
      <div className="space-y-4">
        {SEZIONI.map(s => (
          <div key={s.titolo}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{s.titolo}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {s.links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl bg-white border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
