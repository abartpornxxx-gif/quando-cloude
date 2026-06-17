'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents } from '@/lib/format'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaOperaio(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const skillsJson = formData.get('skills') as string

  let skills = []
  try { skills = JSON.parse(skillsJson) } catch { skills = [] }

  const data = {
    nome: formData.get('nome') as string,
    email: (formData.get('email') as string) || null,
    ruolo: (formData.get('ruolo') as string) || null,
    costoOrario: euroToCents(formData.get('costoOrario') as string),
    zona: (formData.get('zona') as string) || null,
    skills,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.operaio.update({ where: { id }, data })
  } else {
    await prisma.operaio.create({ data })
  }
  redirect('/impresa/operai')
}

export async function eliminaOperaio(id: string) {
  await requireImpresa()
  await prisma.operaio.delete({ where: { id } })
  revalidatePath('/impresa/operai')
}
