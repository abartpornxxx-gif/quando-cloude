import { salvaCliente } from '../actions'
import Link from 'next/link'

export default function NuovoClientePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/clienti" className="text-sm text-gray-500 hover:text-gray-700">
          ← Clienti
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuovo cliente</h1>
      </div>
      <ClienteForm action={salvaCliente} />
    </div>
  )
}

function ClienteForm({ action, defaultValues }: { action: (fd: FormData) => Promise<void>; defaultValues?: Record<string, string> }) {
  return (
    <form action={action} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <Section title="Dati anagrafici">
        <Field label="Nome / Ragione sociale *" name="nome" required defaultValue={defaultValues?.nome} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partita IVA" name="partitaIva" defaultValue={defaultValues?.partitaIva} />
          <Field label="Codice fiscale" name="codiceFiscale" defaultValue={defaultValues?.codiceFiscale} />
        </div>
      </Section>

      <Section title="Indirizzo">
        <Field label="Indirizzo" name="indirizzo" defaultValue={defaultValues?.indirizzo} />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Città" name="citta" defaultValue={defaultValues?.citta} />
          </div>
          <Field label="CAP" name="cap" defaultValue={defaultValues?.cap} />
        </div>
        <Field label="Provincia (es. MI)" name="provincia" defaultValue={defaultValues?.provincia} />
      </Section>

      <Section title="Contatti">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" defaultValue={defaultValues?.email} />
          <Field label="Telefono" name="telefono" defaultValue={defaultValues?.telefono} />
        </div>
        <Field label="PEC" name="pec" type="email" defaultValue={defaultValues?.pec} />
      </Section>

      <Section title="Fatturazione elettronica (SdI)">
        <Field
          label="Codice destinatario"
          name="codiceDestinatario"
          defaultValue={defaultValues?.codiceDestinatario}
          hint="7 caratteri alfanumerici per la fattura elettronica"
        />
      </Section>

      <Section title="Note">
        <div>
          <label className="block text-sm font-medium text-gray-700">Note interne</label>
          <textarea
            name="note"
            rows={3}
            defaultValue={defaultValues?.note}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Salva cliente
        </button>
        <Link
          href="/impresa/clienti"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annulla
        </Link>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label, name, type = 'text', required, defaultValue, hint,
}: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export { ClienteForm }
