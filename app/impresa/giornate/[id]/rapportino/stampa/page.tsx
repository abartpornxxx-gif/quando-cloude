import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatData, formatEuro } from '@/lib/format'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RapportinoStampaPage({ params }: Props) {
  await requireImpresa()
  const { id } = await params

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: {
        select: {
          nome: true,
          indirizzoCantiere: true,
          cliente: { select: { nome: true, indirizzo: true, citta: true } },
        },
      },
      operaio: { select: { nome: true, costoOrario: true } },
      mezzo: { select: { nome: true, targa: true } },
      ore: true,
      foto: { orderBy: { createdAt: 'asc' }, take: 6 },
      attrezzatureUsi: {
        include: { attrezzatura: { select: { nome: true } } },
      },
      rapportino: true,
    },
  })

  if (!giornata || !giornata.rapportino) notFound()

  const r = giornata.rapportino
  const oreOrd = giornata.ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0)
  const oreStr = giornata.ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0)
  const costoOrario = giornata.operaio.costoOrario
  const costoManodopera = Math.round(oreOrd * costoOrario + oreStr * costoOrario * 1.5)

  const impresaNome = process.env.IMPRESA_RAGIONE_SOCIALE ?? ''
  const impresaPiva = process.env.IMPRESA_PARTITA_IVA ?? ''
  const impresaIndirizzo = [
    process.env.IMPRESA_INDIRIZZO,
    process.env.IMPRESA_CAP,
    process.env.IMPRESA_CITTA,
    process.env.IMPRESA_PROVINCIA ? `(${process.env.IMPRESA_PROVINCIA})` : '',
  ].filter(Boolean).join(' ')

  function fmt(dt: Date | null) {
    if (!dt) return '—'
    return dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '15mm 18mm', fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#111', lineHeight: 1.5 }}>
      <style>{`
        @media print {
          nav, header, footer, [data-no-print] { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          @page { margin: 12mm 15mm; }
        }
        .no-print { display: flex; }
        @media print { .no-print { display: none !important; } }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 6px 10px; border: 1px solid #d1d5db; vertical-align: top; }
        th { background: #f3f4f6; font-weight: 600; text-align: left; }
        .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; margin: 18px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .firma-box { border: 1px solid #9ca3af; border-radius: 4px; min-height: 60px; padding: 8px 12px; }
        .foto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .foto-grid img { width: 100%; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb; }
      `}</style>

      {/* Barra azioni — non stampata */}
      <div className="no-print" data-no-print style={{ marginBottom: '20px', gap: '12px', alignItems: 'center' }}>
        <PrintButton />
        <a href={`/impresa/giornate/${id}/rapportino`} style={{ color: '#2563eb', fontSize: '13px' }}>
          ‹ Torna al dettaglio
        </a>
      </div>

      {/* Intestazione impresa */}
      {impresaNome && (
        <div style={{ borderBottom: '2px solid #1d4ed8', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14pt', fontWeight: 700, color: '#1d4ed8', margin: 0 }}>{impresaNome}</p>
              {impresaPiva && <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0 0' }}>P.IVA {impresaPiva}</p>}
              {impresaIndirizzo && <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0 0' }}>{impresaIndirizzo}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '13pt', fontWeight: 700, margin: 0 }}>RAPPORTINO DI GIORNATA</p>
              <p style={{ fontSize: '10pt', color: '#6b7280', margin: '2px 0 0' }}>Data: {formatData(giornata.data)}</p>
            </div>
          </div>
        </div>
      )}

      {!impresaNome && (
        <div style={{ textAlign: 'right', marginBottom: '16px', borderBottom: '2px solid #1d4ed8', paddingBottom: '12px' }}>
          <p style={{ fontSize: '14pt', fontWeight: 700, margin: 0 }}>RAPPORTINO DI GIORNATA</p>
          <p style={{ fontSize: '10pt', color: '#6b7280' }}>Data: {formatData(giornata.data)}</p>
        </div>
      )}

      {/* Dati cantiere / cliente */}
      <p className="section-title">Cantiere e operaio</p>
      <table>
        <tbody>
          <tr>
            <th style={{ width: '28%' }}>Cantiere</th>
            <td>{giornata.commessa.nome}</td>
          </tr>
          {giornata.commessa.indirizzoCantiere && (
            <tr>
              <th>Indirizzo cantiere</th>
              <td>{giornata.commessa.indirizzoCantiere}</td>
            </tr>
          )}
          {giornata.commessa.cliente && (
            <tr>
              <th>Cliente</th>
              <td>
                {giornata.commessa.cliente.nome}
                {giornata.commessa.cliente.indirizzo && ` — ${giornata.commessa.cliente.indirizzo}`}
              </td>
            </tr>
          )}
          <tr>
            <th>Operaio</th>
            <td>{giornata.operaio.nome}</td>
          </tr>
          {giornata.mezzo && (
            <tr>
              <th>Mezzo</th>
              <td>{giornata.mezzo.nome}{giornata.mezzo.targa ? ` (${giornata.mezzo.targa})` : ''}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Orari */}
      {(giornata.inizioMattina || giornata.inizioPomeriggio) && (
        <>
          <p className="section-title">Orari di lavoro</p>
          <table>
            <tbody>
              {giornata.inizioMattina && (
                <tr>
                  <th style={{ width: '28%' }}>Inizio mattina</th>
                  <td>{fmt(giornata.inizioMattina)}</td>
                </tr>
              )}
              {giornata.fineMattina && (
                <tr>
                  <th>Fine mattina / pausa</th>
                  <td>{fmt(giornata.fineMattina)}</td>
                </tr>
              )}
              {giornata.inizioPomeriggio && (
                <tr>
                  <th>Ripresa pomeriggio</th>
                  <td>{fmt(giornata.inizioPomeriggio)}</td>
                </tr>
              )}
              {giornata.finePomeriggio && (
                <tr>
                  <th>Fine pomeriggio</th>
                  <td>{fmt(giornata.finePomeriggio)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {/* Ore */}
      <p className="section-title">Ore lavorate</p>
      <table>
        <tbody>
          <tr>
            <th style={{ width: '28%' }}>Ore ordinarie</th>
            <td style={{ fontWeight: 600 }}>{r.oreOrdinarie > 0 ? `${r.oreOrdinarie}h` : '—'}</td>
          </tr>
          {r.oreStraordinarie > 0 && (
            <tr>
              <th>Ore straordinarie</th>
              <td style={{ fontWeight: 600, color: '#d97706' }}>{r.oreStraordinarie}h</td>
            </tr>
          )}
          <tr>
            <th>Costo manodopera</th>
            <td style={{ fontWeight: 600 }}>{formatEuro(costoManodopera)}</td>
          </tr>
        </tbody>
      </table>

      {/* Lavori */}
      <p className="section-title">Descrizione lavori</p>
      <table>
        <tbody>
          <tr>
            <th style={{ width: '28%' }}>Lavoro eseguito</th>
            <td style={{ whiteSpace: 'pre-wrap' }}>{r.lavoroEseguito}</td>
          </tr>
          {r.lavoriExtra && (
            <tr>
              <th>Lavori extra / imprevisti</th>
              <td style={{ whiteSpace: 'pre-wrap' }}>{r.lavoriExtra}</td>
            </tr>
          )}
          {r.noteAttrezzatura && (
            <tr>
              <th>Note attrezzatura</th>
              <td style={{ whiteSpace: 'pre-wrap' }}>{r.noteAttrezzatura}</td>
            </tr>
          )}
          {r.noteGiornoSuccessivo && (
            <tr>
              <th>Note giorno successivo</th>
              <td style={{ whiteSpace: 'pre-wrap' }}>{r.noteGiornoSuccessivo}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Attrezzature */}
      {giornata.attrezzatureUsi.length > 0 && (
        <>
          <p className="section-title">Attrezzature</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {giornata.attrezzatureUsi.map(u => (
                <tr key={u.id}>
                  <td>{u.attrezzatura.nome}</td>
                  <td>{u.riconsegnata ? 'Riconsegnata' : 'Non riconsegnata'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Foto */}
      {giornata.foto.length > 0 && (
        <>
          <p className="section-title">Foto cantiere</p>
          <div className="foto-grid">
            {giornata.foto.map(f => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.url} alt="Foto cantiere" />
            ))}
          </div>
        </>
      )}

      {/* Firme */}
      <p className="section-title" style={{ marginTop: '28px' }}>Firme</p>
      <table>
        <tbody>
          <tr>
            <td style={{ width: '50%', minHeight: '70px', padding: '10px 14px' }}>
              <p style={{ fontSize: '9pt', color: '#6b7280', marginBottom: '8px' }}>Firma operaio: {giornata.operaio.nome}</p>
              <div style={{ borderBottom: '1px solid #6b7280', minHeight: '40px' }} />
            </td>
            <td style={{ width: '50%', minHeight: '70px', padding: '10px 14px' }}>
              <p style={{ fontSize: '9pt', color: '#6b7280', marginBottom: '8px' }}>
                Firma cliente{giornata.commessa.cliente ? `: ${giornata.commessa.cliente.nome}` : ''}
              </p>
              <div style={{ borderBottom: '1px solid #6b7280', minHeight: '40px' }} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '8px', fontSize: '8pt', color: '#9ca3af', textAlign: 'center' }}>
        Rapportino generato il {new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        {impresaNome ? ` — ${impresaNome}` : ''}
      </div>
    </div>
  )
}
