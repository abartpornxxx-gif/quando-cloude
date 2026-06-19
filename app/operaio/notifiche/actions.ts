'use server'

import { requireOperaio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheOperaio } from '@/lib/notifiche'
import { revalidatePath } from 'next/cache'

export async function segnaTutteLetteOperaio() {
  const { user, operaio } = await requireOperaio()
  const items = await listaNotificheOperaio(operaio.id)
  if (items.length === 0) return

  await prisma.notificaLetta.createMany({
    data: items.map(n => ({ userId: user.id, tipo: n.tipo, refId: n.id })),
    skipDuplicates: true,
  })

  revalidatePath('/operaio/notifiche')
}
