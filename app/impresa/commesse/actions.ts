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
    redirect('/impresa/commesse')
  } else {
    const c = await prisma.commessa.create({ data })
    redirect(`/impresa/commesse/${c.id}`)
  }
}

export async function archiviaCommessa(id: string) {
  await requireImpresa()
  await prisma.commessa.update({ where: { id }, data: { archiviata: true } })
  revalidatePath('/impresa/commesse')
  revalidatePath('/impresa/commesse/archiviate')
}

export async function ripristinaCommessa(id: string) {
  await requireImpresa()
  await prisma.commessa.update({ where: { id }, data: { archiviata: false } })
  revalidatePath('/impresa/commesse')
  revalidatePath('/impresa/commesse/archiviate')
}

export async function assegnaOperaio(commessaId: string, operaioId: string) {
  await requireImpresa()
  await prisma.commessaOperaio.upsert({
    where: { commessaId_operaioId: { commessaId, operaioId } },
    create: { commessaId, operaioId },
    update: {},
  })
  revalidatePath(`/impresa/commesse/${commessaId}`)
}

export async function rimuoviAssegnazione(commessaId: string, operaioId: string) {
  await requireImpresa()
  await prisma.commessaOperaio.delete({
    where: { commessaId_operaioId: { commessaId, operaioId } },
  })
  revalidatePath(`/impresa/commesse/${commessaId}`)
}
