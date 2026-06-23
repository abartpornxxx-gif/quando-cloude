'use server'

import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheUfficio } from '@/lib/notifiche'
import { revalidatePath } from 'next/cache'

export async function segnaTutteLetteUfficio(): Promise<void> {
  const { user } = await requireUfficio()
  const items = await listaNotificheUfficio(user.id)
  if (items.length === 0) return

  await prisma.notificaLetta.createMany({
    data: items.map(n => ({ userId: user.id, tipo: n.tipo, refId: n.id })),
    skipDuplicates: true,
  })

  revalidatePath('/ufficio/notifiche')
  revalidatePath('/ufficio/dashboard')
}
