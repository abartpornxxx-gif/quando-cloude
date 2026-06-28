'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getImpresaProfilo() {
  await requireImpresa()
  let profilo = await prisma.impresaProfilo.findFirst()
  if (!profilo) {
    profilo = await prisma.impresaProfilo.create({
      data: {
        nomeImpresa: 'La mia impresa',
        settore: 'Impianti elettrici',
      },
    })
  }
  return profilo
}

export async function salvaImpresaProfilo(data: {
  nomeImpresa: string
  settore: string
  descrizione: string
  telefono: string
  email: string
  sitoWeb: string
  indirizzo: string
  mascotteAvatar: string
  colorePrimario: string
  stileCard: string
  mottoTeam: string
  mostraNome: boolean
  mostraSettore: boolean
  mostraIndirizzo: boolean
  mostraTelefono: boolean
  mostraEmail: boolean
  mostraSitoWeb: boolean
  mostraServizi: boolean
  servizi: string
  mostraCertificazioni: boolean
  certificazioni: string
  mostraDescrizione: boolean
  mostraValori: boolean
  mostraMascotte: boolean
}) {
  await requireImpresa()
  const profilo = await prisma.impresaProfilo.findFirst()
  if (profilo) {
    await prisma.impresaProfilo.update({
      where: { id: profilo.id },
      data,
    })
  } else {
    await prisma.impresaProfilo.create({
      data,
    })
  }
  revalidatePath('/impresa/personalizzazione')
  return { success: true }
}

export async function ripristinaDefaultProfilo() {
  await requireImpresa()
  const defaults = {
    nomeImpresa: 'La mia impresa',
    settore: 'Impianti elettrici',
    descrizione: 'Professionisti nel settore dell\'impiantistica, garantiamo qualità, sicurezza ed efficienza.',
    telefono: '',
    email: '',
    sitoWeb: '',
    indirizzo: '',
    mascotteAvatar: 'leone',
    colorePrimario: '#0f766e',
    stileCard: 'Classico',
    mostraNome: true,
    mostraSettore: true,
    mostraIndirizzo: true,
    mostraTelefono: true,
    mostraEmail: true,
    mostraSitoWeb: true,
    mostraServizi: true,
    servizi: 'Impianti Civili, Manutenzioni, Impianti Industriali',
    mostraCertificazioni: true,
    certificazioni: 'ISO 9001, FGAS, FER',
    mostraDescrizione: true,
    mostraValori: true,
    mostraMascotte: true,
    mottoTeam: 'Costruiamo oggi, per un domani migliore.',
  }
  const profilo = await prisma.impresaProfilo.findFirst()
  if (profilo) {
    await prisma.impresaProfilo.update({
      where: { id: profilo.id },
      data: defaults,
    })
  } else {
    await prisma.impresaProfilo.create({
      data: defaults,
    })
  }
  revalidatePath('/impresa/personalizzazione')
  return { success: true }
}
