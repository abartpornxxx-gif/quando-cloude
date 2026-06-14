'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents } from '@/lib/format'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaMateriale(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const data = {
    codice: (formData.get('codice') as string) || null,
    descrizione: formData.get('descrizione') as string,
    prezzo: euroToCents(formData.get('prezzo') as string),
    unita: (formData.get('unita') as string) || 'pz',
  }
  if (id) { await prisma.materiale.update({ where: { id }, data }) }
  else { await prisma.materiale.create({ data }) }
  redirect('/impresa/materiali')
}

export async function eliminaMateriale(id: string) {
  await requireImpresa()
  await prisma.materiale.delete({ where: { id } })
  revalidatePath('/impresa/materiali')
}

/** Import da CSV: ogni riga è { codice, descrizione, prezzo } */
export async function importaCSV(righe: Array<{ codice: string; descrizione: string; prezzo: string; unita: string }>) {
  await requireImpresa()

  await prisma.materiale.createMany({
    data: righe.map(r => ({
      codice: r.codice || null,
      descrizione: r.descrizione,
      prezzo: euroToCents(r.prezzo),
      unita: r.unita || 'pz',
    })),
    skipDuplicates: false,
  })

  revalidatePath('/impresa/materiali')
}
