'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function segnaVista(id: string) {
  await requireImpresa()
  await prisma.richiestaOfferta.update({ where: { id }, data: { stato: 'vista' } })
  revalidatePath('/impresa/richieste-offerte')
}

export async function segnaChiusa(id: string) {
  await requireImpresa()
  await prisma.richiestaOfferta.update({ where: { id }, data: { stato: 'chiusa' } })
  revalidatePath('/impresa/richieste-offerte')
}

export async function trasformaInPreventivo(richiestaId: string) {
  await requireImpresa()

  const richiesta = await prisma.richiestaOfferta.findUniqueOrThrow({
    where: { id: richiestaId },
    include: { offerta: true },
  })

  const nota = [
    `Richiesta per: ${richiesta.offerta.titolo}`,
    richiesta.note ? `Note cliente: ${richiesta.note}` : '',
  ].filter(Boolean).join('\n')

  const preventivo = await prisma.preventivo.create({
    data: {
      clienteId: richiesta.clienteId,
      note: nota,
      stato: 'bozza',
    },
  })

  await prisma.richiestaOfferta.update({
    where: { id: richiestaId },
    data: { stato: 'in_preventivo' },
  })

  redirect(`/impresa/preventivi/${preventivo.id}`)
}
