'use server'

import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function creaClienteLibero({
  nome, telefono, email, indirizzo, partitaIva, note,
}: {
  nome: string
  telefono?: string
  email?: string
  indirizzo?: string
  partitaIva?: string
  note?: string
}): Promise<string> {
  await requireLibero()

  const cliente = await prisma.cliente.create({
    data: {
      nome,
      telefono: telefono || undefined,
      email: email || undefined,
      indirizzo: indirizzo || undefined,
      partitaIva: partitaIva || undefined,
      note: note || undefined,
    },
  })

  return cliente.id
}
