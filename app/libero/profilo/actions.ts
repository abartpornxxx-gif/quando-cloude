'use server'

import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function aggiornaProfilo({
  id, nome, partitaIva, indirizzo, email, telefono, note,
}: {
  id: string
  nome: string
  partitaIva?: string
  indirizzo?: string
  email?: string
  telefono?: string
  note?: string
}) {
  await requireLibero()

  await prisma.liberoProfessionista.update({
    where: { id },
    data: {
      nome,
      partitaIva: partitaIva || undefined,
      indirizzo: indirizzo || undefined,
      email: email || undefined,
      telefono: telefono || undefined,
      note: note || undefined,
    },
  })

  revalidatePath('/libero/profilo')
}
