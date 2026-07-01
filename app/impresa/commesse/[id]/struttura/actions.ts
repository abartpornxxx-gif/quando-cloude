'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { creaNodiStrutturaDaTemplate } from '@/lib/cantiere-struttura/genera-struttura'

export async function aggiungiNodo(data: {
  commessaId: string
  parentId?: string | null
  tipo: string
  nome: string
  codice?: string
  piano?: string
  interno?: string
  ordinamento?: number
}) {
  await requireImpresaOUfficio()

  if (!data.nome.trim()) throw new Error('Il nome è obbligatorio')

  await prisma.cantiereStrutturaNodo.create({
    data: {
      commessaId: data.commessaId,
      parentId: data.parentId || null,
      tipo: data.tipo as never,
      nome: data.nome.trim(),
      codice: data.codice?.trim() || null,
      piano: data.piano?.trim() || null,
      interno: data.interno?.trim() || null,
      ordinamento: data.ordinamento ?? 0,
    },
  })

  revalidatePath(`/impresa/commesse/${data.commessaId}/struttura`)
}

export async function eliminaNodo(nodoId: string, commessaId: string) {
  await requireImpresaOUfficio()

  await prisma.cantiereStrutturaNodo.delete({ where: { id: nodoId } })

  revalidatePath(`/impresa/commesse/${commessaId}/struttura`)
}

export async function toggleAttivoNodo(nodoId: string, commessaId: string, attivo: boolean) {
  await requireImpresaOUfficio()

  await prisma.cantiereStrutturaNodo.update({
    where: { id: nodoId },
    data: { attivo },
  })

  revalidatePath(`/impresa/commesse/${commessaId}/struttura`)
}

export async function quickBuildStruttura(
  commessaId: string,
  config: {
    nScale: number
    appartamentiPerScala: number
    nBox: number
    conEsterno: boolean
    areeComuni: string[]
  }
) {
  await requireImpresaOUfficio()

  const esistenti = await prisma.cantiereStrutturaNodo.count({ where: { commessaId } })
  if (esistenti > 0) throw new Error('La struttura è già stata creata. Aggiungi nodi manualmente.')

  const scale = Array.from(
    { length: Math.min(config.nScale, 10) },
    (_, i) => `Scala ${String.fromCharCode(65 + i)}`
  )

  await creaNodiStrutturaDaTemplate(commessaId, {
    tipo: 'condominio_parco',
    scale,
    appartamentiPerScala: config.appartamentiPerScala,
    nBox: config.nBox,
    conEsterno: config.conEsterno,
    areeComuni: config.areeComuni,
  })

  revalidatePath(`/impresa/commesse/${commessaId}/struttura`)
}
