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
        nomeImpresa: 'CreCas Impianti S.r.l.',
        settore: 'Termoidraulica ed Elettrica',
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
  mostraCertificazioni: boolean
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
    nomeImpresa: 'CreCas Impianti S.r.l.',
    settore: 'Termoidraulica ed Elettrica',
    descrizione: 'Da anni leader nel settore dell\'impiantistica civile ed industriale, garantendo qualità, sicurezza ed efficienza energetica.',
    telefono: '+39 06 1234567',
    email: 'info@crecasimpianti.it',
    sitoWeb: 'www.crecasimpianti.it',
    indirizzo: 'Via Roma, 10 - 00100 Roma (RM)',
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
    mostraCertificazioni: true,
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
