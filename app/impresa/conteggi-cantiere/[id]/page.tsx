import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatData } from '@/lib/format'
import {
  LABEL_STATO, COLOR_STATO, VOCI_PREDEFINITE,
} from '@/lib/conteggio-cantiere-defaults'
import { DettaglioConteggioImpresa } from './DettaglioConteggioImpresa'

export default async function DettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireImpresa()
  const { id } = await params

  const conteggio = await prisma.conteggioCantiere.findUnique({
    where: { id },
    include: {
      commessa: { select: { nome: true, indirizzoCantiere: true, clienteId: true } },
      operaio: { select: { nome: true } },
      righe: { orderBy: { ordinamento: 'asc' } },
      foto: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conteggio) notFound()

  return (
    <DettaglioConteggioImpresa
      conteggio={conteggio as Parameters<typeof DettaglioConteggioImpresa>[0]['conteggio']}
      vociPredefinite={VOCI_PREDEFINITE}
      labelStato={LABEL_STATO}
      colorStato={COLOR_STATO}
      formatDataFn={formatData}
    />
  )
}
