import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaClienteUfficio } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function ClienteUfficioDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUfficio()
  const { id } = await params
  const c = await prisma.cliente.findUnique({ where: { id } })
  if (!c) notFound()

  // Lista preventivi del cliente — solo dati operativi, NESSUN costo/margine
  const preventivi = await prisma.preventivo.findMany({
    where: { clienteId: id },
    select: { id: true, data: true, stato: true, righe: { select: { quantita: true, prezzoUnitario: true } } },
    orderBy: { data: 'desc' },
    take: 5,
  })

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={c.nome} backHref="/ufficio/clienti" />

      <form action={salvaClienteUfficio} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <input type="hidden" name="id" value={c.id} />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ragione sociale / Nome *</label>
            <input name="nome" required defaultValue={c.nome} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Partita IVA</label>
            <input name="partitaIva" defaultValue={c.partitaIva ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Codice fiscale</label>
            <input name="codiceFiscale" defaultValue={c.codiceFiscale ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Indirizzo</label>
            <input name="indirizzo" defaultValue={c.indirizzo ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Città</label>
            <input name="citta" defaultValue={c.citta ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">CAP</label>
              <input name="cap" defaultValue={c.cap ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prov.</label>
              <input name="provincia" maxLength={2} defaultValue={c.provincia ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input name="email" type="email" defaultValue={c.email ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Telefono</label>
            <input name="telefono" defaultValue={c.telefono ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">PEC</label>
            <input name="pec" defaultValue={c.pec ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Codice destinatario (SdI)</label>
            <input name="codiceDestinatario" defaultValue={c.codiceDestinatario ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
            <textarea name="note" rows={2} defaultValue={c.note ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Salva modifiche</button>
          <Link href="/ufficio/clienti" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
        </div>
      </form>

      {preventivi.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preventivi recenti</p>
          <div className="space-y-2">
            {preventivi.map(p => {
              const tot = p.righe.reduce((acc, r) => acc + r.quantita * r.prezzoUnitario, 0)
              return (
                <Link key={p.id} href={`/ufficio/preventivi/${p.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-700">{new Date(p.data).toLocaleDateString('it-IT')}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    p.stato === 'accettato' ? 'bg-emerald-100 text-emerald-700' :
                    p.stato === 'inviato' ? 'bg-blue-100 text-blue-700' :
                    p.stato === 'rifiutato' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>{p.stato}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(tot / 100)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
