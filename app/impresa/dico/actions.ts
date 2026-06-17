'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function creaDico(input: {
  commessaId?: string
  ragioneSociale: string
  partitaIva?: string
  indirizzoImpresa?: string
  committenteNome: string
  committenteIndirizzo?: string
  committenteCodiceFisc?: string
  indirizzoImpianto: string
  tipoImpianto: string
  descrizioneLavori: string
  tipologiaLavori?: string
  normativa?: string
  materialiComponenti?: string
  potenzaImpegnata?: string
  tecnicoNome: string
  tecnicoAbilitazione?: string
  data: string
}): Promise<string> {
  await requireImpresa()

  const dico = await prisma.dichiarazioneConformita.create({
    data: {
      commessaId: input.commessaId || null,
      ragioneSociale: input.ragioneSociale.trim(),
      partitaIva: input.partitaIva?.trim() || null,
      indirizzoImpresa: input.indirizzoImpresa?.trim() || null,
      committenteNome: input.committenteNome.trim(),
      committenteIndirizzo: input.committenteIndirizzo?.trim() || null,
      committenteCodiceFisc: input.committenteCodiceFisc?.trim() || null,
      indirizzoImpianto: input.indirizzoImpianto.trim(),
      tipoImpianto: input.tipoImpianto.trim(),
      descrizioneLavori: input.descrizioneLavori.trim(),
      tipologiaLavori: input.tipologiaLavori?.trim() || null,
      normativa: input.normativa?.trim() || 'CEI 64-8 / DM 37/2008',
      materialiComponenti: input.materialiComponenti?.trim() || null,
      potenzaImpegnata: input.potenzaImpegnata?.trim() || null,
      tecnicoNome: input.tecnicoNome.trim(),
      tecnicoAbilitazione: input.tecnicoAbilitazione?.trim() || null,
      data: new Date(input.data),
    },
  })

  revalidatePath('/impresa/dico')
  return dico.id
}

export async function eliminaDico(id: string): Promise<void> {
  await requireImpresa()
  await prisma.dichiarazioneConformita.delete({ where: { id } })
  revalidatePath('/impresa/dico')
  redirect('/impresa/dico')
}
