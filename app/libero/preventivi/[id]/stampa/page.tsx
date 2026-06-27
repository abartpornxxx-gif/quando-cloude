import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PrintButton } from './PrintButton'

function fmtEuro(c: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c / 100)
}

export default async function StampaPreventivoLiberoPage({ params }: { params: Promise<{ id: string }> }) {
  const { libero } = await requireLibero()
  const { id } = await params

  const prev = await prisma.preventivo.findFirst({
    where: { id },
    include: {
      cliente: true,
      righe: { orderBy: { ordine: 'asc' } },
    },
  })
  if (!prev) notFound()

  const totale = prev.righe.reduce((s, r) => s + r.prezzoUnitario * r.quantita, 0)
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 15mm 20mm; }
        }
      `}</style>

      <div className="no-print bg-orange-800 text-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Anteprima preventivo PDF</span>
        <div className="flex items-center gap-3">
          <a href={`/libero/preventivi/${id}`}
            className="text-sm text-orange-200 hover:text-white transition-colors">← Torna al preventivo</a>
          <PrintButton />
        </div>
      </div>

      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '20mm', fontFamily: 'Arial, sans-serif' }}>
        {/* Intestazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20mm' }}>
          <div>
            {libero.logoUrl && (
              <img src={libero.logoUrl} alt="Logo" style={{ height: '60px', marginBottom: '8px' }} />
            )}
            <p style={{ fontWeight: 'bold', fontSize: '18px' }}>{libero.nome}</p>
            {libero.partitaIva && <p style={{ fontSize: '12px', color: '#555' }}>P.IVA: {libero.partitaIva}</p>}
            {libero.indirizzo && <p style={{ fontSize: '12px', color: '#555' }}>{libero.indirizzo}</p>}
            {libero.telefono && <p style={{ fontSize: '12px', color: '#555' }}>{libero.telefono}</p>}
            {libero.email && <p style={{ fontSize: '12px', color: '#555' }}>{libero.email}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>PREVENTIVO</p>
            <p style={{ fontSize: '12px', color: '#888' }}>Data: {oggi}</p>
          </div>
        </div>

        {prev.cliente && (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px 16px', marginBottom: '12mm', backgroundColor: '#f9f9f9' }}>
            <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>DESTINATARIO</p>
            <p style={{ fontWeight: 'bold', fontSize: '14px' }}>{prev.cliente.nome}</p>
            {prev.cliente.indirizzo && <p style={{ fontSize: '12px', color: '#555' }}>{prev.cliente.indirizzo}</p>}
            {prev.cliente.partitaIva && <p style={{ fontSize: '12px', color: '#555' }}>P.IVA: {prev.cliente.partitaIva}</p>}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm' }}>
          <thead>
            <tr style={{ backgroundColor: '#333', color: 'white' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '11px' }}>DESCRIZIONE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '11px' }}>Q.TÀ</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '11px' }}>PREZZO UNIT.</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '11px' }}>TOTALE</th>
            </tr>
          </thead>
          <tbody>
            {prev.righe.map((r, i) => {
              const riga = r.prezzoUnitario * r.quantita
              return (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f7f7f7', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 10px', fontSize: '12px' }}>{r.descrizione}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: '12px' }}>{r.quantita}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: '12px' }}>{fmtEuro(r.prezzoUnitario)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', fontSize: '12px', fontWeight: 'bold' }}>{fmtEuro(riga)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#333', color: 'white' }}>
              <td colSpan={3} style={{ textAlign: 'right', padding: '10px', fontSize: '14px', fontWeight: 'bold' }}>TOTALE IMPONIBILE</td>
              <td style={{ textAlign: 'right', padding: '10px', fontSize: '16px', fontWeight: 'bold' }}>{fmtEuro(totale)}</td>
            </tr>
          </tfoot>
        </table>

        <p style={{ fontSize: '10px', color: '#888', marginBottom: '12mm' }}>IVA da applicare in fattura secondo regime fiscale applicabile.</p>

        {prev.note && (
          <div style={{ border: '1px solid #eee', borderRadius: '6px', padding: '10px 14px', fontSize: '11px', color: '#666', marginBottom: '12mm' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Note e condizioni:</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{prev.note}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20mm' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '180px', borderBottom: '1px solid #999', marginBottom: '6px', height: '40px' }} />
            <p style={{ fontSize: '11px', color: '#666' }}>{libero.nome}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
