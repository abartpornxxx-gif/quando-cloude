import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DomaniPage() {
  const { operaio } = await requireOperaio()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59)

  const pianificazioni = await prisma.pianificazione.findMany({
    where: {
      operaioId: operaio.id,
      sostituito: false,
      data: { gte: tomorrow, lte: tomorrowEnd },
    },
    include: {
      commessa: {
        select: {
          nome: true,
          indirizzoCantiere: true,
          note: true,
          operai: {
            include: { operaio: { select: { nome: true } } },
          },
        },
      },
      mezzo: { select: { nome: true, targa: true } },
    },
  })

  const dataLabel = tomorrow.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-5">
      <div>
        <Link href="/operaio/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          ← Cantieri
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900 capitalize">{dataLabel}</h1>
        <p className="text-sm text-gray-500">Il tuo programma per domani</p>
      </div>

      {pianificazioni.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">🏖️</div>
          <p className="text-base font-medium text-gray-700">Nessun incarico pianificato per domani</p>
          <p className="mt-1 text-sm text-gray-400">Se hai dubbi contatta l&apos;ufficio</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pianificazioni.map(p => {
            const altriOperai = p.commessa.operai
              .filter(co => co.operaioId !== operaio.id)
              .map(co => co.operaio.nome)

            return (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Header cantiere */}
                <div className="bg-emerald-700 px-4 py-3">
                  <h2 className="font-bold text-white">{p.commessa.nome}</h2>
                  {p.commessa.indirizzoCantiere && (
                    <p className="mt-0.5 text-sm text-emerald-200">{p.commessa.indirizzoCantiere}</p>
                  )}
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Mezzo */}
                  {p.mezzo ? (
                    <Row
                      label="Mezzo"
                      value={`${p.mezzo.nome}${p.mezzo.targa ? ` (${p.mezzo.targa})` : ''}`}
                    />
                  ) : (
                    <Row label="Mezzo" value="Non assegnato" dim />
                  )}

                  {/* Squadra */}
                  {altriOperai.length > 0 && (
                    <Row label="Con te" value={altriOperai.join(', ')} />
                  )}

                  {/* Lavoro assegnato e note cantiere */}
                  {p.lavoroDaFare && <Row label="Lavoro" value={p.lavoroDaFare} />}
                  {p.commessa.note && <Row label="Note cantiere" value={p.commessa.note} />}
                </div>

                {/* CTA */}
                <div className="bg-gray-50 px-4 py-3">
                  <Link
                    href={`/operaio/giornata/nuova`}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    ➕ Registra giornata
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right ${dim ? 'text-gray-400 italic' : 'font-medium text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}
