import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/Badge'
import { RispostaSection } from './RispostaSection'
import Link from 'next/link'

// Mappa tipo impianto → etichetta italiana
const TIPO_IMPIANTO: Record<string, string> = {
  Elettrico: 'Impianto elettrico',
  Allarme: "Impianto d'allarme",
  Automazioni: 'Automazioni',
  Altro: 'Altro',
}

// Mappa stato → badge variant
type BV = 'info' | 'success' | 'danger' | 'warning' | 'neutral'
const STATO_BADGE: Record<string, BV> = {
  Inviata: 'info',
  VistaDalCliente: 'info',
  Accettata: 'success',
  RifiutataCliente: 'danger',
  ConfermataManuale: 'success',
  CommessaCreata: 'success',
  Annullata: 'neutral',
}

const STATO_LABEL: Record<string, string> = {
  Inviata: 'In attesa di risposta',
  VistaDalCliente: 'In attesa di risposta',
  Accettata: 'Accettata',
  RifiutataCliente: 'Non accettata',
  ConfermataManuale: 'Confermata',
  CommessaCreata: 'Intervento programmato',
}

export default async function ClienteManutenzioniPage() {
  const { cliente } = await requireCliente()

  const proposte = await prisma.propostaIntervento.findMany({
    where: {
      clienteId: cliente.id,
      stato: { not: 'Annullata' },
    },
    include: {
      manutenzione: {
        select: { titolo: true, tipoImpianto: true, tipoImpiantoAltro: true },
      },
      commessa: { select: { id: true, nome: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const proposteAttive = proposte.filter(
    p => p.stato === 'Inviata' || p.stato === 'VistaDalCliente',
  )
  const storico = proposte.filter(
    p => p.stato !== 'Inviata' && p.stato !== 'VistaDalCliente',
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposte di intervento</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Richieste di manutenzione inviate dalla nostra impresa
        </p>
      </div>

      {/* Sezione da rispondere */}
      {proposteAttive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-violet-600 uppercase tracking-wider">
            Da confermare ({proposteAttive.length})
          </h2>
          <div className="space-y-4">
            {proposteAttive.map(p => {
              const tipoLabel =
                p.manutenzione.tipoImpianto === 'Altro'
                  ? (p.manutenzione.tipoImpiantoAltro ?? 'Altro')
                  : (TIPO_IMPIANTO[p.manutenzione.tipoImpianto] ?? p.manutenzione.tipoImpianto)

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-violet-200 bg-white shadow-sm p-5 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900">{p.manutenzione.titolo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tipoLabel}</p>
                    </div>
                    <Badge variant="info">Da confermare</Badge>
                  </div>

                  {/* Data proposta */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400">Data prevista:</span>
                    <span className="font-medium">
                      {new Date(p.dataPropostaPrevista).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Messaggio impresa */}
                  {p.messaggioImpresa && (
                    <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-700 italic">
                      &ldquo;{p.messaggioImpresa}&rdquo;
                    </div>
                  )}

                  {/* Form risposta */}
                  <RispostaSection propostaId={p.id} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Storico */}
      {storico.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Storico
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
            {storico.map(p => {
              const tipoLabel =
                p.manutenzione.tipoImpianto === 'Altro'
                  ? (p.manutenzione.tipoImpiantoAltro ?? 'Altro')
                  : (TIPO_IMPIANTO[p.manutenzione.tipoImpianto] ?? p.manutenzione.tipoImpianto)

              return (
                <div key={p.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.manutenzione.titolo}</p>
                      <p className="text-xs text-gray-400">{tipoLabel}</p>
                    </div>
                    <Badge variant={STATO_BADGE[p.stato] ?? 'neutral'}>
                      {STATO_LABEL[p.stato] ?? p.stato}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500">
                    Data proposta:{' '}
                    {new Date(p.dataPropostaPrevista).toLocaleDateString('it-IT')}
                  </p>

                  {p.rispostaCliente && (
                    <p className="text-xs text-gray-600 italic">
                      Tua nota: &ldquo;{p.rispostaCliente}&rdquo;
                    </p>
                  )}

                  {/* Link commessa se creata */}
                  {p.commessa && (
                    <p className="text-xs">
                      <span className="text-gray-400">Lavoro: </span>
                      <Link
                        href={`/cliente/lavori/${p.commessa.id}`}
                        className="text-violet-600 hover:underline font-medium"
                      >
                        {p.commessa.nome}
                      </Link>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {proposte.length === 0 && (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-12 text-center">
          <p className="text-2xl mb-3">🔧</p>
          <p className="font-semibold text-gray-700">Nessuna proposta ricevuta</p>
          <p className="text-sm text-gray-400 mt-1">
            Quando l&apos;impresa proporrà un intervento di manutenzione, lo troverai qui.
          </p>
        </div>
      )}
    </div>
  )
}
