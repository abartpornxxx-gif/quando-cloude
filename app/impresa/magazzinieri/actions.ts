'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaMagazziniere(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null

  const data = {
    nome: formData.get('nome') as string,
    email: (formData.get('email') as string) || null,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.magazziniere.update({ where: { id }, data })
  } else {
    await prisma.magazziniere.create({ data })
  }
  redirect('/impresa/magazzinieri')
}

export async function eliminaMagazziniere(id: string) {
  await requireImpresa()
  await prisma.magazziniere.delete({ where: { id } })
  revalidatePath('/impresa/magazzinieri')
}
