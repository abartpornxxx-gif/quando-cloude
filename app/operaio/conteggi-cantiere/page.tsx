import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import { LABEL_STATO, COLOR_STATO } from '@/lib/conteggio-cantiere-defaults'
import Link from 'next/link'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function OperaioConteggiPage() {
  const { operaio } = await requireOperaio()

  const conteggi = await prisma.conteggioCantiere.findMany({
    where: { operaioId: operaio.id },
    include: {
      commessa: { select: { nome: true, indirizzoCantiere: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const daCompilare = conteggi.filter(c => ['richiesto', 'in_compilazione', 'riaperto'].includes(c.stato))
  const completati = conteggi.filter(c => ['inviato', 'approvato'].includes(c.stato))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">I tuoi conteggi</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Conteggio Cantiere</h1>
        {conteggi.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">
            {daCompilare.length > 0 ? `${daCompilare.length} da compilare` : 'Tutto aggiornato'}
          </p>
        )}
      </div>

      {conteggi.length === 0 && (
        <EmptyState
          title="Nessun conteggio assegnato"
          description="L'impresa non ha ancora richiesto un conteggio cantiere per te."
        />
      )}

      {daCompilare.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">
            Da compilare ({daCompilare.length})
          </p>
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
            {daCompilare.map(c => (
              <Link
                key={c.id}
                href={`/operaio/conteggi-cantiere/${c.id}`}
                className="flex items-center gap-4 px-4 py-4 hover:bg-emerald-50/40 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
                  <ClipboardCheck size={20} className="text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.commessa.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_STATO[c.stato] ?? ''}`}>
                      {LABEL_STATO[c.stato] ?? c.stato}
                    </span>
                    <span className="text-xs text-gray-400">{formatData(c.updatedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {completati.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Completati ({completati.length})
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 overflow-hidden">
            {completati.map(c => (
              <Link
                key={c.id}
                href={`/operaio/conteggi-cantiere/${c.id}`}
                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors group opacity-75"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                  <ClipboardCheck size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{c.commessa.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_STATO[c.stato] ?? ''}`}>
                      {LABEL_STATO[c.stato] ?? c.stato}
                    </span>
                    <span className="text-xs text-gray-400">{formatData(c.updatedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
