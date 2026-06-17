'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { TipoOra } from '@/app/generated/prisma/client'

export interface MaterialeInput {
  materialeId?: string
  descrizione: string
  quantita: number
  prezzoUnitario: number
}

export interface ChecklistInput {
  templateId: string
  risposta: boolean
}

export interface FotoInput {
  url: string
  path: string
}

export interface GiornataInput {
  commessaId: string
  data: string
  mezzoId?: string
  lavoroSvolto: string
  note: string
  oreOrdinarie: number
  oreStraordinarie: number
  materiali: MaterialeInput[]
  checklist: ChecklistInput[]
  foto: FotoInput[]
}

export async function inviaGiornata(input: GiornataInput): Promise<{ id: string }> {
  const { operaio } = await requireOperaio()

  // Verifica che l'operaio sia assegnato alla commessa
  const assegnazione = await prisma.commessaOperaio.findUnique({
    where: { commessaId_operaioId: { commessaId: input.commessaId, operaioId: operaio.id } },
  })
  if (!assegnazione) throw new Error('Non sei assegnato a questa commessa')

  // Calcola costi da aggiungere alla commessa
  const costoManodopera = Math.round((input.oreOrdinarie + input.oreStraordinarie) * operaio.costoOrario)
  const costoMateriali = input.materiali.reduce(
    (acc, m) => acc + Math.round(m.quantita * m.prezzoUnitario),
    0
  )

  // Crea la giornata con tutti i dati in una transazione
  const giornata = await prisma.$transaction(async tx => {
    const g = await tx.giornata.create({
      data: {
        commessaId: input.commessaId,
        operaioId: operaio.id,
        data: new Date(input.data),
        mezzoId: input.mezzoId || null,
        lavoroSvolto: input.lavoroSvolto || null,
        note: input.note || null,
        stato: 'inviata',
        ore: {
          create: [
            ...(input.oreOrdinarie > 0 ? [{ tipo: TipoOra.ordinaria, quantita: input.oreOrdinarie }] : []),
            ...(input.oreStraordinarie > 0 ? [{ tipo: TipoOra.straordinaria, quantita: input.oreStraordinarie }] : []),
          ],
        },
        materiali: {
          create: input.materiali.map(m => ({
            materialeId: m.materialeId || null,
            descrizione: m.descrizione,
            quantita: m.quantita,
            prezzoUnitario: m.prezzoUnitario,
          })),
        },
        foto: {
          create: input.foto.map(f => ({ url: f.url, path: f.path })),
        },
        risposte: {
          create: input.checklist.map(c => ({
            templateId: c.templateId,
            risposta: c.risposta,
          })),
        },
      },
    })

    // Aggiorna i costi consuntivi sulla commessa
    await tx.commessa.update({
      where: { id: input.commessaId },
      data: {
        costiManodopera: { increment: costoManodopera },
        costiMateriali: { increment: costoMateriali },
      },
    })

    return g
  })

  revalidatePath('/operaio/dashboard')
  revalidatePath(`/impresa/commesse/${input.commessaId}`)

  return { id: giornata.id }
}
