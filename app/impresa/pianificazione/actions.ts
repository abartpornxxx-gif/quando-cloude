'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function creaPianificazione(input: {
  commessaId: string
  operaioId: string
  data: string
  mezzoId?: string
  note?: string
}): Promise<{ id: string }> {
  await requireImpresa()

  const pian = await prisma.pianificazione.upsert({
    where: {
      commessaId_operaioId_data: {
        commessaId: input.commessaId,
        operaioId: input.operaioId,
        data: new Date(input.data),
      },
    },
    update: {
      mezzoId: input.mezzoId || null,
      note: input.note || null,
    },
    create: {
      commessaId: input.commessaId,
      operaioId: input.operaioId,
      data: new Date(input.data),
      mezzoId: input.mezzoId || null,
      note: input.note || null,
    },
  })

  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')

  return { id: pian.id }
}

export async function eliminaPianificazione(id: string): Promise<void> {
  await requireImpresa()
  await prisma.pianificazione.delete({ where: { id } })
  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')
}

export async function sostituisciOperaio(pianificazioneId: string, nuovoOperaioId: string): Promise<void> {
  await requireImpresa()

  const originale = await prisma.pianificazione.findUnique({ where: { id: pianificazioneId } })
  if (!originale) throw new Error('Pianificazione non trovata')

  await prisma.$transaction([
    prisma.pianificazione.update({
      where: { id: pianificazioneId },
      data: { sostituito: true },
    }),
    prisma.pianificazione.upsert({
      where: {
        commessaId_operaioId_data: {
          commessaId: originale.commessaId,
          operaioId: nuovoOperaioId,
          data: originale.data,
        },
      },
      update: { note: 'Sostituzione' },
      create: {
        commessaId: originale.commessaId,
        operaioId: nuovoOperaioId,
        data: originale.data,
        note: 'Sostituzione',
      },
    }),
  ])

  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')
}
