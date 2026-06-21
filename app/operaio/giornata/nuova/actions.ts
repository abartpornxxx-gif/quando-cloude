'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function iniziaGiornata(input: {
  commessaId: string
  mezzoId?: string
  pianificazioneId?: string
  attrezzatureIds: string[]
}): Promise<void> {
  const { operaio } = await requireOperaio()

  // Verifica assegnazione
  const assegnazione = await prisma.commessaOperaio.findUnique({
    where: { commessaId_operaioId: { commessaId: input.commessaId, operaioId: operaio.id } },
  })
  if (!assegnazione) throw new Error('Non sei assegnato a questa commessa')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Guard: blocca se esiste già una giornata aperta (qualsiasi data)
  const giornataAperta = await prisma.giornata.findFirst({
    where: {
      operaioId: operaio.id,
      stato: 'bozza',
      fase: { not: 'completata' },
    },
    orderBy: { data: 'desc' },
  })
  if (giornataAperta) redirect(`/operaio/giornata/${giornataAperta.id}/lavori`)

  const g = await prisma.giornata.create({
    data: {
      commessaId: input.commessaId,
      operaioId: operaio.id,
      data: today,
      mezzoId: input.mezzoId || null,
      pianificazioneId: input.pianificazioneId || null,
      fase: 'inizio',
      stato: 'bozza',
    },
  })

  // Crea record attrezzatura_usi per ogni attrezzo preso
  if (input.attrezzatureIds.length > 0) {
    await prisma.attrezzaturaUso.createMany({
      data: input.attrezzatureIds.map(attrId => ({
        attrezzaturaId: attrId,
        operaioId: operaio.id,
        commessaId: input.commessaId,
        mezzoId: input.mezzoId || null,
        giornataId: g.id,
        riconsegnata: false,
      })),
    })

    // Segna le attrezzature come in_uso
    await prisma.attrezzatura.updateMany({
      where: { id: { in: input.attrezzatureIds } },
      data: { stato: 'in_uso', assegnatario: operaio.nome },
    })
  }

  redirect(`/operaio/giornata/${g.id}/lavori`)
}
