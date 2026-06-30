import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import { VOCI_PREDEFINITE, LABEL_STATO, COLOR_STATO } from '@/lib/conteggio-cantiere-defaults'
import Link from 'next/link'
import {
  ClipboardCheck, Box, ToggleLeft, Lightbulb, Zap, FileText, Camera, ChevronRight,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

const ICONA_CAT: Record<string, React.ElementType> = {
  SUPPORTI: Box, FRUTTI: ToggleLeft, ILLUMINAZIONE: Lightbulb, QUADRO: Zap, ALTRO: FileText, STANDARD: Box,
}

export default async function ClienteConteggiPage() {
  const { cliente } = await requireCliente()

  const conteggi = await prisma.conteggioCantiere.findMany({
    where: {
      visibileCliente: true,
      stato: 'approvato',
      commessa: { clienteId: cliente.id },
    },
    include: {
      commessa: { select: { nome: true, indirizzoCantiere: true } },
      righe: { orderBy: { ordinamento: 'asc' } },
      foto: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { approvatoAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portale cliente</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Conteggio cantiere</h1>
        <p className="text-sm text-gray-500 mt-0.5">Riepilogo dei lavori approvati dall'impresa</p>
      </div>

      {conteggi.length === 0 && (
        <EmptyState
          title="Nessun conteggio disponibile"
          description="L'impresa non ha ancora condiviso il conteggio del cantiere."
        />
      )}

      <div className="space-y-6">
        {conteggi.map(c => {
          const righePerCat: Record<string, typeof c.righe> = {}
          for (const r of c.righe) {
            const cat = r.categoria === 'STANDARD'
              ? (VOCI_PREDEFINITE.find(v => v.codice === r.codice)?.categoria ?? 'STANDARD')
              : r.categoria
            if (!righePerCat[cat]) righePerCat[cat] = []
            righePerCat[cat].push({
              ...r,
              descrizione: r.categoria === 'STANDARD'
                ? (VOCI_PREDEFINITE.find(v => v.codice === r.codice)?.descrizione ?? r.descrizione)
                : r.descrizione,
            })
          }

          return (
            <div key={c.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Header commessa */}
              <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 shrink-0">
                  <ClipboardCheck size={18} className="text-violet-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-violet-900 truncate">{c.commessa.nome}</p>
                  {c.commessa.indirizzoCantiere && (
                    <p className="text-xs text-violet-600">{c.commessa.indirizzoCantiere}</p>
                  )}
                  {c.approvatoAt && (
                    <p className="text-[10px] text-violet-400 mt-0.5">Approvato il {formatData(c.approvatoAt)}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLOR_STATO[c.stato] ?? ''}`}>
                  {LABEL_STATO[c.stato] ?? c.stato}
                </span>
              </div>

              {/* Info lavorazione */}
              {(c.tipoLavorazione || c.serieCivile || c.placcheMontate) && (
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-6">
                  {c.tipoLavorazione && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lavorazione</p>
                      <p className="text-sm font-semibold text-gray-800">{c.tipoLavorazione}</p>
                    </div>
                  )}
                  {c.serieCivile && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Serie civile</p>
                      <p className="text-sm font-semibold text-gray-800">{c.serieCivile}</p>
                    </div>
                  )}
                  {c.placcheMontate && (
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Placche</p>
                      <p className="text-sm font-semibold text-gray-800">{(c.placcheManuali ?? c.placcheCalcolate)} pz</p>
                    </div>
                  )}
                </div>
              )}

              {/* Righe per categoria */}
              {Object.keys(righePerCat).length > 0 ? (
                <div>
                  {Object.entries(righePerCat).map(([cat, righe]) => {
                    const Icon = ICONA_CAT[cat] ?? FileText
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2 px-5 py-2 bg-gray-50/70 border-b border-gray-100">
                          <Icon size={12} className="text-violet-500" />
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat}</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {righe.filter(r => r.quantita > 0).map(r => (
                            <div key={r.id} className="flex items-center px-5 py-3">
                              <p className="flex-1 text-sm text-gray-700">{r.descrizione}</p>
                              {cat === 'QUADRO' && r.datiExtra && (
                                <p className="text-[10px] text-violet-500 mr-3">
                                  {((r.datiExtra as Record<string, string>).tipo ?? '').replace('_', ' ')} · {(r.datiExtra as Record<string, string>).amperaggio}
                                </p>
                              )}
                              <div className="flex items-baseline gap-1 shrink-0">
                                <span className="text-base font-bold text-gray-900">{r.quantita}</span>
                                <span className="text-xs text-gray-400">{r.unita ?? 'pz'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">Nessuna voce inserita.</div>
              )}

              {/* Foto */}
              {c.foto.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Camera size={11} /> Foto ({c.foto.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {c.foto.map(f => (
                      <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                        className="rounded-xl overflow-hidden border border-gray-200 block">
                        <img src={f.url} alt={f.descrizione ?? ''} className="w-full h-24 object-cover hover:opacity-90 transition-opacity" />
                        {f.descrizione && <p className="text-[10px] text-gray-500 px-2 py-1 truncate">{f.descrizione}</p>}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Link dettaglio commessa */}
              <div className="border-t border-gray-100 px-5 py-3">
                <Link href="/cliente/lavori" className="flex items-center justify-between text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                  <span>Vai ai lavori della commessa</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
