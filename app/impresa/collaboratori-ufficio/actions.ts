'use server'

import { prisma } from '@/lib/prisma'
import { requireImpresa } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createAuthUser, resetAuthPassword } from '@/lib/auth-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function creaCollaboratoreUfficio(data: {
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
      role: 'ufficio'
    })
    authUserId = res.authUserId
    tempPassword = res.tempPassword
  } catch (err: any) {
    console.error('Errore creazione auth user:', err)
    throw new Error(`Errore creazione utente: ${err.message}`)
  }

  // 2. Crea il record nel database QUADRO
  const collaboratore = await prisma.collaboratoreUfficio.create({
    data: {
      nome: data.nome,
      email: data.email,
      note: data.note || null,
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
    }
  })

  revalidatePath('/impresa/collaboratori-ufficio')
  return { success: true, id: collaboratore.id, tempPassword }
}

export async function modificaCollaboratoreUfficio(id: string, data: {
  nome: string
  email: string
  note?: string
}) {
  await requireImpresa()

  const collaboratore = await prisma.collaboratoreUfficio.findUnique({ where: { id } })
  if (!collaboratore) throw new Error('Collaboratore non trovato')

  // Se l'email è cambiata, aggiorna anche Supabase Auth
  if (data.email !== collaboratore.email && collaboratore.authUserId) {
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      collaboratore.authUserId,
      { email: data.email, email_confirm: true }
    )
    if (error) {
      throw new Error(`Errore aggiornamento email auth: ${error.message}`)
    }
  }

  await prisma.collaboratoreUfficio.update({
    where: { id },
    data: {
      nome: data.nome,
      email: data.email,
      note: data.note || null,
    }
  })

  revalidatePath('/impresa/collaboratori-ufficio')
  return { success: true }
}

export async function ripristinaPasswordCollaboratore(id: string) {
  const adminUser = await requireImpresa()

  const col = await prisma.collaboratoreUfficio.findUnique({ where: { id } })
  if (!col) throw new Error('Collaboratore non trovato')

  let authUserId = col.authUserId
  let tempPassword = ''

  if (!authUserId) {
    if (!col.email) throw new Error('Email mancante per creare l\'utente auth')
    try {
      const res = await createAuthUser({
        email: col.email,
        role: 'ufficio'
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
  await prisma.collaboratoreUfficio.update({
    where: { id },
    data: {
      authUserId,
      primoAccesso: true,
      passwordResetRichiesto: true,
      ultimoResetPasswordAt: new Date(),
      ultimoResetPasswordBy: adminUser.email || 'Admin',
    }
  })

  revalidatePath('/impresa/collaboratori-ufficio')
  return { success: true, tempPassword }
}

export async function eliminaCollaboratoreUfficio(id: string) {
  await requireImpresa()

  const col = await prisma.collaboratoreUfficio.findUnique({ where: { id } })
  if (!col) throw new Error('Collaboratore non trovato')

  // Elimina l'utente anche da Supabase Auth se esiste
  if (col.authUserId) {
    const supabaseAdmin = getAdminClient()
    await supabaseAdmin.auth.admin.deleteUser(col.authUserId).catch(err => {
      console.warn('Errore durante la cancellazione utente auth:', err)
    })
  }

  await prisma.collaboratoreUfficio.delete({ where: { id } })
  revalidatePath('/impresa/collaboratori-ufficio')
}

export async function salvaCollaboratoreUfficio(formData: FormData) {
  await requireImpresa()
  const id = formData.get('id') as string | null
  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const note = (formData.get('note') as string) || undefined

  if (id) {
    await modificaCollaboratoreUfficio(id, { nome, email, note })
  } else {
    await creaCollaboratoreUfficio({ nome, email, note })
  }
  const { redirect } = await import('next/navigation')
  redirect('/impresa/collaboratori-ufficio')
}

