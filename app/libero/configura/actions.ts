'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function creaProfiloLibero({
  nome, email, telefono, partitaIva, authUserId,
}: {
  nome: string
  email: string
  telefono?: string
  partitaIva?: string
  authUserId: string
}) {
  const esiste = await prisma.liberoProfessionista.findFirst({
    where: { authUserId },
  })
  if (esiste) return

  await prisma.liberoProfessionista.create({
    data: {
      nome,
      email: email || undefined,
      telefono: telefono || undefined,
      partitaIva: partitaIva || undefined,
      authUserId,
    },
  })
}
