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

export async function analizzaFatturaPDFConIA(fileBase64: string, mimeType: string) {
  try {
    await requireUfficio()
    const { analizzaDocumentoFattura } = await import('@/lib/ai')
    return await analizzaDocumentoFattura(fileBase64, mimeType)
  } catch (err: any) {
    console.error('SERVER_ERROR: analizzaFatturaPDFConIA error:', err)
    throw new Error('Assistente AI momentaneamente non disponibile. Verifica la configurazione o riprova più tardi.')
  }
}

export async function salvaFatturaPassivaSingola(data: {
  numero?: string
  data: string
  fornitoreId?: string
  commessaId?: string
  importo: number // in cents
  dataScadenza?: string
  stato: 'da_pagare' | 'pagata'
  controllata: boolean
  note?: string
}) {
  await requireUfficio()

  await prisma.fatturaPassiva.create({
    data: {
      data: new Date(data.data),
      numero: data.numero || null,
      fornitoreId: data.fornitoreId || null,
      commessaId: data.commessaId || null,
      importo: data.importo,
      dataScadenza: data.dataScadenza ? new Date(data.dataScadenza) : null,
      stato: data.stato,
      controllata: data.controllata,
      note: data.note || null,
    }
  })

  revalidatePath('/ufficio/fatture-passive')
  revalidatePath('/ufficio/commesse')
  revalidatePath('/ufficio/dashboard')
  revalidatePath('/ufficio/saldi-pendenti')
}
