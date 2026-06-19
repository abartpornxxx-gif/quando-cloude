'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaTipoLavoro(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const data = {
    nome: formData.get('nome') as string,
    descrizione: (formData.get('descrizione') as string) || null,
    ordine: parseInt((formData.get('ordine') as string) || '0'),
  }
  if (id) {
    await prisma.tipoLavoro.update({ where: { id }, data })
  } else {
    await prisma.tipoLavoro.create({ data })
  }
  revalidatePath('/impresa/tipi-lavoro')
  redirect('/impresa/tipi-lavoro')
}

export async function eliminaTipoLavoro(id: string) {
  await requireImpresa()
  const nCommesse = await prisma.commessa.count({ where: { tipoLavoroId: id } })
  if (nCommesse > 0) {
    throw new Error(`Impossibile eliminare: ${nCommesse} commess${nCommesse === 1 ? 'a usa' : 'e usano'} questo tipo di lavoro. Riassegna prima le commesse.`)
  }
  await prisma.tipoLavoro.delete({ where: { id } })
  revalidatePath('/impresa/tipi-lavoro')
}

export async function salvaVoceModello(tipoLavoroId: string, formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const data = {
    testo: formData.get('testo') as string,
    note: (formData.get('note') as string) || null,
    collegamento: (formData.get('collegamento') as string) || null,
    ordine: parseInt((formData.get('ordine') as string) || '0'),
  }
  if (id) {
    await prisma.adempimentoModello.update({ where: { id }, data })
  } else {
    await prisma.adempimentoModello.create({ data: { ...data, tipoLavoroId } })
  }
  revalidatePath(`/impresa/tipi-lavoro/${tipoLavoroId}`)
}

export async function eliminaVoceModello(id: string, tipoLavoroId: string) {
  await requireImpresa()
  await prisma.adempimentoModello.delete({ where: { id } })
  revalidatePath(`/impresa/tipi-lavoro/${tipoLavoroId}`)
}
