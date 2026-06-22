import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { DeleteButton } from '@/components/DeleteButton'
import { ManutenzioneForm } from '../ManutenzioneForm'
import { ProposteSection, type PropostaProp } from '../ProposteSection'
import { salvaManutenzione, eliminaManutenzione } from '../actions'

function statoScadenza(data: Date): 'scaduta' | 'imminente' | 'ok' {
  const now = new Date()
  const oggiUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dataUtc = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  const diffGiorni = Math.floor((dataUtc - oggiUtc) / 86_400_000)
  if (diffGiorni < 0) return 'scaduta'
  if (diffGiorni <= 30) return 'imminente'
  return 'ok'
}

export default async function ManutenzioneDettPage({ params }: { params: Promise<{ id: string }> }) {
  await requireImpresa()
  const { id } = await params

  const [m, clienti, proposteRaw] = await Promise.all([
    prisma.manutenzioneProgrammata.findUnique({
      where: { id },
      include: { cliente: { select: { id: true, nome: true, email: true } } },
    }),
    prisma.cliente.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.propostaIntervento.findMany({
      where: { manutenzioneId: id },
      include: { commessa: { select: { id: true, nome: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  if (!m) notFound()

  const stato = statoScadenza(m.dataProssimoIntervento)
  const badgeVariant = stato === 'scaduta' ? 'danger' : stato === 'imminente' ? 'warning' : 'success'
  const badgeLabel = stato === 'scaduta' ? 'Scaduta' : stato === 'imminente' ? 'In scadenza' : 'Nei tempi'

  const defaultValues = {
    id: m.id,
    clienteId: m.clienteId,
    titolo: m.titolo,
    tipoImpianto: m.tipoImpianto,
    tipoImpiantoAltro: m.tipoImpiantoAltro ?? '',
    intervalloValore: m.intervalloValore,
    intervalloUnita: m.intervalloUnita,
    dataUltimoIntervento: m.dataUltimoIntervento?.toISOString().slice(0, 10) ?? '',
    dataProssimoIntervento: m.dataProssimoIntervento.toISOString().slice(0, 10),
    note: m.note ?? '',
    attiva: m.attiva,
  }

  // Messaggio pre-compilato per la proposta
  const messaggioDefault = `Gentile ${m.cliente.nome}, la contatto per organizzare: ${m.titolo}. La data prevista è il ${m.dataProssimoIntervento.toLocaleDateString('it-IT')}.`

  // Converte le date in stringhe ISO per passarle al Client Component
  const proposte: PropostaProp[] = proposteRaw.map(p => ({
    id: p.id,
    stato: p.stato as PropostaProp['stato'],
    dataPropostaPrevista: p.dataPropostaPrevista.toISOString(),
    messaggioImpresa: p.messaggioImpresa,
    rispostaCliente: p.rispostaCliente,
    confermataDaImpresa: p.confermataDaImpresa,
    dataEsecuzione: p.dataEsecuzione?.toISOString() ?? null,
    commessa: p.commessa,
    createdAt: p.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        backHref="/impresa/manutenzioni"
        backLabel="Manutenzioni"
        title={m.titolo}
        subtitle={m.cliente.nome}
        badge={
          <Badge variant={badgeVariant}>
            {badgeLabel}
          </Badge>
        }
        action={
          <DeleteButton action={eliminaManutenzione.bind(null, m.id)} />
        }
      />

      <ManutenzioneForm
        action={salvaManutenzione}
        clienti={clienti}
        defaultValues={defaultValues}
      />

      {/* Sezione proposte di intervento */}
      <ProposteSection
        manutenzioneId={m.id}
        clienteHaEmail={!!m.cliente.email}
        messaggioDefault={messaggioDefault}
        dataSuggerita={m.dataProssimoIntervento.toISOString().slice(0, 10)}
        proposte={proposte}
      />
    </div>
  )
}
