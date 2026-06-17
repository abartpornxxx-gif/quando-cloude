'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function inviaMsgImpresa(giornataId: string, testo: string): Promise<void> {
  await requireImpresa()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata) throw new Error('Giornata non trovata')

  await prisma.chatMessaggio.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      autoreNome: 'Impresa',
      ruolo: 'impresa',
      testo: testo.trim(),
    },
  })

  revalidatePath(`/impresa/giornate/${giornataId}/chat`)
}

export async function getMessaggiImpresa(giornataId: string) {
  await requireImpresa()
  return prisma.chatMessaggio.findMany({
    where: { giornataId },
    orderBy: { createdAt: 'asc' },
  })
}
