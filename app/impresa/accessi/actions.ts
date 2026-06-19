'use server'

import { getAdminClient } from '@/lib/supabase/admin'
import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function verificaAccesso(email: string): Promise<boolean> {
  await requireImpresa()
  const profile = await prisma.profile.findFirst({ where: { email } })
  return !!profile
}

export async function creaAccesso({
  email,
  password,
  ruolo,
  nome,
  revalidate,
}: {
  email: string
  password: string
  ruolo: 'operaio' | 'magazziniere' | 'cliente'
  nome: string
  revalidate?: string
}): Promise<{ success: true }> {
  await requireImpresa()

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: ruolo,
      full_name: nome,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already been registered') || error.message.toLowerCase().includes('already exists')) {
      throw new Error(`L'email ${email} è già registrata. L'utente ha già un accesso.`)
    }
    throw new Error(error.message)
  }

  // TODO_RESEND: in futuro, quando configurato Resend, invia qui l'email di invito
  // con le credenziali iniziali anziché comunicarle a voce.
  // Sostituire: await sendInviteEmail({ email, nome, ruolo, password }) — vedi lib/email.ts

  if (revalidate) revalidatePath(revalidate)

  return { success: true }
}

export async function reimpostaPassword({
  email,
  nuovaPassword,
  revalidate,
}: {
  email: string
  nuovaPassword: string
  revalidate?: string
}): Promise<{ success: true }> {
  await requireImpresa()

  const profile = await prisma.profile.findFirst({ where: { email } })
  if (!profile) throw new Error('Nessun account trovato per questa email.')

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: nuovaPassword,
  })

  if (error) throw new Error(error.message)

  if (revalidate) revalidatePath(revalidate)

  return { success: true }
}
