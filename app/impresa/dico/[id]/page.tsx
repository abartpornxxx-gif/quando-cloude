import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import { eliminaDico } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiCoDetailPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params

  const dico = await prisma.dichiarazioneConformita.findUnique({
    where: { id },
    include: { commessa: { select: { id: true, nome: true } } },
  })
  if (!dico) notFound()

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/impresa/dico" className="text-blue-600 hover:text-blue-800 text-sm">‹ DiCo</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Dichiarazione di Conformità</h1>
        <Link
          href={`/impresa/dico/${dico.id}/stampa`}
          target="_blank"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          🖨 Stampa / PDF
        </Link>
      </div>

      {dico.commessa && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm">
          Commessa collegata:{' '}
          <Link href={`/impresa/commesse/${dico.commessa.id}`} className="font-semibold text-blue-700 hover:underline">
            {dico.commessa.nome}
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y text-sm">
        <Section title="Impresa installatrice">
          <Row label="Ragione sociale" value={dico.ragioneSociale} />
          <Row label="Partita IVA" value={dico.partitaIva} />
          <Row label="Indirizzo" value={dico.indirizzoImpresa} />
        </Section>
        <Section title="Committente">
          <Row label="Nome / Ragione sociale" value={dico.committenteNome} />
          <Row label="Indirizzo" value={dico.committenteIndirizzo} />
          <Row label="Codice fiscale" value={dico.committenteCodiceFisc} />
        </Section>
        <Section title="Impianto">
          <Row label="Indirizzo impianto" value={dico.indirizzoImpianto} />
          <Row label="Tipo impianto" value={dico.tipoImpianto} />
          <Row label="Tipologia lavori" value={dico.tipologiaLavori} />
          <Row label="Potenza impegnata" value={dico.potenzaImpegnata} />
        </Section>
        <Section title="Lavori e materiali">
          <Row label="Descrizione lavori" value={dico.descrizioneLavori} />
          <Row label="Materiali e componenti" value={dico.materialiComponenti} />
          <Row label="Normativa" value={dico.normativa} />
        </Section>
        <Section title="Tecnico responsabile">
          <Row label="Nome" value={dico.tecnicoNome} />
          <Row label="Abilitazione" value={dico.tecnicoAbilitazione} />
          <Row label="Data dichiarazione" value={formatData(dico.data)} />
        </Section>
      </div>

      <form action={eliminaDico.bind(null, dico.id)}>
        <button
          type="submit"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Elimina
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-4">
      <p className="text-gray-500 text-xs w-36 shrink-0 pt-0.5">{label}</p>
      <p className="text-gray-900 flex-1">{value}</p>
    </div>
  )
}
