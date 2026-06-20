'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaFornitoreUfficio(formData: FormData) {
  await requireImpresaOUfficio()
  const id = formData.get('id') as string | null

  const data = {
    nome: formData.get('nome') as string,
    partitaIva: (formData.get('partitaIva') as string) || null,
    codiceFiscale: (formData.get('codiceFiscale') as string) || null,
    indirizzo: (formData.get('indirizzo') as string) || null,
    citta: (formData.get('citta') as string) || null,
    cap: (formData.get('cap') as string) || null,
    provincia: (formData.get('provincia') as string) || null,
    email: (formData.get('email') as string) || null,
    telefono: (formData.get('telefono') as string) || null,
    pec: (formData.get('pec') as string) || null,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.fornitore.update({ where: { id }, data })
  } else {
    await prisma.fornitore.create({ data })
  }
  redirect('/ufficio/fornitori')
}

export async function eliminaFornitoreUfficio(id: string) {
  await requireImpresaOUfficio()
  const nOrdini = await prisma.ordineFornitore.count({ where: { fornitoreId: id } })
  if (nOrdini > 0) throw new Error(`Impossibile eliminare il fornitore: ha ${nOrdini} ordini associati.`)
  await prisma.fornitore.delete({ where: { id } })
  revalidatePath('/ufficio/fornitori')
}
