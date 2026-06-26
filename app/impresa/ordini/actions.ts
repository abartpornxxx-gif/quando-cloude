'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Crea ordine ─────────────────────────────────────────────────────────────

export async function creaOrdine(input: {
  fornitoreId?: string
  commessaId?: string
  note?: string
  righe: Array<{ materialeId?: string; descrizione: string; quantita: number; prezzoUnitario: number }>
}): Promise<string> {
  await requireImpresaOUfficio()

  const ordine = await prisma.ordineFornitore.create({
    data: {
      fornitoreId: input.fornitoreId || null,
      commessaId: input.commessaId || null,
      note: input.note || null,
      righe: {
        create: input.righe.map(r => ({
          materialeId: r.materialeId || null,
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzoUnitario: r.prezzoUnitario,
        })),
      },
    },
  })

  revalidatePath('/impresa/ordini')
  return ordine.id
}

// ─── Avanza stato ordine ─────────────────────────────────────────────────────

export async function avanzaStatoOrdine(
  ordineId: string,
  nuovoStato: 'ordinato' | 'consegnato' | 'usato'
): Promise<void> {
  await requireImpresaOUfficio()

  const ordine = await prisma.ordineFornitore.findUnique({
    where: { id: ordineId },
    include: { righe: true },
  })
  if (!ordine) throw new Error('Ordine non trovato')

  // Validazione sequenza stati: richiesto→ordinato→consegnato→usato
  const statoAtteso: Record<string, string> = {
    ordinato: 'richiesto',
    consegnato: 'ordinato',
    usato: 'consegnato',
  }
  if (ordine.stato !== statoAtteso[nuovoStato]) {
    throw new Error(`Transizione non valida: ordine in stato "${ordine.stato}", non può passare a "${nuovoStato}"`)
  }

  await prisma.$transaction(async tx => {
    await tx.ordineFornitore.update({
      where: { id: ordineId },
      data: { stato: nuovoStato },
    })

    // Quando l'ordine è consegnato: carico in magazzino + aggiorna costi commessa
    if (nuovoStato === 'consegnato') {
      const righeConMateriale = ordine.righe.filter(r => r.materialeId)

      if (righeConMateriale.length > 0) {
        await tx.movimentoMagazzino.createMany({
          data: righeConMateriale.map(r => ({
            materialeId: r.materialeId!,
            tipo: 'carico' as const,
            quantita: r.quantita,
            descrizione: r.descrizione,
            commessaId: ordine.commessaId,
            ordineId: ordineId,
          })),
        })
      }

      // Incrementa costi materiali sulla commessa
      if (ordine.commessaId) {
        const totaleCents = ordine.righe.reduce(
          (acc, r) => acc + Math.round(r.quantita * r.prezzoUnitario),
          0
        )
        await tx.commessa.update({
          where: { id: ordine.commessaId },
          data: { costiMateriali: { increment: totaleCents } },
        })
      }
    }
  })

  revalidatePath('/impresa/ordini')
  revalidatePath(`/impresa/ordini/${ordineId}`)
  if (ordine.commessaId) {
    revalidatePath(`/impresa/commesse/${ordine.commessaId}`)
  }
}

// ─── Elimina ordine (solo se in stato richiesto) ──────────────────────────────

export async function eliminaOrdine(ordineId: string): Promise<void> {
  await requireImpresaOUfficio()

  const ordine = await prisma.ordineFornitore.findUnique({ where: { id: ordineId } })
  if (!ordine) throw new Error('Ordine non trovato')
  if (ordine.stato !== 'richiesto') throw new Error('Puoi eliminare solo ordini in stato "richiesto"')

  await prisma.ordineFornitore.delete({ where: { id: ordineId } })
  revalidatePath('/impresa/ordini')
  redirect('/impresa/ordini')
}

// ─── Registra reso materiale dal magazzino ────────────────────────────────────

export async function registraReso(input: {
  materialeId: string
  quantita: number
  descrizione: string
  commessaId?: string
  note?: string
}): Promise<void> {
  await requireImpresaOUfficio()

  await prisma.movimentoMagazzino.create({
    data: {
      materialeId: input.materialeId,
      tipo: 'reso',
      quantita: input.quantita,
      descrizione: input.descrizione,
      commessaId: input.commessaId || null,
      note: input.note || null,
    },
  })

  revalidatePath('/impresa/magazzino')
}
