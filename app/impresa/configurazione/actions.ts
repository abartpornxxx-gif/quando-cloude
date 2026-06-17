'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function salvaConfigurazioneOrari(input: {
  durataMattinaMinuti: number
  durataPausaMinuti: number
  durataPomeriggioMinuti: number
}): Promise<void> {
  await requireImpresa()

  const esistente = await prisma.configurazioneOrari.findFirst()
  if (esistente) {
    await prisma.configurazioneOrari.update({
      where: { id: esistente.id },
      data: input,
    })
  } else {
    await prisma.configurazioneOrari.create({ data: input })
  }

  revalidatePath('/impresa/configurazione')
}

export async function salvaPianificazioneDettagli(
  pianificazioneId: string,
  lavoroDaFare: string,
  noteMateriale: string
): Promise<void> {
  await requireImpresa()
  await prisma.pianificazione.update({
    where: { id: pianificazioneId },
    data: {
      lavoroDaFare: lavoroDaFare.trim() || null,
      noteMateriale: noteMateriale.trim() || null,
    },
  })
  revalidatePath('/impresa/pianificazione')
  revalidatePath('/impresa/giornate')
}
