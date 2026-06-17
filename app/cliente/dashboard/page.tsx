import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatEuro, formatData } from '@/lib/format'

export default async function ClienteDashboardPage() {
  const { user, cliente } = await requireCliente()

  const nome = user.user_metadata?.full_name ?? user.email ?? 'Cliente'

  const [commesse, fatture] = await Promise.all([
    prisma.commessa.findMany({
      where: { clienteId: cliente.id },
      include: {
        giornate: {
          include: { foto: { take: 1, orderBy: { createdAt: 'desc' } } },
          orderBy: { data: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fatturaAttiva.findMany({
      where: { clienteId: cliente.id },
      include: { righe: true },
      orderBy: { data: 'desc' },
      take: 5,
    }),
  ])

  const commesseAperte = commesse.filter(c => c.stato === 'aperta')
  const fattureDaIncassare = fatture.filter(f => f.stato === 'da_incassare' || f.stato === 'scaduta')

  function totale(righe: { quantita: number; prezzoUnitario: number }[], iva: number) {
    const imp = righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
    return imp + Math.round(imp * iva / 100)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao, {nome.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">Portale personale QUADRO</p>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3">
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
          <p className="text-xs text-violet-600 font-medium">Cantieri attivi</p>
          <p className="text-2xl font-bold text-violet-800">{commesseAperte.length}</p>
        </div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-4">
          <p className="text-xs text-yellow-700 font-medium">Pagamenti in attesa</p>
          <p className="text-2xl font-bold text-yellow-800">{fattureDaIncassare.length}</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 font-medium">Totale cantieri</p>
          <p className="text-2xl font-bold text-gray-800">{commesse.length}</p>
        </div>
      </div>

      {/* Sezioni rapide */}
      <div className="space-y-3">
        <Link href="/cliente/lavori" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-3xl">🏗</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">I miei lavori</h3>
            <p className="text-sm text-gray-500">
              {commesseAperte.length > 0
                ? `${commesseAperte.length} cantiere${commesseAperte.length > 1 ? 'i' : ''} in corso`
                : commesse.length > 0 ? 'Tutti i cantieri completati' : 'Nessun cantiere'}
            </p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>

        <Link href="/cliente/pagamenti" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-3xl">💳</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Pagamenti</h3>
            <p className="text-sm text-gray-500">
              {fattureDaIncassare.length > 0
                ? `${fattureDaIncassare.length} fattura${fattureDaIncassare.length > 1 ? 'e' : ''} in attesa · ${formatEuro(fattureDaIncassare.reduce((acc, f) => acc + totale(f.righe, f.aliquotaIva), 0))}`
                : fatture.length > 0 ? 'Tutto in regola ✓' : 'Nessuna fattura'}
            </p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>

        <Link href="/cliente/documenti" className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-3xl">📄</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Documenti</h3>
            <p className="text-sm text-gray-500">Fatture, Dichiarazioni di Conformità</p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </Link>
      </div>

      {/* Ultima attività */}
      {commesse.length > 0 && commesse[0].giornate[0]?.foto[0] && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Ultima foto dal cantiere</h2>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <img
              src={commesse[0].giornate[0].foto[0].url}
              alt="Ultima foto cantiere"
              className="w-full object-cover max-h-48"
            />
            <p className="text-xs text-gray-500 px-3 py-2">
              {commesse[0].nome} · {formatData(commesse[0].giornate[0].data)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
