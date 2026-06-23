'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// Helper per convertire stringa euro (es. "150,50" o "150.5") in centesimi intero
function toCentesimi(euroStr: string | null): number {
  if (!euroStr) return 0
  const normalized = euroStr.replace(',', '.').trim()
  const val = parseFloat(normalized)
  return isNaN(val) ? 0 : Math.round(val * 100)
}

// ─── VARIANTI LAVORO ─────────────────────────────────────────────────────────

export async function salvaVarianteLavoro(commessaId: string, formData: FormData) {
  await requireImpresaOUfficio()

  const id = formData.get('id') as string | null
  const titolo = formData.get('titolo') as string
  const descrizione = (formData.get('descrizione') as string) || null
  const importo = toCentesimi(formData.get('importo') as string)
  const costoStimato = toCentesimi(formData.get('costoStimato') as string)
  const stato = formData.get('stato') as any // StatoVariante
  const note = (formData.get('note') as string) || null
  const fileUrl = (formData.get('fileUrl') as string) || null

  const data: any = {
    commessaId,
    titolo,
    descrizione,
    importo,
    costoStimato,
    stato,
    note,
    fileUrl,
    approvatoAt: stato === 'approvata' ? new Date() : null,
  }

  if (id) {
    await prisma.varianteLavoro.update({
      where: { id },
      data,
    })
  } else {
    await prisma.varianteLavoro.create({
      data,
    })
  }

  revalidatePath(`/ufficio/commesse/${commessaId}`)
  redirect(`/ufficio/commesse/${commessaId}`)
}

export async function eliminaVarianteLavoro(commessaId: string, id: string) {
  await requireImpresaOUfficio()
  await prisma.varianteLavoro.delete({
    where: { id },
  })
  revalidatePath(`/ufficio/commesse/${commessaId}`)
}

// ─── RICHIESTE PREVENTIVI FORNITORI ─────────────────────────────────────────

export async function salvaRichiestaPreventivo(commessaId: string, formData: FormData) {
  await requireImpresaOUfficio()

  const id = formData.get('id') as string | null
  const fornitoreId = formData.get('fornitoreId') as string
  const descrizione = formData.get('descrizione') as string
  const varianteId = (formData.get('varianteId') as string) || null
  const stato = formData.get('stato') as any // StatoPreventivoFornitore
  const note = (formData.get('note') as string) || null
  const fileUrl = (formData.get('fileUrl') as string) || null
  const dataScadenzaStr = formData.get('dataScadenza') as string | null
  const dataScadenza = dataScadenzaStr ? new Date(dataScadenzaStr) : null

  const data: any = {
    commessaId,
    fornitoreId,
    descrizione,
    varianteId: varianteId === '' ? null : varianteId,
    stato,
    note,
    fileUrl,
    dataScadenza,
  }

  if (id) {
    await prisma.richiestaPreventivoFornitore.update({
      where: { id },
      data,
    })
  } else {
    await prisma.richiestaPreventivoFornitore.create({
      data,
    })
  }

  revalidatePath(`/ufficio/commesse/${commessaId}`)
  redirect(`/ufficio/commesse/${commessaId}`)
}

export async function eliminaRichiestaPreventivo(commessaId: string, id: string) {
  await requireImpresaOUfficio()
  await prisma.richiestaPreventivoFornitore.delete({
    where: { id },
  })
  revalidatePath(`/ufficio/commesse/${commessaId}`)
}
