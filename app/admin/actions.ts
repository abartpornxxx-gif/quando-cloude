'use server'

import { getAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type AdminUser = {
  id: string
  email: string
  role: string
  nome: string
  created_at: string
  last_sign_in_at: string | null
  banned: boolean
  email_confirmed: boolean
}

export async function listaUtenti(): Promise<AdminUser[]> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  if (error) throw new Error(error.message)
  return (data.users || []).map(u => ({
    id: u.id,
    email: u.email || '',
    role: u.user_metadata?.role || 'sconosciuto',
    nome: u.user_metadata?.full_name || '',
    created_at: u.created_at || '',
    last_sign_in_at: u.last_sign_in_at || null,
    banned: !!u.banned_until,
    email_confirmed: !!u.email_confirmed_at,
  }))
}

export async function creaUtenteImpresa({
  email, password, nome,
}: { email: string; password: string; nome: string }): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'impresa', full_name: nome },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      throw new Error(`L'email ${email} è già registrata.`)
    }
    throw new Error(error.message)
  }
  revalidatePath('/admin/utenti')
}

export async function creaUtenteLibero({
  email, password, nome,
}: { email: string; password: string; nome: string }): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'libero', full_name: nome },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      throw new Error(`L'email ${email} è già registrata.`)
    }
    throw new Error(error.message)
  }
  revalidatePath('/admin/utenti')
}

export async function sospendiAccount(userId: string): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876600h',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}

export async function riabilitaAccount(userId: string): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}

export async function reimpostaPasswordAdmin({
  userId, nuovaPassword,
}: { userId: string; nuovaPassword: string }): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: nuovaPassword,
  })
  if (error) throw new Error(error.message)
}

export async function cambiaRuolo({ userId, ruolo }: { userId: string; ruolo: string }): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: ruolo },
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}

export async function eliminaAccount(userId: string): Promise<void> {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}
