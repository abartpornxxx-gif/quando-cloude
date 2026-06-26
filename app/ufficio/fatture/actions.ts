'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function eliminaFatturaAttivaUfficio(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()
  const fattura = await prisma.fatturaAttiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'incassata' || fattura.stato === 'parzialmente_incassata') {
    throw new Error('Non puoi eliminare una fattura con incassi già registrati')
  }
  await prisma.fatturaAttiva.delete({ where: { id: fatturaId } })
  revalidatePath('/ufficio/fatture')
  redirect('/ufficio/fatture')
}

export async function segnaScadutaUfficio(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()
  const fattura = await prisma.fatturaAttiva.findUnique({ where: { id: fatturaId }, select: { stato: true } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'incassata' || fattura.stato === 'parzialmente_incassata') {
    throw new Error('Non puoi segnare come scaduta una fattura con incassi registrati')
  }
  await prisma.fatturaAttiva.update({ where: { id: fatturaId }, data: { stato: 'scaduta' } })
  revalidatePath('/ufficio/fatture')
  revalidatePath(`/ufficio/fatture/${fatturaId}`)
}
