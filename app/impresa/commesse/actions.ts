'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents } from '@/lib/format'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoCommessa } from '@/app/generated/prisma/client'

export async function salvaCommessa(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null

  const data = {
    nome: formData.get('nome') as string,
    clienteId: (formData.get('clienteId') as string) || null,
    indirizzoCantiere: (formData.get('indirizzoCantiere') as string) || null,
    stato: formData.get('stato') as StatoCommessa,
    preventivato: euroToCents(formData.get('preventivato') as string),
    costiMateriali: euroToCents(formData.get('costiMateriali') as string),
    costiManodopera: euroToCents(formData.get('costiManodopera') as string),
    costiMezzi: euroToCents(formData.get('costiMezzi') as string),
    fatturato: euroToCents(formData.get('fatturato') as string),
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.commessa.update({ where: { id }, data })
    revalidatePath(`/impresa/commesse/${id}`)
  } else {
    const c = await prisma.commessa.create({ data })
    redirect(`/impresa/commesse/${c.id}`)
  }

  redirect('/impresa/commesse')
}

export async function eliminaCommessa(id: string) {
  await requireImpresa()
  await prisma.commessa.delete({ where: { id } })
  revalidatePath('/impresa/commesse')
}
