import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, Phone, Mail, Receipt, MessageCircle } from 'lucide-react'

function eur(cents: number) {
  return (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

function totaleFattura(righe: { quantita: number; prezzoUnitario: number }[]) {
  return righe.reduce((acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario), 0)
}

function formatData(d: Date | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT')
}

function whatsappUrl(telefono: string): string | null {
  // Pulisce il numero: rimuove tutto tranne le cifre
  const digits = telefono.replace(/\D/g, '')
  if (!digits) return null
  // Se inizia con 39 (prefisso IT già presente) usa così; se inizia con 0 aggiunge 39; altrimenti aggiunge 39
  const normalized = digits.startsWith('39') ? digits : `39${digits.replace(/^0+/, '')}`
  if (normalized.length < 10) return null
  return `https://wa.me/${normalized}`
}

export default async function SaldiPendentiPage() {
  await requireUfficio()

  const commessefinite = await prisma.commessa.findMany({
    where: { stato: 'finita', archiviata: false },
    include: {
      cliente: { select: { nome: true, telefono: true, email: true } },
      fattureAttive: {
        where: { stato: { in: ['da_incassare', 'parzialmente_incassata', 'scaduta'] } },
        select: {
          id: true,
          numero: true,
          anno: true,
          stato: true,
          dataScadenza: true,
          importoIncassato: true,
          righe: { select: { quantita: true, prezzoUnitario: true } },
        },
        orderBy: [{ anno: 'desc' }, { numero: 'desc' }],
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Filtra solo commesse non saldate: fatture aperte oppure preventivato > fatturato
  const pendenti = commessefinite.filter(c => {
    const hasFattureAperte = c.fattureAttive.length > 0
    const nonSaldatoDaFatturato = c.preventivato > 0 && c.fatturato < c.preventivato
    return hasFattureAperte || nonSaldatoDaFatturato
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/ufficio/dashboard" className="text-sm text-teal-600 hover:text-teal-800">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Saldi pendenti</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendenti.length > 0
            ? `${pendenti.length} ${pendenti.length === 1 ? 'cantiere' : 'cantieri'} con pagamenti aperti o non saldati.`
            : 'Cantieri finiti con pagamenti ancora aperti o non saldati.'}
        </p>
      </div>

      {/* Empty state */}
      {pendenti.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Receipt size={24} className="text-emerald-600" />
          </div>
          <p className="font-semibold text-gray-900">Nessun saldo pendente</p>
          <p className="text-sm text-gray-500 mt-1">Tutti i cantieri finiti risultano saldati.</p>
        </div>
      )}

      {/* Lista */}
      {pendenti.length > 0 && (
        <div className="space-y-4">
          {pendenti.map(c => {
            const delta = c.preventivato - c.fatturato
            const isScopertoFatturato = c.preventivato > 0 && delta > 0

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Intestazione commessa */}
                <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/ufficio/commesse/${c.id}`} className="text-base font-bold text-gray-900 hover:text-teal-700 truncate">
                        {c.nome}
                      </Link>
                      <Badge variant="warning">Finita</Badge>
                    </div>
                    {c.cliente && (
                      <p className="text-sm text-gray-600 mt-0.5 font-medium">{c.cliente.nome}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      {c.cliente?.telefono && (
                        <a
                          href={`tel:${c.cliente.telefono}`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                        >
                          <Phone size={12} />
                          {c.cliente.telefono}
                        </a>
                      )}
                      {c.cliente?.telefono && whatsappUrl(c.cliente.telefono) && (
                        <a
                          href={whatsappUrl(c.cliente.telefono)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </a>
                      )}
                      {c.cliente?.email && (
                        <a
                          href={`mailto:${c.cliente.email}`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                        >
                          <Mail size={12} />
                          {c.cliente.email}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Importo da saldare */}
                  {isScopertoFatturato && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Da saldare</p>
                      <p className="text-xl font-bold text-red-600">{eur(delta)}</p>
                    </div>
                  )}
                </div>

                {/* Riepilogo finanziario */}
                {c.preventivato > 0 && (
                  <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
                    <div className="bg-white px-4 py-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Preventivato</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{eur(c.preventivato)}</p>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Incassato</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{eur(c.fatturato)}</p>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Residuo</p>
                      <p className={`text-sm font-bold mt-0.5 ${delta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {eur(Math.max(0, delta))}
                      </p>
                    </div>
                  </div>
                )}

                {/* Fatture aperte */}
                {c.fattureAttive.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Fatture aperte ({c.fattureAttive.length})
                      </p>
                      <Link
                        href={`/ufficio/fatture?commessaId=${c.id}`}
                        className="text-xs font-medium text-teal-600 hover:text-teal-800"
                      >
                        Vedi tutte →
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {c.fattureAttive.map(f => {
                        const totFattura = totaleFattura(f.righe)
                        const giaIncassato = f.importoIncassato ?? 0
                        const residuoFattura = totFattura - giaIncassato
                        const isScaduta = f.stato === 'scaduta'
                        const isParziale = f.stato === 'parzialmente_incassata'
                        return (
                          <div
                            key={f.id}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                              isScaduta ? 'bg-red-50 border border-red-200' : isParziale ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isScaduta && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                              <span className="text-sm font-medium text-gray-900">
                                Fattura n.{f.numero}/{f.anno}
                              </span>
                              {f.dataScadenza && (
                                <span className={`text-xs ${isScaduta ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                                  scad. {formatData(f.dataScadenza)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className={`text-sm font-bold ${isScaduta ? 'text-red-600' : 'text-gray-900'}`}>
                                  {eur(residuoFattura)}
                                </span>
                                {isParziale && (
                                  <p className="text-xs text-gray-400">residuo su {eur(totFattura)}</p>
                                )}
                              </div>
                              <Badge variant={isScaduta ? 'danger' : isParziale ? 'warning' : 'warning'}>
                                {isScaduta ? 'Scaduta' : isParziale ? 'Parz. incassata' : 'Da incassare'}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Note commessa */}
                {c.note && (
                  <div className="px-6 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Note</p>
                    <p className="text-sm text-gray-600">{c.note}</p>
                  </div>
                )}

                {/* Footer azioni */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <Link
                    href={`/ufficio/fatture?commessaId=${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
                  >
                    <Receipt size={14} />
                    Gestisci fatture
                  </Link>
                  {c.cliente?.email && (
                    <a
                      href={`mailto:${c.cliente.email}?subject=Saldo cantiere: ${encodeURIComponent(c.nome)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      <Mail size={14} />
                      Email
                    </a>
                  )}
                  {c.cliente?.telefono && whatsappUrl(c.cliente.telefono) && (
                    <a
                      href={`${whatsappUrl(c.cliente.telefono)}?text=${encodeURIComponent(`Gentile cliente, la contatto riguardo al saldo del cantiere "${c.nome}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
