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
  const [nGiornate, nPianificazioni, nUsi] = await Promise.all([
    prisma.giornata.count({ where: { mezzoId: id } }),
    prisma.pianificazione.count({ where: { mezzoId: id } }),
    prisma.attrezzaturaUso.count({ where: { mezzoId: id } }),
  ])
  const totale = nGiornate + nPianificazioni + nUsi
  if (totale > 0) {
    const parti: string[] = []
    if (nGiornate > 0) parti.push(`${nGiornate} giornat${nGiornate === 1 ? 'a' : 'e'}`)
    if (nPianificazioni > 0) parti.push(`${nPianificazioni} pianificazion${nPianificazioni === 1 ? 'e' : 'i'}`)
    if (nUsi > 0) parti.push(`${nUsi} uso attrezzatura`)
    throw new Error(`Impossibile eliminare il mezzo: è associato a ${parti.join(', ')}.`)
  }
  await prisma.mezzo.delete({ where: { id } })
  revalidatePath('/impresa/mezzi')
}
