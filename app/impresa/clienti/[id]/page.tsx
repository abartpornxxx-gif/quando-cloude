import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { salvaCliente } from '../actions'

export default async function ModificaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) notFound()

  const dv = {
    id: cliente.id,
    nome: cliente.nome,
    partitaIva: cliente.partitaIva ?? '',
    codiceFiscale: cliente.codiceFiscale ?? '',
    indirizzo: cliente.indirizzo ?? '',
    citta: cliente.citta ?? '',
    cap: cliente.cap ?? '',
    provincia: cliente.provincia ?? '',
    email: cliente.email ?? '',
    telefono: cliente.telefono ?? '',
    pec: cliente.pec ?? '',
    codiceDestinatario: cliente.codiceDestinatario ?? '',
    note: cliente.note ?? '',
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/clienti" className="text-sm text-gray-500 hover:text-gray-700">
          ← Clienti
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
      </div>

      <form action={salvaCliente} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="id" value={dv.id} />

        <div className="grid grid-cols-1 gap-3">
          <Field label="Nome / Ragione sociale *" name="nome" required defaultValue={dv.nome} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Partita IVA" name="partitaIva" defaultValue={dv.partitaIva} />
            <Field label="Codice fiscale" name="codiceFiscale" defaultValue={dv.codiceFiscale} />
          </div>
          <Field label="Indirizzo" name="indirizzo" defaultValue={dv.indirizzo} />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><Field label="Città" name="citta" defaultValue={dv.citta} /></div>
            <Field label="CAP" name="cap" defaultValue={dv.cap} />
          </div>
          <Field label="Provincia" name="provincia" defaultValue={dv.provincia} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" name="email" type="email" defaultValue={dv.email} />
            <Field label="Telefono" name="telefono" defaultValue={dv.telefono} />
          </div>
          <Field label="PEC" name="pec" type="email" defaultValue={dv.pec} />
          <Field label="Codice destinatario SdI" name="codiceDestinatario" defaultValue={dv.codiceDestinatario} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Note</label>
            <textarea name="note" rows={3} defaultValue={dv.note}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Salva modifiche
          </button>
          <Link href="/impresa/clienti" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, name, type = 'text', required, defaultValue }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  )
}
