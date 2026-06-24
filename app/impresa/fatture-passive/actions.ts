'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function creaFatturaPassiva(input: {
  fornitoreId?: string
  commessaId?: string
  ordineId?: string
  numero?: string
  data: string
  dataScadenza?: string
  importo: number
  note?: string
}): Promise<string> {
  await requireImpresaOUfficio()

  const fattura = await prisma.fatturaPassiva.create({
    data: {
      fornitoreId: input.fornitoreId || null,
      commessaId: input.commessaId || null,
      ordineId: input.ordineId || null,
      numero: input.numero?.trim() || null,
      data: new Date(input.data),
      dataScadenza: input.dataScadenza ? new Date(input.dataScadenza) : null,
      importo: input.importo,
      note: input.note || null,
    },
  })

  revalidatePath('/impresa/fatture-passive')
  revalidatePath('/ufficio/fatture-passive')
  return fattura.id
}

export async function registraPagamento(
  fatturaId: string,
  dataPagamento: string,
  importoPagato: number
): Promise<void> {
  await requireImpresaOUfficio()

  const fattura = await prisma.fatturaPassiva.findUnique({
    where: { id: fatturaId }
  })
  if (!fattura) throw new Error('Fattura non trovata')
  
  const giaPagato = fattura.importoPagato ?? 0
  const nuovoImportoPagato = giaPagato + importoPagato
  
  if (importoPagato <= 0) throw new Error('Importo pagato non valido')
  if (nuovoImportoPagato > fattura.importo) {
    const residuo = fattura.importo - giaPagato
    throw new Error(`Importo superiore al residuo (${(residuo / 100).toFixed(2)} €)`)
  }

  const completamentePagata = nuovoImportoPagato >= fattura.importo
  const nuovoStato = completamentePagata ? 'pagata' : 'parzialmente_pagata'

  await prisma.fatturaPassiva.update({
    where: { id: fatturaId },
    data: {
      stato: nuovoStato,
      dataPagamento: new Date(dataPagamento),
      importoPagato: nuovoImportoPagato,
    },
  })

  revalidatePath('/impresa/fatture-passive')
  revalidatePath(`/impresa/fatture-passive/${fatturaId}`)
  revalidatePath('/ufficio/fatture-passive')
  revalidatePath(`/ufficio/fatture-passive/${fatturaId}`)
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
}

export async function eliminaFatturaPassiva(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()

  const fattura = await prisma.fatturaPassiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'pagata') throw new Error('Non puoi eliminare una fattura già pagata')

  await prisma.fatturaPassiva.delete({ where: { id: fatturaId } })
  revalidatePath('/impresa/fatture-passive')
  revalidatePath('/ufficio/fatture-passive')
  redirect('/impresa/fatture-passive')
}
