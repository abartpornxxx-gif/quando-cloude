'use server'

import { prisma } from '@/lib/prisma'
import { requireUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type FatturaImportInput = {
  data: string
  numero?: string
  fornitoreId?: string
  commessaId?: string
  importo: number // in cents
  dataScadenza?: string
  stato: 'da_pagare' | 'pagata'
  controllata: boolean
  note?: string
}

export async function importaFatturePassive(items: FatturaImportInput[]): Promise<{ count: number }> {
  await requireUfficio()

  const count = await prisma.$transaction(async (tx) => {
    let created = 0
    for (const item of items) {
      await tx.fatturaPassiva.create({
        data: {
          data: new Date(item.data),
          numero: item.numero || null,
          fornitoreId: item.fornitoreId || null,
          commessaId: item.commessaId || null,
          importo: item.importo,
          dataScadenza: item.dataScadenza ? new Date(item.dataScadenza) : null,
          stato: item.stato,
          controllata: item.controllata,
          note: item.note || null,
        }
      })
      created++
    }
    return created
  })

  revalidatePath('/ufficio/fatture-passive')
  revalidatePath('/ufficio/commesse')
  revalidatePath('/ufficio/dashboard')
  revalidatePath('/ufficio/saldi-pendenti')

  return { count }
}
