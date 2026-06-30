'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function creaConteggio(data: {
  commessaId: string
  operaioId?: string
  noteImpresa?: string
}) {
  await requireImpresa()
  const conteggio = await prisma.conteggioCantiere.create({
    data: {
      commessaId: data.commessaId,
      operaioId: data.operaioId || null,
      noteImpresa: data.noteImpresa || null,
      stato: 'richiesto',
    },
  })
  revalidatePath('/impresa/conteggi-cantiere')
  return { success: true, id: conteggio.id }
}

export async function approvaConteggio(id: string) {
  await requireImpresa()
  await prisma.conteggioCantiere.update({
    where: { id },
    data: { stato: 'approvato', approvatoAt: new Date() },
  })
  revalidatePath('/impresa/conteggi-cantiere')
  revalidatePath(`/impresa/conteggi-cantiere/${id}`)
}

export async function riaprConteggio(id: string) {
  await requireImpresa()
  await prisma.conteggioCantiere.update({
    where: { id },
    data: { stato: 'riaperto', approvatoAt: null },
  })
  revalidatePath('/impresa/conteggi-cantiere')
  revalidatePath(`/impresa/conteggi-cantiere/${id}`)
}

export async function toggleVisibileCliente(id: string, visibile: boolean) {
  await requireImpresa()
  await prisma.conteggioCantiere.update({
    where: { id },
    data: { visibileCliente: visibile },
  })
  revalidatePath(`/impresa/conteggi-cantiere/${id}`)
  revalidatePath('/cliente/conteggi-cantiere')
}

export async function aggiornaNotaImpresa(id: string, nota: string) {
  await requireImpresa()
  await prisma.conteggioCantiere.update({
    where: { id },
    data: { noteImpresa: nota || null },
  })
  revalidatePath(`/impresa/conteggi-cantiere/${id}`)
}

export async function aggiornaQuantitaImpresa(
  conteggioId: string,
  rigaId: string,
  quantita: number
) {
  await requireImpresa()
  if (quantita < 0) return
  await prisma.conteggioCantiereRiga.update({
    where: { id: rigaId },
    data: { quantita },
  })
  revalidatePath(`/impresa/conteggi-cantiere/${conteggioId}`)
}

export async function eliminaConteggio(id: string) {
  await requireImpresa()
  await prisma.conteggioCantiere.delete({ where: { id } })
  revalidatePath('/impresa/conteggi-cantiere')
}

export async function getCommesseDropdown() {
  await requireImpresa()
  return prisma.commessa.findMany({
    where: { archiviata: false },
    select: { id: true, nome: true, indirizzoCantiere: true },
    orderBy: { nome: 'asc' },
  })
}

export async function getOperaiDropdown() {
  await requireImpresa()
  return prisma.operaio.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })
}
