import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaFornitore } from '../actions'

export default async function ModificaFornitorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const f = await prisma.fornitore.findUnique({ where: { id } })
  if (!f) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/fornitori" className="text-sm text-gray-500 hover:text-gray-700">← Fornitori</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{f.nome}</h1>
      </div>
      <form action={salvaFornitore} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={f.id} />
        <Field label="Nome / Ragione sociale *" name="nome" required defaultValue={f.nome} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partita IVA" name="partitaIva" defaultValue={f.partitaIva ?? ''} />
          <Field label="Codice fiscale" name="codiceFiscale" defaultValue={f.codiceFiscale ?? ''} />
        </div>
        <Field label="Indirizzo" name="indirizzo" defaultValue={f.indirizzo ?? ''} />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><Field label="Città" name="citta" defaultValue={f.citta ?? ''} /></div>
          <Field label="CAP" name="cap" defaultValue={f.cap ?? ''} />
        </div>
        <Field label="Provincia" name="provincia" defaultValue={f.provincia ?? ''} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" defaultValue={f.email ?? ''} />
          <Field label="Telefono" name="telefono" defaultValue={f.telefono ?? ''} />
        </div>
        <Field label="PEC" name="pec" type="email" defaultValue={f.pec ?? ''} />
        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <textarea name="note" rows={3} defaultValue={f.note ?? ''} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Salva modifiche</button>
          <Link href="/impresa/fornitori" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Annulla</Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, name, type = 'text', required, defaultValue }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  )
}
