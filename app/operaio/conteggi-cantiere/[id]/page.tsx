import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { VOCI_PREDEFINITE, TIPI_LAVORAZIONE, SERIE_CIVILI, PRESET_QUADRO, AMPERAGGI_QUADRO, TIPI_INTERRUTTORE, POLI_QUADRO, CURVE_QUADRO, TENSIONI_QUADRO } from '@/lib/conteggio-cantiere-defaults'
import { CompilaConteggio } from './CompilaConteggio'

export default async function OperaioConteggioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { operaio } = await requireOperaio()

  const conteggio = await prisma.conteggioCantiere.findFirst({
    where: { id, operaioId: operaio.id },
    include: {
      commessa: { select: { nome: true, indirizzoCantiere: true } },
      righe: { orderBy: { ordinamento: 'asc' } },
      foto: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conteggio) notFound()

  return (
    <CompilaConteggio
      conteggio={conteggio as Parameters<typeof CompilaConteggio>[0]['conteggio']}
      vociPredefinite={VOCI_PREDEFINITE}
      tipiLavorazione={TIPI_LAVORAZIONE}
      serieCivili={SERIE_CIVILI}
      presetQuadro={PRESET_QUADRO}
      amperaggiQuadro={AMPERAGGI_QUADRO}
      tipiInterruttore={TIPI_INTERRUTTORE}
      poliQuadro={POLI_QUADRO}
      curveQuadro={CURVE_QUADRO}
      tensioniQuadro={TENSIONI_QUADRO}
    />
  )
}
