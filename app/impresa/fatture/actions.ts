'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function creaFatturaAttiva(input: {
  numero: string
  anno: number
  data: string
  dataScadenza?: string
  clienteId?: string
  commessaId?: string
  aliquotaIva: number
  note?: string
  righe: Array<{ descrizione: string; quantita: number; prezzoUnitario: number }>
}): Promise<string> {
  await requireImpresa()

  const fattura = await prisma.fatturaAttiva.create({
    data: {
      numero: input.numero.trim(),
      anno: input.anno,
      data: new Date(input.data),
      dataScadenza: input.dataScadenza ? new Date(input.dataScadenza) : null,
      clienteId: input.clienteId || null,
      commessaId: input.commessaId || null,
      aliquotaIva: input.aliquotaIva,
      note: input.note || null,
      righe: {
        create: input.righe.map((r, i) => ({
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzoUnitario: r.prezzoUnitario,
          ordine: i,
        })),
      },
    },
  })

  revalidatePath('/impresa/fatture')
  return fattura.id
}

export async function registraIncasso(
  fatturaId: string,
  dataIncasso: string,
  importoIncassato: number
): Promise<void> {
  await requireImpresa()

  const fattura = await prisma.fatturaAttiva.findUnique({
    where: { id: fatturaId },
  })
  if (!fattura) throw new Error('Fattura non trovata')

  await prisma.$transaction(async tx => {
    await tx.fatturaAttiva.update({
      where: { id: fatturaId },
      data: {
        stato: 'incassata',
        dataIncasso: new Date(dataIncasso),
        importoIncassato,
      },
    })
    // Propaga il fatturato sulla commessa
    if (fattura.commessaId) {
      await tx.commessa.update({
        where: { id: fattura.commessaId },
        data: { fatturato: { increment: importoIncassato } },
      })
    }
  })

  revalidatePath('/impresa/fatture')
  revalidatePath(`/impresa/fatture/${fatturaId}`)
  if (fattura.commessaId) revalidatePath(`/impresa/commesse/${fattura.commessaId}`)
}

export async function segnaScaduta(fatturaId: string): Promise<void> {
  await requireImpresa()
  await prisma.fatturaAttiva.update({
    where: { id: fatturaId },
    data: { stato: 'scaduta' },
  })
  revalidatePath('/impresa/fatture')
  revalidatePath(`/impresa/fatture/${fatturaId}`)
}

export async function eliminaFatturaAttiva(fatturaId: string): Promise<void> {
  await requireImpresa()

  const fattura = await prisma.fatturaAttiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'incassata') throw new Error('Non puoi eliminare una fattura già incassata')

  await prisma.fatturaAttiva.delete({ where: { id: fatturaId } })
  revalidatePath('/impresa/fatture')
  redirect('/impresa/fatture')
}
