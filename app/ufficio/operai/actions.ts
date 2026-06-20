'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaOperaioUfficio(formData: FormData) {
  await requireImpresaOUfficio()
  const id = formData.get('id') as string | null

  const data = {
    nome: formData.get('nome') as string,
    email: (formData.get('email') as string) || null,
    ruolo: (formData.get('ruolo') as string) || null,
    zona: (formData.get('zona') as string) || null,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.operaio.update({ where: { id }, data })
  } else {
    await prisma.operaio.create({ data: { ...data, costoOrario: 0 } })
  }
  redirect('/ufficio/operai')
}

export async function eliminaOperaioUfficio(id: string) {
  await requireImpresaOUfficio()
  const [nGiornate, nRichieste, nUsi] = await Promise.all([
    prisma.giornata.count({ where: { operaioId: id } }),
    prisma.richiestaMateriale.count({ where: { operaioId: id } }),
    prisma.attrezzaturaUso.count({ where: { operaioId: id } }),
  ])
  const totale = nGiornate + nRichieste + nUsi
  if (totale > 0) {
    const parti: string[] = []
    if (nGiornate > 0) parti.push(`${nGiornate} giornate`)
    if (nRichieste > 0) parti.push(`${nRichieste} richieste materiale`)
    if (nUsi > 0) parti.push(`${nUsi} usi attrezzatura`)
    throw new Error(`Impossibile eliminare l'operaio: ha ${parti.join(', ')} registrati.`)
  }
  await prisma.operaio.delete({ where: { id } })
  revalidatePath('/ufficio/operai')
}
