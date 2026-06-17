'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaChecklist(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const data = {
    domanda: formData.get('domanda') as string,
    ordine: parseInt(formData.get('ordine') as string) || 0,
    attiva: formData.get('attiva') === 'true',
  }
  if (id) {
    await prisma.checklistTemplate.update({ where: { id }, data })
  } else {
    await prisma.checklistTemplate.create({ data })
  }
  redirect('/impresa/checklist')
}

export async function eliminaChecklist(id: string) {
  await requireImpresa()
  await prisma.checklistTemplate.delete({ where: { id } })
  revalidatePath('/impresa/checklist')
}
