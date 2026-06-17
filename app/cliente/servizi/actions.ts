'use server'

import { prisma } from '@/lib/prisma'
import { requireCliente } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function inviaRichiesta(offertaId: string, commessaId: string | null, note: string) {
  const { cliente } = await requireCliente()

  await prisma.richiestaOfferta.create({
    data: {
      offertaId,
      clienteId: cliente.id,
      commessaId: commessaId || null,
      note: note.trim() || null,
      stato: 'nuova',
    },
  })

  revalidatePath('/cliente/servizi')
}
