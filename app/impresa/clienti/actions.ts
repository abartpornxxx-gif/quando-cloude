'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function salvaCliente(formData: FormData) {
  await requireImpresa()
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
    codiceDestinatario: (formData.get('codiceDestinatario') as string) || null,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.cliente.update({ where: { id }, data })
  } else {
    await prisma.cliente.create({ data })
  }

  redirect('/impresa/clienti')
}

export async function eliminaCliente(id: string) {
  await requireImpresa()
  await prisma.cliente.delete({ where: { id } })
  revalidatePath('/impresa/clienti')
}
