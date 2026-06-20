'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function eliminaFatturaPassivaUfficio(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()
  const fattura = await prisma.fatturaPassiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'pagata') throw new Error('Non puoi eliminare una fattura già pagata')
  await prisma.fatturaPassiva.delete({ where: { id: fatturaId } })
  revalidatePath('/ufficio/fatture-passive')
  redirect('/ufficio/fatture-passive')
}
