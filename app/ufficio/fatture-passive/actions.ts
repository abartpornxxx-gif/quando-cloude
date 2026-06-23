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

export async function toggleControllata(fatturaId: string, nuovoValore: boolean): Promise<void> {
  await requireImpresaOUfficio()
  await prisma.fatturaPassiva.update({
    where: { id: fatturaId },
    data: { controllata: nuovoValore },
  })
  revalidatePath(`/ufficio/fatture-passive/${fatturaId}`)
  revalidatePath('/ufficio/fatture-passive')
  redirect(`/ufficio/fatture-passive/${fatturaId}`)
}

export async function aggiornaNoteUfficio(fatturaId: string, formData: FormData): Promise<void> {
  await requireImpresaOUfficio()
  const note = (formData.get('note') as string | null) ?? ''
  await prisma.fatturaPassiva.update({
    where: { id: fatturaId },
    data: { note: note.trim() || null },
  })
  revalidatePath(`/ufficio/fatture-passive/${fatturaId}`)
  redirect(`/ufficio/fatture-passive/${fatturaId}`)
}

export async function annullaPagamento(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()
  const fattura = await prisma.fatturaPassiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato !== 'pagata') throw new Error('La fattura non risulta pagata')
  await prisma.fatturaPassiva.update({
    where: { id: fatturaId },
    data: { stato: 'da_pagare', dataPagamento: null, importoPagato: null },
  })
  revalidatePath(`/ufficio/fatture-passive/${fatturaId}`)
  revalidatePath('/ufficio/fatture-passive')
  redirect(`/ufficio/fatture-passive/${fatturaId}`)
}
