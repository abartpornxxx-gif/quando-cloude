'use server'

import { prisma } from '@/lib/prisma'
import { requireMagazziniere } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function inviaMsgMagazziniere(giornataId: string, testo: string): Promise<void> {
  const { magazziniere } = await requireMagazziniere()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata) throw new Error('Giornata non trovata')

  // Verifica che esista almeno una richiesta materiale per questa giornata (contesto valido)
  const richiestaEsiste = await prisma.richiestaMateriale.findFirst({
    where: { giornataId },
    select: { id: true },
  })
  if (!richiestaEsiste) throw new Error('Non autorizzato: nessuna richiesta materiale collegata a questa giornata')

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
  const { magazziniere } = await requireMagazziniere()

  // Stessa verifica del contesto valido
  const richiestaEsiste = await prisma.richiestaMateriale.findFirst({
    where: { giornataId },
    select: { id: true },
  })
  if (!richiestaEsiste) throw new Error('Non autorizzato')

  return prisma.chatMessaggio.findMany({
    where: { giornataId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
}
