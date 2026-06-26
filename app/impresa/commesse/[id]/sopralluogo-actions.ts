'use server'

import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function salvaSopralluogo(commessaId: string, data: any) {
  await requireImpresa()

  await prisma.sopralluogo.upsert({
    where: { commessaId },
    update: {
      dataSopralluogo: new Date(data.dataSopralluogo),
      referentePresente: data.referentePresente,
      indirizzo: data.indirizzo,
      noteTecniche: data.noteTecniche,
      materialiPrevisti: data.materialiPrevisti,
      criticita: data.criticita,
      istruzioniOperai: data.istruzioniOperai,
    },
    create: {
      commessaId,
      dataSopralluogo: new Date(data.dataSopralluogo),
      referentePresente: data.referentePresente,
      indirizzo: data.indirizzo,
      noteTecniche: data.noteTecniche,
      materialiPrevisti: data.materialiPrevisti,
      criticita: data.criticita,
      istruzioniOperai: data.istruzioniOperai,
    },
  })

  revalidatePath(`/impresa/commesse/${commessaId}`)
}
