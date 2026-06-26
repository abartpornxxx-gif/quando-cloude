import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { formatData, formatEuro } from '@/lib/format'

export default async function ClienteDocumentiPage() {
  const { cliente } = await requireCliente()

  // Prende tutte le commesse del cliente per filtrarci DiCo
  const commesse = await prisma.commessa.findMany({
    where: { clienteId: cliente.id },
    select: { id: true, nome: true },
  })
  const commessaIds = commesse.map(c => c.id)

  const [fatture, richiesteDiCo] = await Promise.all([
    prisma.fatturaAttiva.findMany({
      where: { clienteId: cliente.id },
      include: { righe: true },
      orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
    }),
    prisma.richiestaDiCo.findMany({
      where: { clienteId: cliente.id },
      include: { commessa: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
    })
  ])

  function totale(righe: { quantita: number; prezzoUnitario: number }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round(imp * iva / 100)
  }

  const haDocumenti = fatture.length > 0 || richiesteDiCo.length > 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documenti</h1>

      {!haDocumenti && (
        <div className="text-center py-16">
          <Image src="/immagini/vuoto-documenti.png" width={80} height={80} alt="" className="mx-auto mb-4 opacity-70" />
          <p className="text-gray-400 text-sm">Nessun documento disponibile ancora.</p>
        </div>
      )}

      {/* Fatture */}
      {fatture.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Fatture</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {fatture.map(f => (
              <Link
                key={f.id}
                href={`/cliente/documenti/fattura/${f.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Image src="/immagini/icona-finanza.png" width={28} height={28} alt="" className="opacity-80" />
                  <div>
                    <p className="font-semibold text-sm">
                      Fattura n. {f.numero}/{f.anno}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatData(f.data)} · {formatEuro(totale(f.righe, f.aliquotaIva))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${f.stato === 'incassata' ? 'bg-green-100 text-green-800' : f.stato === 'scaduta' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {f.stato === 'incassata' ? 'Pagata' : f.stato === 'scaduta' ? 'Scaduta' : 'In attesa'}
                  </span>
                  <span className="text-violet-600 text-xs font-medium">Visualizza →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dichiarazioni di Conformità - Richiesta */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Dichiarazioni di Conformità (Di.Co.)</h2>
          <Link
            href="/cliente/documenti/richiedi-dico"
            className="text-xs font-semibold bg-violet-100 text-violet-800 hover:bg-violet-200 px-3 py-1.5 rounded-full transition-colors"
          >
            + Richiedi Di.Co.
          </Link>
        </div>
        
        {richiesteDiCo.length === 0 ? (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 text-center">
            <h3 className="text-sm font-bold text-violet-900 mb-1">Hai bisogno della Di.Co.?</h3>
            <p className="text-xs text-violet-700 max-w-sm mx-auto mb-3">
              Richiedi la Dichiarazione di Conformità ufficiale all'impresa per uno dei tuoi cantieri completati.
            </p>
            <Link
              href="/cliente/documenti/richiedi-dico"
              className="inline-block bg-violet-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
            >
              Richiedi ora →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {richiesteDiCo.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Image src="/immagini/icona-rapportino.png" width={28} height={28} alt="" className="opacity-80" />
                  <div>
                    <p className="font-semibold text-sm">
                      Richiesta per: {r.commessa?.nome ?? 'Cantiere generico'}
                    </p>
                    <p className="text-xs text-gray-400">Data richiesta: {formatData(r.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${r.evasa ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {r.evasa ? 'Evasa (Controlla Email)' : 'In elaborazione'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
