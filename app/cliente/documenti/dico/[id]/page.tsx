import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData } from '@/lib/format'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClienteDiCoPage({ params }: Props) {
  const { cliente } = await requireCliente()
  const { id } = await params

  const dico = await prisma.dichiarazioneConformita.findUnique({
    where: { id },
    include: { commessa: { select: { id: true, nome: true, clienteId: true } } },
  })

  // Verifica proprietà — la DiCo deve essere collegata a una commessa del cliente
  if (!dico) notFound()
  if (dico.commessa?.clienteId !== cliente.id) notFound()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          nav { display: none !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Toolbar — nascosta in stampa */}
        <div className="no-print flex items-center gap-3">
          <Link href="/cliente/documenti" className="text-violet-600 hover:text-violet-800 text-sm">
            ‹ Documenti
          </Link>
          <PrintButton />
        </div>

        {/* DiCo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5 text-sm">
          <div className="border-b pb-4">
            <h1 className="text-lg font-bold">DICHIARAZIONE DI CONFORMITÀ</h1>
            <p className="text-xs text-gray-500">ai sensi del D.M. 22 gennaio 2008 n. 37 — art. 7 comma 1</p>
          </div>

          <Section title="Impresa installatrice">
            <Row label="Ragione sociale" value={dico.ragioneSociale} />
            <Row label="P.IVA" value={dico.partitaIva} />
            <Row label="Sede" value={dico.indirizzoImpresa} />
          </Section>

          <Section title="Committente">
            <Row label="Nome" value={dico.committenteNome} />
            <Row label="Indirizzo" value={dico.committenteIndirizzo} />
            <Row label="Codice fiscale" value={dico.committenteCodiceFisc} />
          </Section>

          <Section title="Impianto">
            <Row label="Ubicazione" value={dico.indirizzoImpianto} />
            <Row label="Tipo impianto" value={dico.tipoImpianto} />
            <Row label="Tipologia lavori" value={dico.tipologiaLavori} />
            <Row label="Potenza impegnata" value={dico.potenzaImpegnata} />
          </Section>

          <Section title="Lavori eseguiti">
            <div className="text-gray-800 whitespace-pre-wrap">{dico.descrizioneLavori}</div>
            {dico.materialiComponenti && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Materiali e componenti:</p>
                <p className="whitespace-pre-wrap text-gray-700">{dico.materialiComponenti}</p>
              </div>
            )}
          </Section>

          <Section title="Normativa di riferimento">
            <p className="text-gray-700">{dico.normativa}</p>
          </Section>

          <Section title="Tecnico responsabile">
            <Row label="Nome" value={dico.tecnicoNome} />
            <Row label="Abilitazione" value={dico.tecnicoAbilitazione} />
            <Row label="Data" value={formatData(dico.data)} />
          </Section>

          {/* Dichiarazione */}
          <div className="border border-gray-200 rounded-lg p-4 text-xs text-gray-700">
            Il sottoscritto <strong>{dico.tecnicoNome}</strong>
            {dico.tecnicoAbilitazione ? `, abilitato ai sensi del D.M. 37/2008 (n. ${dico.tecnicoAbilitazione})` : ''},
            dichiara che i lavori sopra descritti sono stati eseguiti a regola d&apos;arte,
            nel rispetto delle norme tecniche vigenti e della normativa sulla sicurezza.
          </div>

          <div className="border-t pt-4 text-xs text-gray-400">
            Documento generato da QUADRO · Rif. D.M. 37/2008 art. 7 · CEI 64-8
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-1 pl-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-32 shrink-0">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
