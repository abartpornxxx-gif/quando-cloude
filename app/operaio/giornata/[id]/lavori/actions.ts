'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pushRapportinoDaCompilare as inviaPushRapportino } from '@/lib/push'
import { inviaEmailRapportino } from '@/lib/email'

export async function avanzaFase(
  giornataId: string,
  faseCorrente: string
): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  // ORDINE 2 — Il time-lock è stato rimosso: l'operaio avanza quando ha finito.
  // Il controllo a tempo per l'impresa viene gestito nel Centro Operativo lato impresa.

  const transizioni: Record<string, { fase: string; campo?: string }> = {
    inizio:     { fase: 'mattina',    campo: 'inizioMattina'    },
    mattina:    { fase: 'pausa',      campo: 'fineMattina'      },
    pausa:      { fase: 'pomeriggio', campo: 'inizioPomeriggio' },
    pomeriggio: { fase: 'fine',       campo: 'finePomeriggio'   },
  }

  const transizione = transizioni[faseCorrente]
  if (!transizione) throw new Error(`Fase ${faseCorrente} non valida per avanzamento`)

  await prisma.giornata.update({
    where: { id: giornataId },
    data: {
      fase: transizione.fase as never,
      ...(transizione.campo ? { [transizione.campo]: new Date() } : {}),
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/lavori`)

  if (transizione.fase === 'fine') {
    Promise.all([
      inviaPushRapportino(operaio.id, giornataId).catch(() => {}),
      operaio.email
        ? inviaEmailRapportino(operaio.email, operaio.nome, giornata.commessaId, giornataId).catch(() => {})
        : Promise.resolve(),
    ])
  }
}

// Termina la giornata direttamente da mattina o pomeriggio, senza passare per le fasi intermedie
export async function terminaGiornata(giornataId: string): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')
  if (!['mattina', 'pomeriggio'].includes(giornata.fase)) {
    throw new Error('Non puoi terminare la giornata dalla fase corrente')
  }

  await prisma.giornata.update({
    where: { id: giornataId },
    data: {
      fase: 'fine',
      // Se si termina da mattina senza aver fatto pausa, chiudi anche fineMattina
      ...(giornata.fase === 'mattina' ? { fineMattina: new Date() } : {}),
      finePomeriggio: new Date(),
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/lavori`)

  Promise.all([
    inviaPushRapportino(operaio.id, giornataId).catch(() => {}),
    operaio.email
      ? inviaEmailRapportino(operaio.email, operaio.nome, giornata.commessaId, giornataId).catch(() => {})
      : Promise.resolve(),
  ])
}

// Segnala un problema in tempo reale: crea un messaggio in chat taggato come problema
export async function segnalaProblema(giornataId: string, nota: string): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({ where: { id: giornataId } })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  await prisma.chatMessaggio.create({
    data: {
      giornataId,
      commessaId: giornata.commessaId,
      autoreNome: operaio.nome,
      ruolo: 'operaio',
      testo: `⚠️ PROBLEMA: ${nota.trim()}`,
    },
  })

  revalidatePath(`/operaio/giornata/${giornataId}/chat`)
  revalidatePath(`/impresa/giornate/${giornataId}/chat`)
}

export async function annullaGiornata(giornataId: string): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findUnique({
    where: { id: giornataId },
    include: { attrezzatureUsi: { where: { riconsegnata: false } } },
  })
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')
  if (giornata.stato === 'inviata') throw new Error('Non puoi annullare una giornata già inviata')

  await prisma.$transaction(async tx => {
    if (giornata.attrezzatureUsi.length > 0) {
      await tx.attrezzaturaUso.updateMany({
        where: { giornataId, riconsegnata: false },
        data: { riconsegnata: true },
      })
      for (const u of giornata.attrezzatureUsi) {
        const altriUsi = await tx.attrezzaturaUso.count({
          where: { attrezzaturaId: u.attrezzaturaId, riconsegnata: false },
        })
        if (altriUsi === 0) {
          await tx.attrezzatura.update({
            where: { id: u.attrezzaturaId },
            data: { stato: 'disponibile', assegnatario: null },
          })
        }
      }
    }
    await tx.suggerimentoSpunta.deleteMany({ where: { giornataId } })
    await tx.giornata.delete({ where: { id: giornataId } })
  })

  // Il redirect viene gestito lato client (router.push) per evitare l'errore produzione Next.js
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

export async function toggleSpunta(giornataId: string, suggerimentoId: string, completato: boolean): Promise<void> {
  const { operaio } = await requireOperaio()

  const giornata = await prisma.giornata.findFirst({ 
    where: { id: giornataId, operaioId: operaio.id }, 
    select: { id: true } 
  })
  if (!giornata) throw new Error('Non autorizzato')

  await prisma.suggerimentoSpunta.upsert({
    where: { suggerimentoId_giornataId: { suggerimentoId, giornataId } },
    update: { completato },
    create: { suggerimentoId, giornataId, completato },
  })
}
