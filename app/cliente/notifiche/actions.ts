'use server'

import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheCliente } from '@/lib/notifiche'
import { revalidatePath } from 'next/cache'

export async function segnaTutteLetteCliente() {
  const { user, cliente } = await requireCliente()
  const items = await listaNotificheCliente(cliente.id)
  if (items.length === 0) return

  await prisma.notificaLetta.createMany({
    data: items.map(n => ({ userId: user.id, tipo: n.tipo, refId: n.id })),
    skipDuplicates: true,
  })

  revalidatePath('/cliente/notifiche')
}
