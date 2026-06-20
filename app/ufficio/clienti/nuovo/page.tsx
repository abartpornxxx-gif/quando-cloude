import { requireUfficio } from '@/lib/auth'
import Link from 'next/link'
import { salvaClienteUfficio } from '../actions'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function NuovoClienteUfficioPage() {
  await requireUfficio()
  return (
    <div className="max-w-xl">
      <PageHeader title="Nuovo cliente" backHref="/ufficio/clienti" />
      <ClienteForm action={salvaClienteUfficio} />
    </div>
  )
}

function ClienteForm({ action, defaults }: { action: (fd: FormData) => Promise<void>; defaults?: Record<string, string | null> }) {
  const v = defaults ?? {}
  return (
    <form action={action} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Ragione sociale / Nome *</label>
          <input name="nome" required defaultValue={v.nome ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Partita IVA</label>
          <input name="partitaIva" defaultValue={v.partitaIva ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Codice fiscale</label>
          <input name="codiceFiscale" defaultValue={v.codiceFiscale ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Indirizzo</label>
          <input name="indirizzo" defaultValue={v.indirizzo ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Città</label>
          <input name="citta" defaultValue={v.citta ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">CAP</label>
            <input name="cap" defaultValue={v.cap ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Prov.</label>
            <input name="provincia" maxLength={2} defaultValue={v.provincia ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
          <input name="email" type="email" defaultValue={v.email ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Telefono</label>
          <input name="telefono" defaultValue={v.telefono ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">PEC</label>
          <input name="pec" defaultValue={v.pec ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Codice destinatario (SdI)</label>
          <input name="codiceDestinatario" defaultValue={v.codiceDestinatario ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
          <textarea name="note" rows={2} defaultValue={v.note ?? ''} className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">Salva</button>
        <Link href="/ufficio/clienti" className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
      </div>
    </form>
  )
}

export { ClienteForm }
