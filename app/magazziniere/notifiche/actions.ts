'use server'

import { requireMagazziniere } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listaNotificheMagazziniere } from '@/lib/notifiche'
import { revalidatePath } from 'next/cache'

export async function segnaTutteLetteMagazziniere() {
  const { user } = await requireMagazziniere()
  const items = await listaNotificheMagazziniere()
  if (items.length === 0) return

  await prisma.notificaLetta.createMany({
    data: items.map(n => ({ userId: user.id, tipo: n.tipo, refId: n.id })),
    skipDuplicates: true,
  })

  revalidatePath('/magazziniere/notifiche')
}
