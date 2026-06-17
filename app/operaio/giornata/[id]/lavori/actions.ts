'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function avanzaFase(
  giornataId: string,
  faseCorrente: string
): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  const adesso = new Date()

  const transizioni: Record<string, { fase: string; campo?: string }> = {
    inizio: { fase: 'mattina', campo: 'inizioMattina' },
    mattina: { fase: 'pausa', campo: 'fineMattina' },
    pausa: { fase: 'pomeriggio', campo: 'inizioPomeriggio' },
    pomeriggio: { fase: 'fine', campo: 'finePomeriggio' },
  }

  const transizione = transizioni[faseCorrente]
  if (!transizione) throw new Error(`Fase ${faseCorrente} non valida per avanzamento`)

  await prisma.giornata.update({
    where: { id: giornataId },
    data: {
      fase: transizione.fase as any,
      ...(transizione.campo ? { [transizione.campo]: adesso } : {}),
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/lavori`)
}

export async function uploadFotoAvanzamento(
  giornataId: string,
  formData: FormData
): Promise<{ url: string }> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  const file = formData.get('foto') as File | null
  if (!file) throw new Error('Nessun file')

  const supabase = await createClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `giornate/${giornataId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('foto-cantiere')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage.from('foto-cantiere').getPublicUrl(path)

  await prisma.giornataFoto.create({
    data: { giornataId, url: urlData.publicUrl, path },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/lavori`)
  return { url: urlData.publicUrl }
}
