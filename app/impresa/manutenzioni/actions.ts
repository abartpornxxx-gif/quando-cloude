'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TipoImpiantoManutenzione, IntervalloUnita } from '@/app/generated/prisma/client'

export async function salvaManutenzione(fd: FormData): Promise<void> {
  await requireImpresa()

  const id = fd.get('id') as string | null
  const clienteId = fd.get('clienteId') as string
  const titolo = (fd.get('titolo') as string).trim()
  const tipoImpianto = fd.get('tipoImpianto') as TipoImpiantoManutenzione
  const tipoImpiantoAltro = tipoImpianto === 'Altro'
    ? ((fd.get('tipoImpiantoAltro') as string) || null)
    : null
  const intervalloValore = parseInt(fd.get('intervalloValore') as string, 10)
  const intervalloUnita = fd.get('intervalloUnita') as IntervalloUnita
  const dataUltimoIntervento = fd.get('dataUltimoIntervento') as string | null
  const dataProssimoIntervento = fd.get('dataProssimoIntervento') as string
  const note = (fd.get('note') as string) || null
  const attiva = fd.get('attiva') === 'true'

  if (!clienteId || !titolo || !tipoImpianto || !intervalloValore || !dataProssimoIntervento) {
    throw new Error('Campi obbligatori mancanti.')
  }

  const data = {
    clienteId,
    titolo,
    tipoImpianto,
    tipoImpiantoAltro,
    intervalloValore,
    intervalloUnita,
    dataUltimoIntervento: dataUltimoIntervento ? new Date(dataUltimoIntervento) : null,
    dataProssimoIntervento: new Date(dataProssimoIntervento),
    note,
    attiva,
  }

  if (id) {
    await prisma.manutenzioneProgrammata.update({ where: { id }, data })
  } else {
    await prisma.manutenzioneProgrammata.create({ data })
  }

  revalidatePath('/impresa/manutenzioni')
  redirect('/impresa/manutenzioni')
}

export async function eliminaManutenzione(id: string): Promise<void> {
  await requireImpresa()
  await prisma.manutenzioneProgrammata.delete({ where: { id } })
  revalidatePath('/impresa/manutenzioni')
}
