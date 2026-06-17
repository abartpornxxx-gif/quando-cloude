'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function approvaAssenza(id: string): Promise<void> {
  await requireImpresa()
  await prisma.assenza.update({ where: { id }, data: { stato: 'approvata' } })
  revalidatePath('/impresa/assenze')
  revalidatePath('/impresa/calendario')
}

export async function rifiutaAssenza(id: string): Promise<void> {
  await requireImpresa()
  await prisma.assenza.update({ where: { id }, data: { stato: 'rifiutata' } })
  revalidatePath('/impresa/assenze')
}

export async function eliminaAssenza(id: string): Promise<void> {
  await requireImpresa()
  await prisma.assenza.delete({ where: { id } })
  revalidatePath('/impresa/assenze')
}
