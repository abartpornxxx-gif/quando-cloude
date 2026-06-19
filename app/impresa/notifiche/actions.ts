'use server'

import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheImpresa } from '@/lib/notifiche'
import { revalidatePath } from 'next/cache'

export async function segnaTutteLetteImpresa() {
  const user = await requireImpresa()
  const items = await listaNotificheImpresa()
  if (items.length === 0) return

  await prisma.notificaLetta.createMany({
    data: items.map(n => ({ userId: user.id, tipo: n.tipo, refId: n.id })),
    skipDuplicates: true,
  })

  revalidatePath('/impresa/notifiche')
  revalidatePath('/impresa')
}
