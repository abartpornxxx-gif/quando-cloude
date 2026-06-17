'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function richiediAssenza(formData: FormData): Promise<void> {
  const { operaio } = await requireOperaio()

  const dataInizio = formData.get('dataInizio') as string
  const dataFine = formData.get('dataFine') as string
  const tipo = formData.get('tipo') as string
  const note = (formData.get('note') as string) || null

  if (!dataInizio || !dataFine || !tipo) throw new Error('Dati mancanti')
  if (new Date(dataInizio) > new Date(dataFine)) throw new Error('Data inizio successiva alla data fine')

  await prisma.assenza.create({
    data: {
      operaioId: operaio.id,
      dataInizio: new Date(dataInizio),
      dataFine: new Date(dataFine),
      tipo: tipo as 'ferie' | 'permesso' | 'malattia' | 'altro',
      note,
    },
  })

  revalidatePath('/operaio/profilo')
  revalidatePath('/impresa/assenze')
  redirect('/operaio/profilo')
}
