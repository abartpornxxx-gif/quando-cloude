import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatData } from '@/lib/format'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiCoStampaPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params

  const dico = await prisma.dichiarazioneConformita.findUnique({
    where: { id },
    include: { commessa: { select: { nome: true } } },
  })
  if (!dico) notFound()

  return (
    <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm 20mm' }}>
      {/* Nasconde la navbar impresa e i footer quando si stampa */}
      <style>{`
        @media print {
          nav, header, footer, [data-no-print] { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      {/* Pulsante stampa — nascosto in stampa */}
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <PrintButton />
        <a
          href={`/impresa/dico/${id}`}
          style={{ color: '#2563eb', fontSize: '13px', lineHeight: '36px' }}
        >
          ‹ Torna al dettaglio
        </a>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0 }}>
          DICHIARAZIONE DI CONFORMITÀ
        </h1>
        <p style={{ fontSize: '10pt', margin: '4px 0 0', color: '#444' }}>
          ai sensi del D.M. 22 gennaio 2008 n. 37 — art. 7 comma 1
        </p>
      </div>

      {/* Impresa */}
      <Section title="IMPRESA INSTALLATRICE">
        <Row label="Ragione sociale" value={dico.ragioneSociale} />
        <Row label="P.IVA" value={dico.partitaIva} />
        <Row label="Sede" value={dico.indirizzoImpresa} />
      </Section>

      {/* Committente */}
      <Section title="COMMITTENTE">
        <Row label="Nome / Rag. soc." value={dico.committenteNome} />
        <Row label="Indirizzo" value={dico.committenteIndirizzo} />
        <Row label="Codice fiscale" value={dico.committenteCodiceFisc} />
      </Section>

      {/* Impianto */}
      <Section title="IMPIANTO">
        <Row label="Ubicazione" value={dico.indirizzoImpianto} />
        <Row label="Tipo impianto" value={dico.tipoImpianto} />
        <Row label="Tipologia lavori" value={dico.tipologiaLavori} />
        <Row label="Potenza impegnata" value={dico.potenzaImpegnata} />
      </Section>

      {/* Lavori */}
      <Section title="LAVORI ESEGUITI">
        <div style={{ marginBottom: '6px' }}>
          <p style={{ fontSize: '9pt', color: '#555', marginBottom: '2px' }}>Descrizione:</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{dico.descrizioneLavori}</p>
        </div>
        {dico.materialiComponenti && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '9pt', color: '#555', marginBottom: '2px' }}>Materiali e componenti:</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{dico.materialiComponenti}</p>
          </div>
        )}
      </Section>

      {/* Normativa */}
      <Section title="NORMATIVA DI RIFERIMENTO">
        <p>{dico.normativa}</p>
      </Section>

      {/* Dichiarazione */}
      <div style={{ border: '1px solid #000', padding: '10px', marginBottom: '16px', fontSize: '10pt' }}>
        <p style={{ margin: 0 }}>
          Il sottoscritto <strong>{dico.tecnicoNome}</strong>
          {dico.tecnicoAbilitazione ? `, abilitato ai sensi del D.M. 37/2008 (n. iscrizione/abilitazione: ${dico.tecnicoAbilitazione})` : ''},
          in qualità di responsabile tecnico dell&apos;impresa installatrice,{' '}
          <strong>dichiara che i lavori sopra descritti sono stati eseguiti a regola d&apos;arte,
          nel rispetto delle norme tecniche vigenti e della normativa sulla sicurezza.</strong>
        </p>
      </div>

      {/* Firma */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '9pt', color: '#555' }}>Luogo e data</p>
          <p style={{ borderBottom: '1px solid #000', paddingBottom: '2px', minHeight: '20px' }}>
            ______________, {formatData(dico.data)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: '9pt', color: '#555' }}>Firma del responsabile tecnico</p>
          <p style={{ borderBottom: '1px solid #000', paddingBottom: '2px', minHeight: '20px' }}>&nbsp;</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div>
          <p style={{ fontSize: '9pt', color: '#555' }}>Timbro dell&apos;impresa</p>
          <div style={{ border: '1px dashed #999', height: '60px' }}></div>
        </div>
        <div>
          <p style={{ fontSize: '9pt', color: '#555' }}>Firma del committente (per presa visione)</p>
          <p style={{ borderBottom: '1px solid #000', paddingBottom: '2px', minHeight: '20px', marginTop: '40px' }}>&nbsp;</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: '20px', paddingTop: '8px', fontSize: '8pt', color: '#666' }}>
        <p style={{ margin: 0 }}>
          Documento generato da QUADRO · Rif. normativo: D.M. 37/2008 art. 7 comma 1 · CEI 64-8
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ background: '#eee', padding: '3px 6px', fontWeight: 'bold', fontSize: '9pt', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ paddingLeft: '8px' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '2px', fontSize: '10pt' }}>
      <span style={{ color: '#555', width: '140px', flexShrink: 0 }}>{label}:</span>
      <span>{value}</span>
    </div>
  )
}
