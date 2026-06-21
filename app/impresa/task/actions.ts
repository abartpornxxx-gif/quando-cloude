'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function elencaTask() {
  await requireImpresa()
  return prisma.taskLibreria.findMany({
    orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function creaTask(titolo: string): Promise<void> {
  await requireImpresa()
  const t = titolo.trim()
  if (!t) throw new Error('Il titolo non può essere vuoto.')

  const esiste = await prisma.taskLibreria.findFirst({
    where: { titolo: { equals: t, mode: 'insensitive' } },
  })
  if (esiste) throw new Error(`Esiste già una task con questo titolo: "${esiste.titolo}"`)

  await prisma.taskLibreria.create({ data: { titolo: t } })
  revalidatePath('/impresa/task')
}

export async function eliminaTask(id: string): Promise<void> {
  await requireImpresa()
  await prisma.taskLibreria.delete({ where: { id } })
  revalidatePath('/impresa/task')
}
