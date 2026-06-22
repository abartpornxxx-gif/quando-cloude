'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function creaPianificazione(input: {
  commessaId: string
  operaioId: string
  data: string
  mezzoId?: string
}): Promise<{ id: string }> {
  await requireImpresaOUfficio()

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
    },
    create: {
      commessaId: input.commessaId,
      operaioId: input.operaioId,
      data: new Date(input.data),
      mezzoId: input.mezzoId || null,
    },
  })

  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')

  return { id: pian.id }
}

export async function eliminaPianificazione(id: string): Promise<void> {
  await requireImpresaOUfficio()
  const giornata = await prisma.giornata.findFirst({ where: { pianificazioneId: id }, select: { id: true } })
  if (giornata) {
    throw new Error('Impossibile eliminare la pianificazione: è già stata avviata una giornata di lavoro collegata.')
  }
  await prisma.pianificazione.delete({ where: { id } })
  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')
}

export async function sostituisciOperaio(pianificazioneId: string, nuovoOperaioId: string): Promise<void> {
  await requireImpresaOUfficio()

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
      update: {},
      create: {
        commessaId: originale.commessaId,
        operaioId: nuovoOperaioId,
        data: originale.data,
      },
    }),
  ])

  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/calendario')
}
