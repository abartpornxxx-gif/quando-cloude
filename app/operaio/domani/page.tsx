import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MeteoBox } from '@/components/operaio/MeteoBox'
import { PuntiUtili } from '@/components/operaio/PuntiUtili'

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
          istruzioniCantiere: true,
          attrezzatureNecessarie: true,
          note: true,
          cliente: { select: { nome: true } },
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
          â† Cantieri
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900 capitalize">{dataLabel}</h1>
        <p className="text-sm text-gray-500">Il tuo programma per domani</p>
      </div>

      {pianificazioni.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="text-4xl mb-3">ðŸ–ï¸</div>
          <p className="text-base font-medium text-gray-700">Nessun incarico pianificato per domani</p>
          <p className="mt-1 text-sm text-gray-400">Se hai dubbi contatta l&apos;ufficio</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pianificazioni.map(p => {
            const altriOperai = p.commessa.operai
              .filter(co => co.operaioId !== operaio.id)
              .map(co => co.operaio.nome)

            return (
              <div key={p.id} className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
                {/* Header cantiere */}
                <div className="bg-emerald-800 px-4 py-4">
                  <h2 className="font-bold text-white text-lg leading-tight">{p.commessa.nome}</h2>
                  {p.commessa.cliente && (
                    <p className="text-sm text-emerald-300 mt-0.5">{p.commessa.cliente.nome}</p>
                  )}
                  {p.commessa.indirizzoCantiere ? (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-emerald-200">{p.commessa.indirizzoCantiere}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.commessa.indirizzoCantiere)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30 active:scale-95 transition-all shrink-0"
                      >
                        ðŸ—º Apri Maps
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-400 italic mt-1">Posizione non disponibile</p>
                  )}
                </div>

                <div className="divide-y divide-gray-100">
                  {/* Mezzo */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Mezzo</p>
                    {p.mezzo ? (
                      <p className="text-sm font-medium text-gray-900">
                        ðŸš— {p.mezzo.nome}{p.mezzo.targa ? ` (${p.mezzo.targa})` : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Non assegnato</p>
                    )}
                  </div>

                  {/* Squadra */}
                  {altriOperai.length > 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Con te</p>
                      <p className="text-sm font-medium text-gray-900">
                        ðŸ‘· {altriOperai.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Stima ore */}
                  {p.stimaImpresaOre && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Ore previste</p>
                      <p className="text-sm font-medium text-gray-900">â± {p.stimaImpresaOre}h</p>
                    </div>
                  )}

                  {/* Lavoro assegnato */}
                  {p.lavoroDaFare && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Lavoro da fare</p>
                      <p className="text-sm font-medium text-gray-900 whitespace-pre-line">{p.lavoroDaFare}</p>
                    </div>
                  )}

                  {/* Note materiale */}
                  {p.noteMateriale && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">ðŸ“¦ Materiale da preparare</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{p.noteMateriale}</p>
                    </div>
                  )}

                  {/* Attrezzatura necessaria */}
                  {p.commessa.attrezzatureNecessarie && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">ðŸ”§ Porta con te</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{p.commessa.attrezzatureNecessarie}</p>
                    </div>
                  )}

                  {/* Istruzioni cantiere */}
                  {p.commessa.istruzioniCantiere && (
                    <details className="group">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">ðŸ“‹ Istruzioni cantiere</p>
                          <p className="text-sm font-medium text-gray-700 line-clamp-1">
                            {p.commessa.istruzioniCantiere}
                          </p>
                        </div>
                        <span className="text-gray-400 text-sm shrink-0 ml-2 group-open:rotate-180 transition-transform">â–¼</span>
                      </summary>
                      <div className="px-4 pb-4 pt-1">
                        <p className="text-sm text-gray-700 whitespace-pre-line bg-amber-50 border border-amber-200 rounded-xl p-3">
                          {p.commessa.istruzioniCantiere}
                        </p>
                      </div>
                    </details>
                  )}

                  {/* Note cantiere */}
                  {p.commessa.note && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 mb-0.5">Note cantiere</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{p.commessa.note}</p>
                    </div>
                  )}

                  {/* Meteo */}
                  <div className="px-4 py-3">
                    <MeteoBox indirizzo={p.commessa.indirizzoCantiere} />
                  </div>

                  {/* Punti utili */}
                  {p.commessa.indirizzoCantiere && (
                    <div className="px-4 py-3">
                      <PuntiUtili indirizzo={p.commessa.indirizzoCantiere} />
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="bg-gray-50 px-4 py-3">
                  <Link
                    href="/operaio/giornata/nuova"
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
                  >
                    â–¶ Inizia giornata domani
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

