'use server'

import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function creaPreventivoLibero({
  clienteId, note, righe,
}: {
  clienteId?: string
  note?: string
  righe: { descrizione: string; quantita: number; prezzoUnitario: number }[]
}): Promise<string> {
  await requireLibero()

  const preventivo = await prisma.preventivo.create({
    data: {
      clienteId: clienteId || undefined,
      note: note || undefined,
      stato: 'bozza',
      righe: {
        create: righe.map((r, i) => ({
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzoUnitario: r.prezzoUnitario,
          ordine: i,
        })),
      },
    },
  })

  return preventivo.id
}
