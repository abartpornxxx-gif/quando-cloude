'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoAttrezzatura } from '@/app/generated/prisma/client'

export async function salvaAttrezzatura(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const data = {
    nome: formData.get('nome') as string,
    stato: formData.get('stato') as StatoAttrezzatura,
    assegnatario: (formData.get('assegnatario') as string) || null,
    note: (formData.get('note') as string) || null,
  }
  if (id) { await prisma.attrezzatura.update({ where: { id }, data }) }
  else { await prisma.attrezzatura.create({ data }) }
  redirect('/impresa/attrezzature')
}

export async function eliminaAttrezzatura(id: string) {
  await requireImpresa()
  await prisma.attrezzatura.delete({ where: { id } })
  revalidatePath('/impresa/attrezzature')
}
