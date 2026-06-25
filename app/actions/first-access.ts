'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkMascotteOccupata(avatarMascotte: string, coloreMascotte: string, escludiOperaioId?: string) {
  const inUso = await prisma.operaio.findFirst({
    where: {
      avatarMascotte,
      coloreMascotte,
      id: escludiOperaioId ? { not: escludiOperaioId } : undefined
    }
  })
  return !!inUso
}

export async function getMascotteOccupate() {
  const operai = await prisma.operaio.findMany({
    where: {
      avatarMascotte: { not: null },
      coloreMascotte: { not: null }
    },
    select: {
      avatarMascotte: true,
      coloreMascotte: true
    }
  })
  return operai.map(o => `${o.avatarMascotte}_${o.coloreMascotte}`)
}

export async function completaPrimoAccesso(data: {
  role: 'operaio' | 'magazziniere' | 'ufficio'
  email: string
  note?: string
  avatarMascotte?: string
  coloreMascotte?: string
  descrizione?: string
  fraseDivertente?: string
  hobbies?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== data.email) {
    throw new Error('Accesso non autorizzato')
  }

  if (data.role === 'operaio') {
    const operaio = await prisma.operaio.findFirst({ where: { email: data.email } })
    if (!operaio) throw new Error('Operaio non trovato')

    if (data.avatarMascotte && data.coloreMascotte) {
      const occupato = await checkMascotteOccupata(data.avatarMascotte, data.coloreMascotte, operaio.id)
      if (occupato) {
        throw new Error('La combinazione di mascotte e colore selezionata è già in uso. Scegli un altro avatar o colore!')
      }
    }

    await prisma.operaio.update({
      where: { id: operaio.id },
      data: {
        primoAccesso: false,
        passwordResetRichiesto: false,
        avatarMascotte: data.avatarMascotte || null,
        coloreMascotte: data.coloreMascotte || 'giallo',
        descrizione: data.descrizione || null,
        fraseDivertente: data.fraseDivertente || null,
        hobbies: data.hobbies || null,
      }
    })
    revalidatePath('/operaio/dashboard')
    revalidatePath('/operaio/profilo')
  } else if (data.role === 'magazziniere') {
    const magazziniere = await prisma.magazziniere.findFirst({ where: { email: data.email } })
    if (!magazziniere) throw new Error('Magazziniere non trovato')

    await prisma.magazziniere.update({
      where: { id: magazziniere.id },
      data: {
        primoAccesso: false,
        passwordResetRichiesto: false,
        note: data.note || magazziniere.note,
      }
    })
    revalidatePath('/magazziniere/dashboard')
  } else if (data.role === 'ufficio') {
    const col = await prisma.collaboratoreUfficio.findFirst({ where: { email: data.email } })
    if (!col) throw new Error('Collaboratore non trovato')

    await prisma.collaboratoreUfficio.update({
      where: { id: col.id },
      data: {
        primoAccesso: false,
        passwordResetRichiesto: false,
        note: data.note || col.note,
      }
    })
    revalidatePath('/ufficio')
  }

  return { success: true }
}
