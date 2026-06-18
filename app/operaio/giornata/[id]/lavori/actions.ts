'use server'

import { prisma } from '@/lib/prisma'
import { requireOperaio } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pushRapportinoDaCompilare as inviaPushRapportino } from '@/lib/push'
import { inviaEmailRapportino } from '@/lib/email'

export async function avanzaFase(
  giornataId: string,
  faseCorrente: string
): Promise<void> {
  const { operaio } = await requireOperaio()

  const [giornata, config] = await Promise.all([
    prisma.giornata.findUnique({ where: { id: giornataId } }),
    prisma.configurazioneOrari.findFirst(),
  ])
  if (!giornata || giornata.operaioId !== operaio.id) throw new Error('Non autorizzato')

  const cfg = config ?? { durataMattinaMinuti: 240, durataPausaMinuti: 60, durataPomeriggioMinuti: 240 }
  const adesso = Date.now()

  // ORDINE 2 — Blocco temporale: la transizione è permessa solo se il tempo è davvero trascorso
  if (faseCorrente === 'mattina') {
    if (!giornata.inizioMattina) throw new Error('Sessione non avviata correttamente')
    const fine = new Date(giornata.inizioMattina).getTime() + cfg.durataMattinaMinuti * 60_000
    if (adesso < fine) throw new Error('Sessione mattutina non ancora completata')
  }
  if (faseCorrente === 'pausa') {
    if (!giornata.fineMattina) throw new Error('Fine mattina non registrata')
    const fine = new Date(giornata.fineMattina).getTime() + cfg.durataPausaMinuti * 60_000
    if (adesso < fine) throw new Error('Pausa non ancora completata')
  }
  if (faseCorrente === 'pomeriggio') {
    if (!giornata.inizioPomeriggio) throw new Error('Sessione pomeriggio non avviata')
    const fine = new Date(giornata.inizioPomeriggio).getTime() + cfg.durataPomeriggioMinuti * 60_000
    if (adesso < fine) throw new Error('Sessione pomeridiana non ancora completata')
  }

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
    // Elimina spunte promemoria orfane (giornataId non ha FK constraint verso giornate)
    await tx.suggerimentoSpunta.deleteMany({ where: { giornataId } })
    await tx.giornata.delete({ where: { id: giornataId } })
  })

  redirect('/operaio/dashboard')
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
  await requireOperaio()

  await prisma.suggerimentoSpunta.upsert({
    where: { suggerimentoId_giornataId: { suggerimentoId, giornataId } },
    update: { completato },
    create: { suggerimentoId, giornataId, completato },
  })
}
