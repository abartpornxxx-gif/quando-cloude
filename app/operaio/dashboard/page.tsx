import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { formatData } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

export default async function OperaioDashboardPage() {
  const { operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assegnazioni, giornataAttiva, giornataRapportinoPendente] = await Promise.all([
    prisma.commessaOperaio.findMany({
      where: { operaioId: operaio.id },
      include: {
        commessa: {
          include: {
            cliente: { select: { nome: true } },
            giornate: {
              where: { operaioId: operaio.id },
              orderBy: { data: 'desc' },
              take: 1,
              select: { data: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, data: today, stato: 'bozza' },
      select: { id: true, fase: true, commessa: { select: { nome: true } } },
    }),
    prisma.giornata.findFirst({
      where: { operaioId: operaio.id, fase: 'fine', stato: 'bozza', rapportino: null },
      select: { id: true, data: true, commessa: { select: { nome: true } } },
      orderBy: { data: 'desc' },
    }),
  ])

  const commesseAperte = assegnazioni.filter(a => a.commessa.stato === 'aperta')
  const commesseChiuse = assegnazioni.filter(a => a.commessa.stato === 'chiusa')

  return (
    <div className="space-y-5">
      {/* Banner rapportino urgente */}
      {giornataRapportinoPendente && (
        <div className="rounded-2xl bg-red-600 text-white p-5 shadow-lg shadow-red-200">
          <p className="font-bold text-base flex items-center gap-2">
            <Image src="/immagini/icona-avviso.png" width={18} height={18} alt="" className="brightness-0 invert shrink-0" />
            Rapportino da compilare
          </p>
          <p className="text-sm mt-1 text-red-200">
            {giornataRapportinoPendente.commessa.nome}
            {' · '}
            {new Date(giornataRapportinoPendente.data).toLocaleDateString('it-IT')}
          </p>
          <a
            href={`/operaio/giornata/${giornataRapportinoPendente.id}/rapportino`}
            className="mt-4 flex items-center justify-center gap-2 w-full bg-white text-red-600 font-bold py-2.5 rounded-xl text-sm"
          >
            Compila ora →
          </a>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Ciao, {operaio.nome.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {commesseAperte.length > 0
            ? `${commesseAperte.length} cantier${commesseAperte.length === 1 ? 'e aperto' : 'i aperti'}`
            : 'Nessun cantiere assegnato'}
        </p>
      </div>

      {/* CTA principale */}
      {giornataAttiva ? (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Giornata in corso</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{giornataAttiva.commessa.nome}</p>
            </div>
            <Badge variant="success" dot>
              {giornataAttiva.fase === 'pausa' ? 'Pausa' : 'Attiva'}
            </Badge>
          </div>
          <a
            href={`/operaio/giornata/${giornataAttiva.id}/lavori`}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-white font-bold text-base shadow-sm shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            ▶ Riprendi giornata
          </a>
        </div>
      ) : (
        !giornataRapportinoPendente && (
          <Link
            href="/operaio/giornata/nuova"
            className="flex items-center gap-4 rounded-2xl bg-emerald-600 px-5 py-5 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shrink-0">
              <Image src="/immagini/icona-cantieri.png" width={32} height={32} alt="" className="brightness-0 invert" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">Inizia giornata</p>
              <p className="text-emerald-200 text-sm mt-0.5">Registra ore e materiale</p>
            </div>
          </Link>
        )
      )}

      {/* Cantieri assegnati */}
      {commesseAperte.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Image src="/immagini/vuoto-cantieri.png" width={80} height={80} alt="" className="mx-auto mb-3 opacity-80" />
          <p className="text-sm font-semibold text-gray-700">Nessun cantiere assegnato</p>
          <p className="text-xs text-gray-400 mt-1">Chiedi alla tua impresa</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Cantieri aperti</h2>
          {commesseAperte.map(a => {
            const c = a.commessa
            const ultimaGiornata = c.giornate[0]
            return (
              <div
                key={a.commessaId}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{c.nome}</p>
                    {c.cliente && <p className="text-sm text-gray-500 mt-0.5">{c.cliente.nome}</p>}
                    {c.indirizzoCantiere && (
                      <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                        <Image src="/immagini/icona-posizione.png" width={12} height={12} alt="" className="shrink-0 opacity-60" />
                        {c.indirizzoCantiere}
                      </p>
                    )}
                  </div>
                  <Badge variant="success" dot>Aperta</Badge>
                </div>
                {ultimaGiornata && (
                  <p className="mt-2.5 text-xs text-gray-400 border-t border-gray-100 pt-2">
                    Ultima giornata: {formatData(ultimaGiornata.data)}
                  </p>
                )}
              </div>
            )
          })}

          {commesseChiuse.length > 0 && (
            <>
              <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Cantieri chiusi</h2>
              {commesseChiuse.map(a => (
                <div
                  key={a.commessaId}
                  className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 opacity-60"
                >
                  <p className="font-medium text-gray-700 text-sm">{a.commessa.nome}</p>
                  {a.commessa.cliente && <p className="text-xs text-gray-500">{a.commessa.cliente.nome}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
