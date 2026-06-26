'use server'

import { prisma } from '@/lib/prisma'
import { requireCliente } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function richiediDiCo(formData: FormData) {
  const { cliente } = await requireCliente()
  
  const commessaId = formData.get('commessaId') as string
  const note = formData.get('note') as string

  if (commessaId) {
    const commessa = await prisma.commessa.findFirst({
      where: { id: commessaId, clienteId: cliente.id },
      select: { id: true },
    })
    if (!commessa) throw new Error('Commessa non valida')
  }

  await prisma.richiestaDiCo.create({
    data: {
      clienteId: cliente.id,
      commessaId: commessaId || null,
      note: note || null,
    }
  })

  revalidatePath('/cliente/documenti')
  redirect('/cliente/documenti')
}
