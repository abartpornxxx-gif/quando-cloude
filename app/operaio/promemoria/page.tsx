import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatData } from '@/lib/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { Bell, Clock, MapPin } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  intervento: 'Intervento',
  appuntamento: 'Appuntamento',
  scadenza: 'Scadenza',
  nota: 'Nota',
}

const TIPO_COLOR: Record<string, string> = {
  intervento: 'bg-blue-50 text-blue-700 border-blue-200',
  appuntamento: 'bg-violet-50 text-violet-700 border-violet-200',
  scadenza: 'bg-orange-50 text-orange-700 border-orange-200',
  nota: 'bg-gray-50 text-gray-600 border-gray-200',
}

function formatOra(d: Date) {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

interface PromemoriaCardProps {
  p: {
    id: string
    titolo: string
    descrizione: string | null
    luogo: string | null
    tipo: string
    dataOra: Date
    importante: boolean
  }
  scaduto?: boolean
}

function PromemoriaCard({ p, scaduto }: PromemoriaCardProps) {
  return (
    <div className={`px-4 py-4 ${scaduto ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.importante && <span className="text-amber-500 text-sm leading-none">★</span>}
            <p className="text-sm font-semibold text-gray-900">{p.titolo}</p>
            <span className={`text-xs rounded-full border px-2 py-0.5 font-medium ${TIPO_COLOR[p.tipo] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {TIPO_LABEL[p.tipo] ?? p.tipo}
            </span>
          </div>
          {p.descrizione && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.descrizione}</p>
          )}
          {p.luogo && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <MapPin size={11} className="shrink-0" /> {p.luogo}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xs font-semibold ${scaduto ? 'text-red-600' : 'text-gray-700'}`}>
            {formatData(p.dataOra)}
          </p>
          <p className={`text-xs mt-0.5 flex items-center justify-end gap-1 ${scaduto ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock size={10} /> {formatOra(p.dataOra)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function OperaioPromemoriaPage() {
  const { operaio } = await requireOperaio()

  const now = new Date()

  const promemoria = await prisma.promemoria.findMany({
    where: {
      assegnatoAOperaioId: operaio.id,
      stato: { not: 'completato' },
    },
    orderBy: { dataOra: 'asc' },
  })

  const scaduti = promemoria.filter(p => p.dataOra < now)
  const prossimi = promemoria.filter(p => p.dataOra >= now)

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">I tuoi impegni</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Promemoria</h1>
        {promemoria.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">{promemoria.length} {promemoria.length === 1 ? 'promemoria attivo' : 'promemoria attivi'}</p>
        )}
      </div>

      {promemoria.length === 0 && (
        <EmptyState
          title="Nessun promemoria"
          description="L'impresa non ha ancora assegnato promemoria a te."
        />
      )}

      {scaduti.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Bell size={12} /> Scaduti ({scaduti.length})
          </p>
          <div className="rounded-2xl border border-red-200 bg-white shadow-card divide-y divide-gray-100 overflow-hidden">
            {scaduti.map(p => (
              <PromemoriaCard key={p.id} p={p} scaduto />
            ))}
          </div>
        </div>
      )}

      {prossimi.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Bell size={12} /> Prossimi ({prossimi.length})
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-card divide-y divide-gray-100 overflow-hidden">
            {prossimi.map(p => (
              <PromemoriaCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 text-xs text-gray-400 text-center shadow-card">
        I promemoria vengono assegnati dall&apos;impresa. Contattali per aggiungerne di nuovi.
      </div>
    </div>
  )
}
