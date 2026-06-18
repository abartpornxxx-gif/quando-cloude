'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function salvaSuggerimento(formData: FormData): Promise<void> {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const testo = (formData.get('testo') as string).trim()
  const categoria = (formData.get('categoria') as string).trim() || null
  const ordine = parseInt(formData.get('ordine') as string) || 0

  if (!testo) throw new Error('Il testo è obbligatorio')

  if (id) {
    await prisma.suggerimentoCantiere.update({ where: { id }, data: { testo, categoria, ordine } })
  } else {
    await prisma.suggerimentoCantiere.create({ data: { testo, categoria, ordine } })
  }
  revalidatePath('/impresa/checklist')
  redirect('/impresa/checklist')
}

export async function toggleSuggerimento(id: string, attivo: boolean): Promise<void> {
  await requireImpresa()
  await prisma.suggerimentoCantiere.update({ where: { id }, data: { attivo } })
  revalidatePath('/impresa/checklist')
}

export async function eliminaSuggerimento(id: string): Promise<void> {
  await requireImpresa()
  await prisma.suggerimentoCantiere.delete({ where: { id } })
  revalidatePath('/impresa/checklist')
}
