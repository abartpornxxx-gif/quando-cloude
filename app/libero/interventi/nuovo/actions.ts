'use server'

import { requireLibero } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function creaIntervento({
  liberoId, titolo, descrizione, indirizzo, clienteId, dataIntervento, stato, importo,
}: {
  liberoId: string
  titolo: string
  descrizione?: string
  indirizzo?: string
  clienteId?: string
  dataIntervento?: string
  stato: string
  importo: number
}): Promise<string> {
  await requireLibero()

  const intervento = await prisma.interventoLibero.create({
    data: {
      liberoId,
      titolo,
      descrizione: descrizione || undefined,
      indirizzo: indirizzo || undefined,
      clienteId: clienteId || undefined,
      dataIntervento: dataIntervento ? new Date(dataIntervento) : undefined,
      stato: stato as any,
      importo,
    },
  })

  return intervento.id
}
