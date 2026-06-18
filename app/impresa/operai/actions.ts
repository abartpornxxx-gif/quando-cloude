'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents } from '@/lib/format'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaOperaio(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const skillsJson = formData.get('skills') as string

  let skills = []
  try { skills = JSON.parse(skillsJson) } catch { skills = [] }

  const data = {
    nome: formData.get('nome') as string,
    email: (formData.get('email') as string) || null,
    ruolo: (formData.get('ruolo') as string) || null,
    costoOrario: euroToCents(formData.get('costoOrario') as string),
    zona: (formData.get('zona') as string) || null,
    skills,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.operaio.update({ where: { id }, data })
  } else {
    await prisma.operaio.create({ data })
  }
  redirect('/impresa/operai')
}

export async function eliminaOperaio(id: string) {
  await requireImpresa()
  const [nGiornate, nRichieste, nUsi] = await Promise.all([
    prisma.giornata.count({ where: { operaioId: id } }),
    prisma.richiestaMateriale.count({ where: { operaioId: id } }),
    prisma.attrezzaturaUso.count({ where: { operaioId: id } }),
  ])
  const totale = nGiornate + nRichieste + nUsi
  if (totale > 0) {
    const parti: string[] = []
    if (nGiornate > 0) parti.push(`${nGiornate} giornat${nGiornate === 1 ? 'a' : 'e'} di lavoro`)
    if (nRichieste > 0) parti.push(`${nRichieste} richiesta materiale`)
    if (nUsi > 0) parti.push(`${nUsi} uso attrezzatura`)
    throw new Error(`Impossibile eliminare l'operaio: ha ${parti.join(', ')} registrat${totale === 1 ? 'o' : 'i'}. L'operaio ha dello storico che non può essere cancellato.`)
  }
  await prisma.operaio.delete({ where: { id } })
  revalidatePath('/impresa/operai')
}
