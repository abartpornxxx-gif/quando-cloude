import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { richiediAssenza } from './actions'
import { formatData } from '@/lib/format'
import Link from 'next/link'
import Image from 'next/image'
import { PersonalizzazioneOperaioForm } from '@/components/PersonalizzazioneOperaioForm'

const TIPO_LABEL: Record<string, string> = {
  ferie: 'Ferie',
  permesso: 'Permesso',
  malattia: 'Malattia',
  altro: 'Altro',
}

const STATO_BADGE: Record<string, string> = {
  in_attesa: 'bg-yellow-100 text-yellow-800',
  approvata: 'bg-emerald-100 text-emerald-800',
  rifiutata: 'bg-red-100 text-red-800',
}

const STATO_LABEL: Record<string, string> = {
  in_attesa: 'In attesa',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
}

export default async function ProfiloOperaioPage() {
  const { user, operaio } = await requireOperaio()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 14)

  const [prossimeAssegnazioni, assenze] = await Promise.all([
    prisma.pianificazione.findMany({
      where: {
        operaioId: operaio.id,
        sostituito: false,
        data: { gte: today, lte: nextWeek },
      },
      include: {
        commessa: { select: { nome: true, indirizzoCantiere: true } },
        mezzo: { select: { nome: true } },
      },
      orderBy: { data: 'asc' },
    }),
    prisma.assenza.findMany({
      where: { operaioId: operaio.id },
      orderBy: { dataInizio: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Intestazione profilo */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          {operaio.avatarMascotte ? (
            <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-50 shrink-0">
              <Image
                src={`/mascotte/mascotte_${operaio.avatarMascotte}.png`}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 shrink-0">
              {operaio.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{operaio.nome}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            {operaio.ruolo && <p className="text-xs text-gray-400 mt-0.5">{operaio.ruolo}</p>}
          </div>
        </div>
      </div>

      {/* Prossimi cantieri (14 giorni) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Prossimi 14 giorni</h2>
        {prossimeAssegnazioni.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            Nessun incarico pianificato
          </div>
        ) : (
          <ul className="space-y-2">
            {prossimeAssegnazioni.map(p => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="w-12 shrink-0 text-center">
                  <div className="text-sm font-bold text-gray-900">
                    {(p.data as Date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div className="text-[10px] uppercase text-gray-400">
                    {(p.data as Date).toLocaleDateString('it-IT', { weekday: 'short' })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{p.commessa.nome}</div>
                  {p.commessa.indirizzoCantiere && (
                    <div className="text-xs text-gray-400 truncate">{p.commessa.indirizzoCantiere}</div>
                  )}
                </div>
                {p.mezzo && (
                  <span className="shrink-0 text-xs text-gray-400">{p.mezzo.nome}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <Link
            href="/operaio/calendario"
            className="text-sm text-emerald-600 hover:underline"
          >
            Vedi tutto il calendario →
          </Link>
        </div>
      </div>

      {/* Form richiesta assenza */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Richiedi ferie / permesso</h2>
        </div>
        <form action={richiediAssenza} className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Dal</label>
              <input
                type="date"
                name="dataInizio"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Al</label>
              <input
                type="date"
                name="dataFine"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
            <select
              name="tipo"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ferie">Ferie</option>
              <option value="permesso">Permesso</option>
              <option value="malattia">Malattia</option>
              <option value="altro">Altro</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Note (opzionale)</label>
            <textarea
              name="note"
              rows={2}
              placeholder="Motivo o note aggiuntive…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Invia richiesta
          </button>
        </form>
      </div>

      {/* Storico assenze */}
      {assenze.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Le mie assenze</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {assenze.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{TIPO_LABEL[a.tipo]}</div>
                  <div className="text-xs text-gray-400">
                    {formatData(a.dataInizio)} → {formatData(a.dataFine)}
                  </div>
                  {a.note && <div className="text-xs text-gray-400 truncate">{a.note}</div>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE[a.stato]}`}>
                  {STATO_LABEL[a.stato]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Personalizzazione scheda */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Personalizza il tuo profilo cantiere</h2>
        </div>
        <PersonalizzazioneOperaioForm
          initialData={{
            avatarMascotte: operaio.avatarMascotte,
            coloreMascotte: operaio.coloreMascotte,
            descrizione: operaio.descrizione,
            fraseDivertente: operaio.fraseDivertente,
            hobbies: operaio.hobbies,
            nome: operaio.nome,
            ruolo: operaio.ruolo,
          }}
        />

      </div>
    </div>
  )
}
