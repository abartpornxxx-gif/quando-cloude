// TODO: Questa route genera il file XML nel formato FatturaPA (SdI).
// NON effettua l'invio allo SdI. Il file va passato a un intermediario accreditato
// (es. Aruba, FatturAE, Namirial, commercialista) per la trasmissione ufficiale.
// Riferimento standard: Allegato A - Specifiche tecniche FatturaPA v1.3.2

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

function escXml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fmtDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

function fmtAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verifica autenticazione
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'impresa') {
    return new NextResponse('Non autorizzato', { status: 401 })
  }

  const { id } = await params

  const fattura = await prisma.fatturaAttiva.findUnique({
    where: { id },
    include: {
      cliente: true,
      righe: { orderBy: { ordine: 'asc' } },
    },
  })
  if (!fattura) return new NextResponse('Fattura non trovata', { status: 404 })

  const impresaRagSoc = process.env.IMPRESA_RAGIONE_SOCIALE ?? 'IMPRESA NON CONFIGURATA'
  const impresaPiva = process.env.IMPRESA_PARTITA_IVA ?? '00000000000'
  const impresaCap = process.env.IMPRESA_CAP ?? '00000'
  const impresaCitta = process.env.IMPRESA_CITTA ?? 'CITTA'
  const impresaProv = process.env.IMPRESA_PROVINCIA ?? 'XX'
  const impresaIndirizzo = process.env.IMPRESA_INDIRIZZO ?? 'INDIRIZZO'

  const imponibile = fattura.righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
  const ivaAmount = Math.round(imponibile * fattura.aliquotaIva / 100)
  const totale = imponibile + ivaAmount

  const codDest = fattura.cliente?.codiceDestinatario?.trim() || '0000000'
  const progressivo = `${fattura.anno}${fattura.numero.padStart(5, '0')}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica
  versione="FPR12"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 https://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escXml(impresaPiva)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${escXml(progressivo)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${escXml(codDest)}</CodiceDestinatario>
      ${fattura.cliente?.pec ? `<PECDestinatario>${escXml(fattura.cliente.pec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escXml(impresaPiva)}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${escXml(impresaRagSoc)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escXml(impresaIndirizzo)}</Indirizzo>
        <CAP>${escXml(impresaCap)}</CAP>
        <Comune>${escXml(impresaCitta)}</Comune>
        <Provincia>${escXml(impresaProv)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        ${fattura.cliente?.partitaIva
          ? `<IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${escXml(fattura.cliente.partitaIva)}</IdCodice></IdFiscaleIVA>`
          : fattura.cliente?.codiceFiscale
          ? `<CodiceFiscale>${escXml(fattura.cliente.codiceFiscale)}</CodiceFiscale>`
          : '<CodiceFiscale>CODICE NON DISPONIBILE</CodiceFiscale>'}
        <Anagrafica>
          <Denominazione>${escXml(fattura.cliente?.nome ?? 'CLIENTE')}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escXml(fattura.cliente?.indirizzo ?? 'INDIRIZZO')}</Indirizzo>
        <CAP>${escXml(fattura.cliente?.cap ?? '00000')}</CAP>
        <Comune>${escXml(fattura.cliente?.citta ?? 'CITTA')}</Comune>
        ${fattura.cliente?.provincia ? `<Provincia>${escXml(fattura.cliente.provincia)}</Provincia>` : ''}
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${fmtDate(fattura.data)}</Data>
        <Numero>${escXml(fattura.numero)}</Numero>
        <ImportoTotaleDocumento>${fmtAmount(totale)}</ImportoTotaleDocumento>
        ${fattura.note ? `<Causale>${escXml(fattura.note.slice(0, 200))}</Causale>` : ''}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${fattura.righe.map((r, i) => `      <DettaglioLinee>
        <NumeroLinea>${i + 1}</NumeroLinea>
        <Descrizione>${escXml(r.descrizione)}</Descrizione>
        <Quantita>${r.quantita.toFixed(2)}</Quantita>
        <PrezzoUnitario>${fmtAmount(r.prezzoUnitario)}</PrezzoUnitario>
        <PrezzoTotale>${fmtAmount(Math.round(r.quantita * r.prezzoUnitario))}</PrezzoTotale>
        <AliquotaIVA>${fattura.aliquotaIva.toFixed(2)}</AliquotaIVA>
      </DettaglioLinee>`).join('\n')}
      <DatiRiepilogo>
        <AliquotaIVA>${fattura.aliquotaIva.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${fmtAmount(imponibile)}</ImponibileImporto>
        <Imposta>${fmtAmount(ivaAmount)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>TP02</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>MP05</ModalitaPagamento>
        ${fattura.dataScadenza ? `<DataScadenzaPagamento>${fmtDate(fattura.dataScadenza)}</DataScadenzaPagamento>` : ''}
        <ImportoPagamento>${fmtAmount(totale)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  const filename = `FatturaPA_${fattura.anno}_${fattura.numero.replace(/\//g, '-')}.xml`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
