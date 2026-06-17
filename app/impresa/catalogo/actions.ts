'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaOfferta(id: string | null, formData: FormData) {
  await requireImpresa()

  const data = {
    titolo: formData.get('titolo') as string,
    categoria: (formData.get('categoria') as string) || null,
    descrizione: (formData.get('descrizione') as string) || null,
    fotoUrl: (formData.get('fotoUrl') as string) || null,
    fotoPath: (formData.get('fotoPath') as string) || null,
    prezzoDa: formData.get('prezzoDa') ? Math.round(parseFloat(formData.get('prezzoDa') as string) * 100) : null,
    attiva: formData.get('attiva') === 'true',
    ordine: parseInt((formData.get('ordine') as string) || '0'),
  }

  if (id) {
    await prisma.offertaCatalogo.update({ where: { id }, data })
  } else {
    await prisma.offertaCatalogo.create({ data })
  }

  revalidatePath('/impresa/catalogo')
  redirect('/impresa/catalogo')
}

export async function eliminaOfferta(id: string) {
  await requireImpresa()
  await prisma.offertaCatalogo.delete({ where: { id } })
  revalidatePath('/impresa/catalogo')
}

export async function toggleAttiva(id: string, attiva: boolean) {
  await requireImpresa()
  await prisma.offertaCatalogo.update({ where: { id }, data: { attiva } })
  revalidatePath('/impresa/catalogo')
}
