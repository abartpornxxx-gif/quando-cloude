'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, RotateCcw, Eye, EyeOff,
  Box, ToggleLeft, Lightbulb, Zap, FileText, Camera, User, Building2, Clock,
} from 'lucide-react'
import { approvaConteggio, riaprConteggio, toggleVisibileCliente, eliminaConteggio } from '../actions'
import type { VocePredefinita } from '@/lib/conteggio-cantiere-defaults'

type Riga = {
  id: string; categoria: string; codice?: string | null; descrizione: string
  quantita: number; unita?: string | null; note?: string | null; datiExtra?: unknown
}
type Foto = { id: string; url: string; descrizione?: string | null }
type Conteggio = {
  id: string; stato: string; tipoLavorazione?: string | null; serieCivile?: string | null
  placcheMontate: boolean; placcheCalcolate: number; placcheManuali?: number | null
  noteImpresa?: string | null; noteOperaio?: string | null; visibileCliente: boolean
  inviatoAt?: Date | null; approvatoAt?: Date | null; createdAt: Date; updatedAt: Date
  commessa: { nome: string; indirizzoCantiere?: string | null; clienteId?: string | null }
  operaio?: { nome: string } | null
  righe: Riga[]
  foto: Foto[]
}

interface Props {
  conteggio: Conteggio
  vociPredefinite: VocePredefinita[]
  labelStato: Record<string, string>
  colorStato: Record<string, string>
  formatDataFn: (d: Date | string | null | undefined) => string
}

const ICONA_CAT: Record<string, React.ElementType> = {
  SUPPORTI: Box,
  FRUTTI: ToggleLeft,
  ILLUMINAZIONE: Lightbulb,
  QUADRO: Zap,
  ALTRO: FileText,
  STANDARD: Box,
}

export function DettaglioConteggioImpresa({ conteggio, vociPredefinite, labelStato, colorStato, formatDataFn }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Raggruppa righe per categoria
  const righePerCategoria: Record<string, Riga[]> = {}
  for (const riga of conteggio.righe) {
    // Per le voci STANDARD, usa il codice per recuperare la descrizione leggibile
    const cat = riga.categoria === 'STANDARD' ? _getCatFromCodice(riga.codice, vociPredefinite) : riga.categoria
    if (!righePerCategoria[cat]) righePerCategoria[cat] = []
    righePerCategoria[cat].push({
      ...riga,
      descrizione: riga.categoria === 'STANDARD'
        ? (vociPredefinite.find(v => v.codice === riga.codice)?.descrizione ?? riga.descrizione)
        : riga.descrizione,
    })
  }

  function handleApprova() {
    startTransition(async () => {
      await approvaConteggio(conteggio.id)
      router.refresh()
    })
  }

  function handleRiapri() {
    startTransition(async () => {
      await riaprConteggio(conteggio.id)
      router.refresh()
    })
  }

  function handleToggleVisibile() {
    startTransition(async () => {
      await toggleVisibileCliente(conteggio.id, !conteggio.visibileCliente)
      router.refresh()
    })
  }

  async function handleElimina() {
    if (!confirm('Eliminare definitivamente questo conteggio?')) return
    await eliminaConteggio(conteggio.id)
    router.push('/impresa/conteggi-cantiere')
  }

  const puoApprovare = conteggio.stato === 'inviato' || conteggio.stato === 'riaperto'
  const isApprovato = conteggio.stato === 'approvato'
  const placcheFinali = conteggio.placcheManuali ?? conteggio.placcheCalcolate

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/impresa/conteggi-cantiere" className="mt-1 p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{conteggio.commessa.nome}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorStato[conteggio.stato] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {labelStato[conteggio.stato] ?? conteggio.stato}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
            {conteggio.commessa.indirizzoCantiere && (
              <span className="flex items-center gap-1"><Building2 size={11} />{conteggio.commessa.indirizzoCantiere}</span>
            )}
            {conteggio.operaio && (
              <span className="flex items-center gap-1"><User size={11} />{conteggio.operaio.nome}</span>
            )}
            {conteggio.inviatoAt && (
              <span className="flex items-center gap-1"><Clock size={11} />Inviato {formatDataFn(conteggio.inviatoAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Azioni impresa */}
      <div className="flex flex-wrap gap-2">
        {puoApprovare && (
          <button
            onClick={handleApprova}
            disabled={pending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={15} /> Approva conteggio
          </button>
        )}
        {isApprovato && (
          <button
            onClick={handleToggleVisibile}
            disabled={pending}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {conteggio.visibileCliente ? <EyeOff size={15} /> : <Eye size={15} />}
            {conteggio.visibileCliente ? 'Nascondi al cliente' : 'Rendi visibile al cliente'}
          </button>
        )}
        {isApprovato && (
          <button
            onClick={handleRiapri}
            disabled={pending}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} /> Riapri
          </button>
        )}
        <button
          onClick={handleElimina}
          className="flex items-center gap-1.5 ml-auto bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
        >
          Elimina
        </button>
      </div>

      {/* Note impresa */}
      {conteggio.noteImpresa && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-1">Note per l&apos;operaio</p>
          <p className="text-sm text-blue-800">{conteggio.noteImpresa}</p>
        </div>
      )}

      {/* Note operaio */}
      {conteggio.noteOperaio && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Note operaio</p>
          <p className="text-sm text-amber-900">{conteggio.noteOperaio}</p>
        </div>
      )}

      {/* Info lavorazione */}
      {(conteggio.tipoLavorazione || conteggio.serieCivile) && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex flex-wrap gap-6">
          {conteggio.tipoLavorazione && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo lavorazione</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{conteggio.tipoLavorazione}</p>
            </div>
          )}
          {conteggio.serieCivile && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serie civile</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{conteggio.serieCivile}</p>
            </div>
          )}
          {conteggio.placcheMontate && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Placche</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">
                {placcheFinali} pz
                {conteggio.placcheManuali != null && conteggio.placcheManuali !== conteggio.placcheCalcolate && (
                  <span className="text-xs text-gray-400 ml-1">(calc. {conteggio.placcheCalcolate})</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Righe per categoria */}
      {Object.keys(righePerCategoria).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(righePerCategoria).map(([cat, righe]) => {
            const Icon = ICONA_CAT[cat] ?? FileText
            const totale = righe.reduce((s, r) => s + r.quantita, 0)
            return (
              <div key={cat} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <Icon size={15} className="text-blue-600" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat}</span>
                  <span className="ml-auto text-xs font-bold text-blue-600">totale: {totale}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {righe.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.descrizione}</p>
                        {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                        {cat === 'QUADRO' && r.datiExtra != null && (
                          <QuadroBadge dati={r.datiExtra as Record<string, string>} />
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-lg font-bold text-gray-900">{r.quantita}</span>
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
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-8 text-center text-sm text-gray-400">
          {conteggio.stato === 'richiesto' ? "In attesa che l'operaio compili il conteggio." : 'Nessuna voce inserita.'}
        </div>
      )}

      {/* Foto */}
      {conteggio.foto.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Camera size={12} /> Foto ({conteggio.foto.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conteggio.foto.map(f => (
              <div key={f.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  <img src={f.url} alt={f.descrizione ?? ''} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                </a>
                {f.descrizione && (
                  <p className="text-xs text-gray-500 px-2 py-1.5 truncate">{f.descrizione}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuadroBadge({ dati }: { dati: Record<string, string> }) {
  const label = [dati.tipo?.replace('_', ' '), dati.amperaggio, dati.poli, dati.curva].filter(Boolean).join(' · ')
  return <p className="text-xs text-indigo-600 mt-0.5">{label}</p>
}

function _getCatFromCodice(codice: string | null | undefined, voci: VocePredefinita[]): string {
  if (!codice) return 'STANDARD'
  return voci.find(v => v.codice === codice)?.categoria ?? 'STANDARD'
}
