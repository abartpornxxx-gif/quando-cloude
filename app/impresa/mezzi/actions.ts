'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoMezzo } from '@/app/generated/prisma/client'

export async function salvaMezzo(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null

  const parseDate = (v: FormDataEntryValue | null) => {
    const s = v as string
    return s ? new Date(s) : null
  }

  const data = {
    nome: formData.get('nome') as string,
    targa: (formData.get('targa') as string) || null,
    stato: formData.get('stato') as StatoMezzo,
    scadenzaBollo: parseDate(formData.get('scadenzaBollo')),
    scadenzaRevisione: parseDate(formData.get('scadenzaRevisione')),
    scadenzaAssicurazione: parseDate(formData.get('scadenzaAssicurazione')),
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.mezzo.update({ where: { id }, data })
  } else {
    await prisma.mezzo.create({ data })
  }
  redirect('/impresa/mezzi')
}

export async function eliminaMezzo(id: string) {
  await requireImpresa()
  await prisma.mezzo.delete({ where: { id } })
  revalidatePath('/impresa/mezzi')
}
