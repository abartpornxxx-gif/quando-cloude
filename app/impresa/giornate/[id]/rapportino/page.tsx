import { requireImpresaOUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatData, formatEuro } from '@/lib/format'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RapportinoDettaglioPage({ params }: Props) {
  await requireImpresaOUfficio()
  const { id } = await params

  const giornata = await prisma.giornata.findUnique({
    where: { id },
    include: {
      commessa: {
        select: {
          id: true,
          nome: true,
          indirizzoCantiere: true,
          cliente: { select: { nome: true } },
        },
      },
      operaio: { select: { nome: true, costoOrario: true } },
      mezzo: { select: { nome: true, targa: true } },
      ore: true,
      foto: { orderBy: { createdAt: 'asc' } },
      attrezzatureUsi: {
        include: { attrezzatura: { select: { nome: true } } },
      },
      rapportino: true,
    },
  })

  if (!giornata) notFound()
  if (!giornata.rapportino) {
    return (
      <div className="space-y-4">
        <Link href={`/impresa/giornate`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Centro Operativo
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-lg font-bold text-amber-800 mb-1">Rapportino non ancora inviato</p>
          <p className="text-sm text-amber-700">L&#39;operaio non ha ancora compilato il rapportino per questa giornata.</p>
        </div>
      </div>
    )
  }

  const r = giornata.rapportino
  const oreOrd = giornata.ore.filter(o => o.tipo === 'ordinaria').reduce((s, o) => s + o.quantita, 0)
  const oreStr = giornata.ore.filter(o => o.tipo === 'straordinaria').reduce((s, o) => s + o.quantita, 0)
  const costoOrario = giornata.operaio.costoOrario
  const costoManodopera = Math.round(oreOrd * costoOrario + oreStr * costoOrario * 1.5)

  const faseLabel: Record<string, string> = {
    inizio: 'Avviata',
    mattina: 'In corso (mattina)',
    pausa: 'In pausa',
    pomeriggio: 'In corso (pomeriggio)',
    fine: 'Completata — rapportino pendente',
    completata: 'Completata',
  }

  function formatOrario(dt: Date | null) {
    if (!dt) return '—'
    return dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb + azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/impresa/giornate" className="hover:text-gray-700">Centro Operativo</Link>
          <span>›</span>
          <Link href="/impresa/rapportini" className="hover:text-gray-700">Rapportini</Link>
          <span>›</span>
          <span className="text-gray-900 font-medium">{formatData(giornata.data)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/impresa/giornate/${id}/chat`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            💬 Chat
          </Link>
          <Link
            href={`/impresa/giornate/${id}/rapportino/stampa`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
            target="_blank"
          >
            🖨 Stampa / PDF
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Rapportino di giornata</h1>

      {/* Scheda intestazione */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
        <Row label="Cantiere">
          <Link href={`/impresa/commesse/${giornata.commessa.id}`} className="text-blue-600 hover:underline font-medium">
            {giornata.commessa.nome}
          </Link>
        </Row>
        {giornata.commessa.cliente && (
          <Row label="Cliente">
            <span className="font-medium text-gray-900">{giornata.commessa.cliente.nome}</span>
          </Row>
        )}
        {giornata.commessa.indirizzoCantiere && (
          <Row label="Indirizzo cantiere">
            <span className="text-gray-700">{giornata.commessa.indirizzoCantiere}</span>
          </Row>
        )}
        <Row label="Operaio">
          <span className="font-medium text-gray-900">{giornata.operaio.nome}</span>
        </Row>
        <Row label="Data">
          <span className="font-medium text-gray-900">{formatData(giornata.data)}</span>
        </Row>
        <Row label="Stato giornata">
          <span className="text-gray-700">{faseLabel[giornata.fase] ?? giornata.fase}</span>
        </Row>
        {giornata.mezzo && (
          <Row label="Mezzo">
            <span className="text-gray-700">
              {giornata.mezzo.nome}{giornata.mezzo.targa ? ` (${giornata.mezzo.targa})` : ''}
            </span>
          </Row>
        )}
        <Row label="Rapportino inviato il">
          <span className="text-gray-700">
            {r.createdAt.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </Row>
      </div>

      {/* Orari fasi */}
      {(giornata.inizioMattina || giornata.fineMattina || giornata.inizioPomeriggio || giornata.finePomeriggio) && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">Orari di lavoro</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {giornata.inizioMattina && (
              <Row label="Inizio mattina">
                <span className="font-medium text-gray-900">{formatOrario(giornata.inizioMattina)}</span>
              </Row>
            )}
            {giornata.fineMattina && (
              <Row label="Fine mattina / pausa">
                <span className="font-medium text-gray-900">{formatOrario(giornata.fineMattina)}</span>
              </Row>
            )}
            {giornata.inizioPomeriggio && (
              <Row label="Ripresa pomeriggio">
                <span className="font-medium text-gray-900">{formatOrario(giornata.inizioPomeriggio)}</span>
              </Row>
            )}
            {giornata.finePomeriggio && (
              <Row label="Fine pomeriggio">
                <span className="font-medium text-gray-900">{formatOrario(giornata.finePomeriggio)}</span>
              </Row>
            )}
          </div>
        </div>
      )}

      {/* Ore */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">Ore lavorate</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <Row label="Ore ordinarie">
            <span className="font-bold text-gray-900 text-base">{r.oreOrdinarie > 0 ? `${r.oreOrdinarie}h` : '—'}</span>
          </Row>
          {r.oreStraordinarie > 0 && (
            <Row label="Ore straordinarie">
              <span className="font-bold text-orange-600 text-base">{r.oreStraordinarie}h</span>
            </Row>
          )}
          <Row label="Costo manodopera stimato">
            <span className="font-semibold text-gray-900">{formatEuro(costoManodopera)}</span>
          </Row>
        </div>
      </div>

      {/* Lavori */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">Descrizione lavori</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Lavoro eseguito</p>
            <p className="text-sm text-gray-900 whitespace-pre-line">{r.lavoroEseguito}</p>
          </div>
          {r.lavoriExtra && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Lavori extra / imprevisti</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{r.lavoriExtra}</p>
            </div>
          )}
          {r.noteAttrezzatura && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Note attrezzatura</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{r.noteAttrezzatura}</p>
            </div>
          )}
          {r.noteGiornoSuccessivo && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Note per il giorno successivo</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{r.noteGiornoSuccessivo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Attrezzature */}
      {giornata.attrezzatureUsi.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">Attrezzature utilizzate</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {giornata.attrezzatureUsi.map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-gray-900">{u.attrezzatura.nome}</span>
                <span className={`text-xs font-semibold ${u.riconsegnata ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {u.riconsegnata ? '✓ Riconsegnata' : '⏳ Non riconsegnata'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pianificazione domani */}
      {r.cosaFareDomani && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
          <div className="border-b border-blue-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-blue-800">Pianificazione domani (indicata dall&#39;operaio)</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-gray-800">{r.cosaFareDomani}</p>
            {r.urgenzaDomani != null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Urgenza:</span>
                <span className={`text-sm font-bold ${
                  r.urgenzaDomani >= 4 ? 'text-red-600' : r.urgenzaDomani === 3 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {r.urgenzaDomani}/5
                  {r.urgenzaDomani >= 4 ? ' 🔴' : r.urgenzaDomani === 3 ? ' 🟡' : ' 🟢'}
                </span>
              </div>
            )}
            {r.stimaOreDomani != null && (
              <p className="text-xs text-gray-500">Stima ore: <span className="font-semibold text-gray-700">{r.stimaOreDomani}h</span></p>
            )}
          </div>
        </div>
      )}

      {/* Foto */}
      {giornata.foto.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">Foto di cantiere ({giornata.foto.length})</h2>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {giornata.foto.map(f => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt="Foto cantiere"
                  className="h-40 w-full rounded-xl object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-right">{children}</span>
    </div>
  )
}
