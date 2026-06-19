'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function applicaChecklist(commessaId: string) {
  await requireImpresa()

  const commessa = await prisma.commessa.findUnique({
    where: { id: commessaId },
    select: { tipoLavoroId: true },
  })
  if (!commessa?.tipoLavoroId) {
    throw new Error('Nessun tipo di lavoro assegnato alla commessa. Selezionalo prima nel form.')
  }

  const modelli = await prisma.adempimentoModello.findMany({
    where: { tipoLavoroId: commessa.tipoLavoroId },
    orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
  })

  const esistenti = await prisma.adempimentoCommessa.findMany({
    where: { commessaId, modelloId: { not: null } },
    select: { modelloId: true },
  })
  const esistentiIds = new Set(esistenti.map(e => e.modelloId))

  const nuovi = modelli.filter(m => !esistentiIds.has(m.id))
  if (nuovi.length === 0) return

  await prisma.adempimentoCommessa.createMany({
    data: nuovi.map(m => ({
      commessaId,
      modelloId: m.id,
      testo: m.testo,
      note: m.note,
      collegamento: m.collegamento,
      ordine: m.ordine,
    })),
  })

  revalidatePath(`/impresa/commesse/${commessaId}`)
}

export async function toggleAdempimento(adempimentoId: string, commessaId: string, fatto: boolean, notaSpunta?: string) {
  const user = await requireImpresa()

  await prisma.adempimentoCommessa.update({
    where: { id: adempimentoId },
    data: {
      fatto,
      fattoDa: fatto ? (user.email ?? 'Impresa') : null,
      fattoAt: fatto ? new Date() : null,
      notaSpunta: fatto ? (notaSpunta || null) : null,
    },
  })

  revalidatePath(`/impresa/commesse/${commessaId}`)
}

export async function aggiungiAdempimentoCustom(commessaId: string, formData: FormData) {
  await requireImpresa()

  const testo = formData.get('testo') as string
  if (!testo?.trim()) throw new Error('Il testo dell\'adempimento è obbligatorio.')

  const esistenti = await prisma.adempimentoCommessa.count({ where: { commessaId } })

  await prisma.adempimentoCommessa.create({
    data: {
      commessaId,
      testo: testo.trim(),
      note: (formData.get('note') as string) || null,
      collegamento: (formData.get('collegamento') as string) || null,
      ordine: esistenti + 1,
    },
  })

  revalidatePath(`/impresa/commesse/${commessaId}`)
}

export async function eliminaAdempimento(adempimentoId: string, commessaId: string) {
  await requireImpresa()
  await prisma.adempimentoCommessa.delete({ where: { id: adempimentoId } })
  revalidatePath(`/impresa/commesse/${commessaId}`)
}
