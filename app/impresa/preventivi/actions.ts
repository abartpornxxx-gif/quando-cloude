'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { euroToCents, centsToInput } from '@/lib/format'
import { calcolaTotalePreventivo } from '@/lib/calcoli'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoPreventivo } from '@/app/generated/prisma/client'

type RigaInput = { descrizione: string; quantita: number; prezzoUnitario: number }

export async function salvaPreventivo(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const righeJson = formData.get('righe') as string
  const righeInput: RigaInput[] = JSON.parse(righeJson)

  const data = {
    clienteId: (formData.get('clienteId') as string) || null,
    data: new Date(formData.get('data') as string),
    stato: formData.get('stato') as StatoPreventivo,
    note: (formData.get('note') as string) || null,
  }

  if (id) {
    await prisma.preventivoRiga.deleteMany({ where: { preventivoId: id } })
    await prisma.preventivo.update({
      where: { id },
      data: {
        ...data,
        righe: {
          create: righeInput.map((r, i) => ({
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzoUnitario: Math.round(r.prezzoUnitario),
            ordine: i,
          })),
        },
      },
    })
  } else {
    await prisma.preventivo.create({
      data: {
        ...data,
        righe: {
          create: righeInput.map((r, i) => ({
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzoUnitario: Math.round(r.prezzoUnitario),
            ordine: i,
          })),
        },
      },
    })
  }

  redirect('/impresa/preventivi')
}

export async function cambiaStatoPreventivo(id: string, stato: StatoPreventivo) {
  await requireImpresa()
  await prisma.preventivo.update({ where: { id }, data: { stato } })
  revalidatePath(`/impresa/preventivi/${id}`)
}

export async function trasformaInCommessa(preventivoId: string) {
  await requireImpresa()

  const preventivo = await prisma.preventivo.findUniqueOrThrow({
    where: { id: preventivoId },
    include: { righe: true, cliente: true },
  })

  if (preventivo.stato !== 'accettato') {
    throw new Error('Il preventivo deve essere in stato "accettato"')
  }

  const totale = calcolaTotalePreventivo(preventivo.righe)

  const nomeCliente = preventivo.cliente?.nome ?? 'Cliente'
  const anno = new Date().getFullYear()

  const commessa = await prisma.commessa.create({
    data: {
      nome: `${nomeCliente} — ${anno}`,
      clienteId: preventivo.clienteId,
      preventivato: totale,
      preventivoId: preventivo.id,
      stato: 'aperta',
    },
  })

  redirect(`/impresa/commesse/${commessa.id}`)
}

export async function eliminaPreventivo(id: string) {
  await requireImpresa()
  const commessa = await prisma.commessa.findFirst({ where: { preventivoId: id }, select: { nome: true } })
  if (commessa) {
    throw new Error(`Impossibile eliminare il preventivo: è collegato alla commessa "${commessa.nome}". Elimina prima la commessa.`)
  }
  await prisma.preventivo.delete({ where: { id } })
  revalidatePath('/impresa/preventivi')
}
