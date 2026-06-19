import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData, formatEuro } from '@/lib/format'

export default async function GiornataDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { operaio } = await requireOperaio()

  const g = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: { select: { nome: true } },
      mezzo: { select: { nome: true, targa: true } },
      ore: true,
      materiali: { include: { materiale: { select: { codice: true } } } },
      foto: true,
      risposte: { include: { template: { select: { domanda: true } } } },
    },
  })

  if (!g || g.operaioId !== operaio.id) notFound()

  const oreOrdinarie = g.ore.filter(o => o.tipo === 'ordinaria').reduce((a, o) => a + o.quantita, 0)
  const oreStraordinarie = g.ore.filter(o => o.tipo === 'straordinaria').reduce((a, o) => a + o.quantita, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/operaio/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Cantieri</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-bold text-gray-900">Giornata {formatData(g.data)}</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <Row label="Cantiere" value={g.commessa.nome} />
        <Row label="Data" value={formatData(g.data)} />
        <Row label="Stato" value={g.stato === 'inviata' ? '✅ Inviata' : '📝 Bozza'} />
        {g.mezzo && <Row label="Mezzo" value={`${g.mezzo.nome}${g.mezzo.targa ? ` (${g.mezzo.targa})` : ''}`} />}
        {g.lavoroSvolto && <Row label="Lavoro svolto" value={g.lavoroSvolto} />}
        {g.note && <Row label="Note" value={g.note} />}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <Image src="/immagini/icona-tempo.png" width={13} height={13} alt="" className="opacity-60 shrink-0" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ore registrate</span>
        </div>
        <Row label="Ordinarie" value={`${oreOrdinarie} h`} />
        {oreStraordinarie > 0 && <Row label="Straordinarie" value={`${oreStraordinarie} h`} />}
      </div>

      {g.materiali.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Materiali usati</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {g.materiali.map(m => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.descrizione}</p>
                  <p className="text-xs text-gray-400">Qta: {m.quantita}</p>
                </div>
                <p className="text-sm font-medium text-gray-700">{formatEuro(Math.round(m.quantita * m.prezzoUnitario))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {g.risposte.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Checklist</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {g.risposte.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <p className="text-sm text-gray-700 flex-1">{r.template.domanda}</p>
                <span className={`shrink-0 text-sm font-semibold ${r.risposta ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.risposta ? '✓ Sì' : '✗ No'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {g.foto.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Foto ({g.foto.length})</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {g.foto.map(f => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.url} alt="Foto cantiere"
                className="h-40 w-full rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
