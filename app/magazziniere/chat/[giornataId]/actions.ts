'use server'

import { prisma } from '@/lib/prisma'
import { requireMagazziniere } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function inviaMsgMagazziniere(giornataId: string, testo: string): Promise<void> {
  const { magazziniere } = await requireMagazziniere()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata) throw new Error('Giornata non trovata')

  await prisma.chatMessaggio.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      autoreNome: magazziniere.nome,
      ruolo: 'magazziniere',
      testo: testo.trim(),
    },
  })

  revalidatePath(`/magazziniere/chat/${giornataId}`)
}

export async function getMessaggiMagazziniere(giornataId: string) {
  await requireMagazziniere()
  return prisma.chatMessaggio.findMany({
    where: { giornataId },
    orderBy: { createdAt: 'asc' },
  })
}
