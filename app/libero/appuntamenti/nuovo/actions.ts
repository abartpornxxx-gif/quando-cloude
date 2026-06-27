'use server'

import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function creaAppuntamento({
  titolo, dataOra, luogo, tipo, descrizione,
}: {
  titolo: string
  dataOra: string
  luogo?: string
  tipo?: string
  descrizione?: string
}) {
  await requireLibero()

  await prisma.promemoria.create({
    data: {
      titolo,
      dataOra: new Date(dataOra),
      luogo: luogo || undefined,
      tipo: tipo || 'intervento',
      descrizione: descrizione || undefined,
      perImpresa: false,
    },
  })

  revalidatePath('/libero/appuntamenti')
}
