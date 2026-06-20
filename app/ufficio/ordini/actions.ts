'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function eliminaOrdineUfficio(ordineId: string): Promise<void> {
  await requireImpresaOUfficio()
  const ordine = await prisma.ordineFornitore.findUnique({ where: { id: ordineId } })
  if (!ordine) throw new Error('Ordine non trovato')
  if (ordine.stato !== 'richiesto') throw new Error('Puoi eliminare solo ordini in stato "richiesto"')
  await prisma.ordineFornitore.delete({ where: { id: ordineId } })
  revalidatePath('/ufficio/ordini')
  redirect('/ufficio/ordini')
}
