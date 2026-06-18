'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function creaPianificazioneConStima(input: {
  operaioId: string
  commessaId: string
  data: string
  lavoroDaFare?: string
  stimaImpresaOre?: number
}): Promise<void> {
  await requireImpresa()

  await prisma.pianificazione.upsert({
    where: {
      commessaId_operaioId_data: {
        commessaId: input.commessaId,
        operaioId: input.operaioId,
        data: new Date(input.data),
      },
    },
    update: {
      lavoroDaFare: input.lavoroDaFare ?? null,
      stimaImpresaOre: input.stimaImpresaOre ?? null,
      confermata: true,
    },
    create: {
      commessaId: input.commessaId,
      operaioId: input.operaioId,
      data: new Date(input.data),
      lavoroDaFare: input.lavoroDaFare ?? null,
      stimaImpresaOre: input.stimaImpresaOre ?? null,
      confermata: true,
    },
  })

  revalidatePath('/impresa/pianificazione/domani')
  revalidatePath('/impresa/pianificazione')
  revalidatePath('/operaio/domani')
}
