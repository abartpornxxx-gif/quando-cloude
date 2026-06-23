'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { StatoPreventivo } from '@/app/generated/prisma/client'
import { calcolaTotalePreventivo } from '@/lib/calcoli'

type RigaInput = { descrizione: string; quantita: number; prezzoUnitario: number }

export async function salvaPreventivoUfficio(formData: FormData) {
  await requireImpresaOUfficio()
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

  redirect('/ufficio/preventivi')
}

export async function trasformaInCommessaUfficio(preventivoId: string) {
  await requireImpresaOUfficio()

  const preventivo = await prisma.preventivo.findUniqueOrThrow({
    where: { id: preventivoId },
    include: { righe: true, cliente: true, commessa: { select: { id: true } } },
  })

  // Commessa già esistente: non creare doppione
  if (preventivo.commessa) {
    redirect(`/ufficio/preventivi/${preventivoId}`)
  }

  if (preventivo.stato !== 'accettato') {
    throw new Error('Il preventivo deve essere in stato "accettato" per creare una commessa.')
  }

  const totale = calcolaTotalePreventivo(preventivo.righe)
  const nomeCliente = preventivo.cliente?.nome ?? 'Cliente'
  const anno = new Date().getFullYear()

  await prisma.commessa.create({
    data: {
      nome: `${nomeCliente} — ${anno}`,
      clienteId: preventivo.clienteId,
      preventivato: totale,
      preventivoId: preventivo.id,
      stato: 'aperta',
    },
  })

  redirect(`/ufficio/preventivi/${preventivoId}`)
}

export async function eliminaPreventivoUfficio(id: string) {
  await requireImpresaOUfficio()
  const commessa = await prisma.commessa.findFirst({ where: { preventivoId: id }, select: { nome: true } })
  if (commessa) {
    throw new Error(`Impossibile eliminare il preventivo: è collegato alla commessa "${commessa.nome}".`)
  }
  await prisma.preventivo.delete({ where: { id } })
  revalidatePath('/ufficio/preventivi')
}
