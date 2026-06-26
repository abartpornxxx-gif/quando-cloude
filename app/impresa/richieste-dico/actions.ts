'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleEvasa(id: string) {
  await requireImpresa()
  const cur = await prisma.richiestaDiCo.findUnique({ where: { id }, select: { evasa: true } })
  if (!cur) return
  await prisma.richiestaDiCo.update({ where: { id }, data: { evasa: !cur.evasa } })
  revalidatePath('/impresa/richieste-dico')
}
