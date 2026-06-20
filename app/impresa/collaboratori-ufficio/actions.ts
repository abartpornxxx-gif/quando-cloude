'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaCollaboratoreUfficio(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null

  const data = {
    nome: formData.get('nome') as string,
    email: (formData.get('email') as string) || null,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.collaboratoreUfficio.update({ where: { id }, data })
  } else {
    await prisma.collaboratoreUfficio.create({ data })
  }
  redirect('/impresa/collaboratori-ufficio')
}

export async function eliminaCollaboratoreUfficio(id: string) {
  await requireImpresa()
  await prisma.collaboratoreUfficio.delete({ where: { id } })
  revalidatePath('/impresa/collaboratori-ufficio')
}
