'use server'

import { prisma } from '@/lib/prisma'
import { requireMagazziniere } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function aggiornaStatoRichiesta(
  richiestaId: string,
  stato: 'in_preparazione' | 'consegnata',
  materialeId?: string
): Promise<void> {
  await requireMagazziniere()

  await prisma.$transaction(async tx => {
    const richiesta = await tx.richiestaMateriale.update({
      where: { id: richiestaId },
      data: {
        stato,
        ...(materialeId ? { materialeId } : {}),
      },
    })

    // Quando consegnata: crea movimento scarico in magazzino (se materiale collegato)
    if (stato === 'consegnata') {
      const matId = materialeId ?? richiesta.materialeId
      if (matId) {
        const existingMovimento = await tx.movimentoMagazzino.findUnique({
          where: { richiestaId },
        })
        if (!existingMovimento) {
          await tx.movimentoMagazzino.create({
            data: {
              materialeId: matId,
              tipo: 'scarico',
              quantita: 1,
              descrizione: `Richiesta cantiere: ${richiesta.descrizione}`,
              commessaId: richiesta.commessaId,
              richiestaId,
            },
          })
        }
      }
    }
  })

  revalidatePath('/magazziniere/richieste')
  revalidatePath(`/magazziniere/richieste/${richiestaId}`)
}

export async function uploadFotoConsegna(
  richiestaId: string,
  formData: FormData
): Promise<void> {
  const { magazziniere } = await requireMagazziniere()

  const richiesta = await prisma.richiestaMateriale.findUnique({ where: { id: richiestaId } })
  if (!richiesta) throw new Error('Richiesta non trovata')

  const file = formData.get('foto') as File | null
  if (!file) throw new Error('Nessun file')

  const supabase = await createClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `richieste/${richiestaId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage
    .from('foto-cantiere')
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage.from('foto-cantiere').getPublicUrl(path)

  await prisma.richiestaMateriale.update({
    where: { id: richiestaId },
    data: { fotoUrl: urlData.publicUrl, fotoPath: path, stato: 'consegnata' },
  })

  // Notifica via chat nella giornata
  await prisma.chatMessaggio.create({
    data: {
      giornataId: richiesta.giornataId,
      commessaId: richiesta.commessaId,
      autoreNome: magazziniere.nome,
      ruolo: 'magazziniere',
      testo: `✅ Materiale consegnato: ${richiesta.descrizione}`,
      fotoUrl: urlData.publicUrl,
      fotoPath: path,
    },
  })

  revalidatePath('/magazziniere/richieste')
  revalidatePath(`/magazziniere/richieste/${richiestaId}`)
}
