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

  await prisma.$transaction(async tx => {
    const fattura = await tx.fatturaPassiva.findUnique({ where: { id: fatturaId } })
    if (!fattura) throw new Error('Fattura non trovata')
    if (fattura.stato === 'pagata') throw new Error('Fattura già interamente pagata')

    const giaIncassato = fattura.importoPagato ?? 0
    const nuovoTotale = giaIncassato + importoPagato
    const completamentePagata = nuovoTotale >= fattura.importo
    const nuovoStato = completamentePagata ? 'pagata' : 'parzialmente_pagata'

    await tx.fatturaPassiva.update({
      where: { id: fatturaId },
      data: {
        stato: nuovoStato,
        dataPagamento: completamentePagata ? new Date(dataPagamento) : fattura.dataPagamento,
        importoPagato: nuovoTotale,
      },
    })
  })

  revalidatePath('/impresa/fatture-passive')
  revalidatePath(`/impresa/fatture-passive/${fatturaId}`)
  revalidatePath('/ufficio/fatture-passive')
  revalidatePath(`/ufficio/fatture-passive/${fatturaId}`)
}

export async function eliminaFatturaPassiva(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()

  await prisma.$transaction(async tx => {
    const fattura = await tx.fatturaPassiva.findUnique({ where: { id: fatturaId } })
    if (!fattura) throw new Error('Fattura non trovata')
    if (fattura.stato === 'pagata' || fattura.stato === 'parzialmente_pagata') {
      throw new Error('Non puoi eliminare una fattura con pagamenti già registrati')
    }

    await tx.fatturaPassiva.delete({ where: { id: fatturaId } })
  })

  revalidatePath('/impresa/fatture-passive')
  revalidatePath('/ufficio/fatture-passive')
  redirect('/impresa/fatture-passive')
}
