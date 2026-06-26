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
  const [nCommesse, nPreventivi, nFatture, nRichieste, nManutenzioni, nProposte] = await Promise.all([
    prisma.commessa.count({ where: { clienteId: id } }),
    prisma.preventivo.count({ where: { clienteId: id } }),
    prisma.fatturaAttiva.count({ where: { clienteId: id } }),
    prisma.richiestaOfferta.count({ where: { clienteId: id } }),
    prisma.manutenzioneProgrammata.count({ where: { clienteId: id } }),
    prisma.propostaIntervento.count({ where: { clienteId: id } }),
  ])
  const totale = nCommesse + nPreventivi + nFatture + nRichieste + nManutenzioni + nProposte
  if (totale > 0) {
    const parti: string[] = []
    if (nCommesse > 0) parti.push(`${nCommesse} commess${nCommesse === 1 ? 'a' : 'e'}`)
    if (nPreventivi > 0) parti.push(`${nPreventivi} preventiv${nPreventivi === 1 ? 'o' : 'i'}`)
    if (nFatture > 0) parti.push(`${nFatture} fattur${nFatture === 1 ? 'a' : 'e'}`)
    if (nRichieste > 0) parti.push(`${nRichieste} richiesta offerte`)
    if (nManutenzioni > 0) parti.push(`${nManutenzioni} manutenzion${nManutenzioni === 1 ? 'e' : 'i'}`)
    if (nProposte > 0) parti.push(`${nProposte} proposta intervento`)
    throw new Error(`Impossibile eliminare il cliente: ha ${parti.join(', ')} associat${totale === 1 ? 'a' : 'e'}. Elimina prima i record collegati.`)
  }
  await prisma.cliente.delete({ where: { id } })
  revalidatePath('/impresa/clienti')
}
