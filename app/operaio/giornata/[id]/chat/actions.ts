'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function inviaMsgOperaio(
  giornataId: string,
  testo: string
): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  await prisma.chatMessaggio.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      autoreNome: operaio.nome,
      ruolo: 'operaio',
      testo: testo.trim(),
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/chat`)
}

export async function richiediMateriale(
  giornataId: string,
  descrizione: string,
  urgente: boolean
): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  await prisma.richiestaMateriale.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      operaioId: operaio.id,
      descrizione: descrizione.trim(),
      urgente,
      stato: 'richiesta',
    },
  })

  // Notifica via chat
  await prisma.chatMessaggio.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      autoreNome: operaio.nome,
      ruolo: 'operaio',
      testo: `📦 Richiesta materiale${urgente ? ' 🚨 URGENTE' : ''}: ${descrizione.trim()}`,
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/chat`)
}

export async function getMessaggi(giornataId: string) {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  return prisma.chatMessaggio.findMany({
    where: { giornataId },
    orderBy: { createdAt: 'asc' },
  })
}
