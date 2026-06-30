import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import { LABEL_STATO, COLOR_STATO } from '@/lib/conteggio-cantiere-defaults'
import Link from 'next/link'
import { ClipboardCheck, Plus, User, Building2 } from 'lucide-react'

export default async function ConteggiCantierePage() {
  await requireImpresa()

  const conteggi = await prisma.conteggioCantiere.findMany({
    include: {
      commessa: { select: { nome: true, indirizzoCantiere: true } },
      operaio: { select: { nome: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cantiere</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Conteggi Cantiere</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consuntivo finale lavorazioni per commessa</p>
        </div>
        <Link
          href="/impresa/conteggi-cantiere/nuova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={16} />
          Nuovo conteggio
        </Link>
      </div>

      {conteggi.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="bg-blue-50 p-5 rounded-2xl mb-4">
            <ClipboardCheck size={40} className="text-blue-300 mx-auto" />
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">Nessun conteggio cantiere</p>
          <p className="text-xs text-gray-400 mb-4">Crea il primo conteggio per una commessa in chiusura.</p>
          <Link
            href="/impresa/conteggi-cantiere/nuova"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus size={14} /> Nuovo conteggio
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
          {conteggi.map(c => (
            <Link
              key={c.id}
              href={`/impresa/conteggi-cantiere/${c.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                <ClipboardCheck size={20} className="text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.commessa.nome}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_STATO[c.stato] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {LABEL_STATO[c.stato] ?? c.stato}
                  </span>
                  {c.visibileCliente && c.stato === 'approvato' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      Visibile cliente
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  {c.commessa.indirizzoCantiere && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Building2 size={10} />{c.commessa.indirizzoCantiere}
                    </span>
                  )}
                  {c.operaio && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <User size={10} />{c.operaio.nome}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">Aggiornato {formatData(c.updatedAt)}</span>
                </div>
              </div>

              <span className="text-gray-300 group-hover:text-gray-500 text-lg shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
