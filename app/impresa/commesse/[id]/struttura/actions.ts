'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresaOUfficio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

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
    conBox: boolean
    conEsterno: boolean
    conAreaComune: boolean
  }
) {
  await requireImpresaOUfficio()

  // Evita duplicazione: controlla se esistono già nodi
  const esistenti = await prisma.cantiereStrutturaNodo.count({ where: { commessaId } })
  if (esistenti > 0) throw new Error('La struttura è già stata creata. Aggiungi nodi manualmente.')

  const nodi: {
    commessaId: string
    tipo: string
    nome: string
    ordinamento: number
    parentId?: string | null
  }[] = []

  // Scale e appartamenti
  for (let s = 1; s <= Math.min(config.nScale, 10); s++) {
    const scalaLabel = String.fromCharCode(64 + s) // A, B, C...
    const scala = await prisma.cantiereStrutturaNodo.create({
      data: {
        commessaId,
        tipo: 'SCALA' as never,
        nome: `Scala ${scalaLabel}`,
        ordinamento: s - 1,
      },
    })

    for (let a = 1; a <= Math.min(config.appartamentiPerScala, 20); a++) {
      nodi.push({
        commessaId,
        tipo: 'APPARTAMENTO',
        nome: `Appartamento ${scalaLabel}${a}`,
        parentId: scala.id,
        ordinamento: a - 1,
      })
    }
  }

  // Box, Esterno, Area comune
  const extra: { tipo: string; nome: string; ordinamento: number }[] = []
  if (config.conBox)      extra.push({ tipo: 'BOX',         nome: 'Box',         ordinamento: extra.length })
  if (config.conEsterno)  extra.push({ tipo: 'ESTERNO',     nome: 'Esterno',     ordinamento: extra.length })
  if (config.conAreaComune) extra.push({ tipo: 'AREA_COMUNE', nome: 'Area comune', ordinamento: extra.length })

  for (const e of extra) {
    nodi.push({ commessaId, ...e, parentId: null })
  }

  // Crea in batch gli appartamenti e nodi extra
  if (nodi.length > 0) {
    await prisma.$transaction(
      nodi.map(n =>
        prisma.cantiereStrutturaNodo.create({
          data: {
            commessaId: n.commessaId,
            tipo: n.tipo as never,
            nome: n.nome,
            parentId: n.parentId ?? null,
            ordinamento: n.ordinamento,
          },
        })
      )
    )
  }

  revalidatePath(`/impresa/commesse/${commessaId}/struttura`)
}
