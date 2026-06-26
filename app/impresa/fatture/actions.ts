'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
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
  await requireImpresaOUfficio()

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
  nuovoImporto: number
): Promise<void> {
  await requireImpresaOUfficio()

  // Tutto dentro la transazione per evitare race condition su incassi concorrenti
  const commessaId = await prisma.$transaction(async tx => {
    const fattura = await tx.fatturaAttiva.findUnique({
      where: { id: fatturaId },
      include: { righe: true },
    })
    if (!fattura) throw new Error('Fattura non trovata')
    if (fattura.stato === 'incassata') throw new Error('Fattura già interamente incassata')

    const imponibile = fattura.righe.reduce(
      (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
      0
    )
    const iva = Math.round(imponibile * fattura.aliquotaIva / 100)
    const totaleFattura = imponibile + iva

    const giaIncassato = fattura.importoIncassato ?? 0
    const residuo = totaleFattura - giaIncassato
    if (nuovoImporto <= 0) throw new Error('Importo non valido')
    if (nuovoImporto > residuo) throw new Error(`Importo superiore al residuo (${(residuo / 100).toFixed(2)} €)`)

    const nuovoTotaleIncassato = giaIncassato + nuovoImporto
    const completamenteIncassata = nuovoTotaleIncassato >= totaleFattura
    const nuovoStato = completamenteIncassata ? 'incassata' : 'parzialmente_incassata'

    await tx.fatturaAttiva.update({
      where: { id: fatturaId },
      data: {
        stato: nuovoStato,
        dataIncasso: completamenteIncassata ? new Date(dataIncasso) : fattura.dataIncasso,
        importoIncassato: nuovoTotaleIncassato,
      },
    })
    if (fattura.commessaId) {
      await tx.commessa.update({
        where: { id: fattura.commessaId },
        data: { fatturato: { increment: nuovoImporto } },
      })
    }
    return fattura.commessaId
  })

  revalidatePath('/impresa/fatture')
  revalidatePath(`/impresa/fatture/${fatturaId}`)
  if (commessaId) revalidatePath(`/impresa/commesse/${commessaId}`)
  revalidatePath('/ufficio/fatture')
  revalidatePath(`/ufficio/fatture/${fatturaId}`)
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
  if (commessaId) {
    revalidatePath(`/ufficio/commesse/${commessaId}`)
  }
}

export async function segnaScaduta(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()
  const fattura = await prisma.fatturaAttiva.findUnique({ where: { id: fatturaId }, select: { stato: true } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'incassata' || fattura.stato === 'parzialmente_incassata') {
    throw new Error('Non puoi segnare come scaduta una fattura con incassi registrati')
  }
  await prisma.fatturaAttiva.update({
    where: { id: fatturaId },
    data: { stato: 'scaduta' },
  })
  revalidatePath('/impresa/fatture')
  revalidatePath(`/impresa/fatture/${fatturaId}`)
  revalidatePath('/ufficio/fatture')
  revalidatePath(`/ufficio/fatture/${fatturaId}`)
  revalidatePath('/ufficio/saldi-pendenti')
  revalidatePath('/ufficio/dashboard')
  revalidatePath('/ufficio/notifiche')
}

export async function eliminaFatturaAttiva(fatturaId: string): Promise<void> {
  await requireImpresaOUfficio()

  const fattura = await prisma.fatturaAttiva.findUnique({ where: { id: fatturaId } })
  if (!fattura) throw new Error('Fattura non trovata')
  if (fattura.stato === 'incassata' || fattura.stato === 'parzialmente_incassata') throw new Error('Non puoi eliminare una fattura con incassi già registrati')

  await prisma.fatturaAttiva.delete({ where: { id: fatturaId } })
  revalidatePath('/impresa/fatture')
  redirect('/impresa/fatture')
}
