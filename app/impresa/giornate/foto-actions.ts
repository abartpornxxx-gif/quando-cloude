'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function togglePrivacyFoto(fotoId: string, currentState: boolean, giornataId: string) {
  await requireImpresaOUfficio()
  
  await prisma.giornataFoto.update({
    where: { id: fotoId },
    data: { visibileCliente: !currentState }
  })
  
  revalidatePath(`/impresa/giornate/${giornataId}/rapportino`)
}
