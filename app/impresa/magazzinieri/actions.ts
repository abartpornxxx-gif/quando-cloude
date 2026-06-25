'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createAuthUser, resetAuthPassword } from '@/lib/auth-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function creaMagazziniere(data: {
  nome: string
  email: string
  note?: string
}) {
  const adminUser = await requireImpresa()

  if (!data.email) {
    throw new Error('Email obbligatoria')
  }

  // 1. Crea l'utente in Supabase Auth
  let authUserId = ''
  let tempPassword = ''
  try {
    const res = await createAuthUser({
      email: data.email,
      role: 'magazziniere'
    })
    authUserId = res.authUserId
    tempPassword = res.tempPassword
  } catch (err: any) {
    console.error('Errore creazione auth user:', err)
    throw new Error(`Errore creazione utente: ${err.message}`)
  }

  // 2. Crea il record nel database QUADRO
  const magazziniere = await prisma.magazziniere.create({
    data: {
      nome: data.nome,
      email: data.email,
      note: data.note || null,
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
    }
  })

  revalidatePath('/impresa/magazzinieri')
  return { success: true, id: magazziniere.id, tempPassword }
}

export async function modificaMagazziniere(id: string, data: {
  nome: string
  email: string
  note?: string
}) {
  await requireImpresa()

  const magazziniere = await prisma.magazziniere.findUnique({ where: { id } })
  if (!magazziniere) throw new Error('Magazziniere non trovato')

  // Se l'email è cambiata, aggiorna anche Supabase Auth
  if (data.email !== magazziniere.email && magazziniere.authUserId) {
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      magazziniere.authUserId,
      { email: data.email, email_confirm: true }
    )
    if (error) {
      throw new Error(`Errore aggiornamento email auth: ${error.message}`)
    }
  }

  await prisma.magazziniere.update({
    where: { id },
    data: {
      nome: data.nome,
      email: data.email,
      note: data.note || null,
    }
  })

  revalidatePath('/impresa/magazzinieri')
  return { success: true }
}

export async function ripristinaPasswordMagazziniere(id: string) {
  const adminUser = await requireImpresa()

  const mag = await prisma.magazziniere.findUnique({ where: { id } })
  if (!mag) throw new Error('Magazziniere non trovato')

  let authUserId = mag.authUserId
  let tempPassword = ''

  if (!authUserId) {
    if (!mag.email) throw new Error('Email mancante per creare l\'utente auth')
    try {
      const res = await createAuthUser({
        email: mag.email,
        role: 'magazziniere'
      })
      authUserId = res.authUserId
      tempPassword = res.tempPassword
    } catch (err: any) {
      throw new Error(`Impossibile creare utente auth: ${err.message}`)
    }
  } else {
    try {
      const res = await resetAuthPassword(authUserId)
      tempPassword = res.tempPassword
    } catch (err: any) {
      throw new Error(`Errore reset auth: ${err.message}`)
    }
  }

  // Aggiorna il database QUADRO
  await prisma.magazziniere.update({
    where: { id },
    data: {
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
      ultimoResetPasswordAt: new Date(),
      ultimoResetPasswordBy: adminUser.email || 'Admin',
    }
  })

  revalidatePath('/impresa/magazzinieri')
  return { success: true, tempPassword }
}

export async function eliminaMagazziniere(id: string) {
  await requireImpresa()

  const mag = await prisma.magazziniere.findUnique({ where: { id } })
  if (!mag) throw new Error('Magazziniere non trovato')

  // Elimina l'utente anche da Supabase Auth si existe
  if (mag.authUserId) {
    const supabaseAdmin = getAdminClient()
    await supabaseAdmin.auth.admin.deleteUser(mag.authUserId).catch(err => {
      console.warn('Errore durante la cancellazione utente auth:', err)
    })
  }

  await prisma.magazziniere.delete({ where: { id } })
  revalidatePath('/impresa/magazzinieri')
}

export async function salvaMagazziniere(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const note = (formData.get('note') as string) || undefined

  if (id) {
    await modificaMagazziniere(id, { nome, email, note })
  } else {
    await creaMagazziniere({ nome, email, note })
  }
  const { redirect } = await import('next/navigation')
  redirect('/impresa/magazzinieri')
}

