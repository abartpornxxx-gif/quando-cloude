import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export async function requireImpresa() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'impresa') redirect('/login')
  return user
}

export async function requireOperaio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'operaio') redirect('/login')
  if (!user.email) redirect('/operaio/non-configurato')

  const operaio = await prisma.operaio.findFirst({
    where: { email: user.email },
  })
  if (!operaio) redirect('/operaio/non-configurato')

  return { user, operaio }
}

export async function requireCliente() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'cliente') redirect('/login')
  if (!user.email) redirect('/cliente/non-configurato')

  const cliente = await prisma.cliente.findFirst({
    where: { email: user.email },
  })
  if (!cliente) redirect('/cliente/non-configurato')

  return { user, cliente }
}

export async function requireMagazziniere() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'magazziniere') redirect('/login')
  if (!user.email) redirect('/login')

  const magazziniere = await prisma.magazziniere.findFirst({
    where: { email: user.email },
  })
  if (!magazziniere) redirect('/login')

  return { user, magazziniere }
}

export async function requireUfficio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ufficio') redirect('/login')
  if (!user.email) redirect('/login')

  const collaboratore = await prisma.collaboratoreUfficio.findFirst({
    where: { email: user.email },
  })
  if (!collaboratore) redirect('/login')

  return { user, collaboratore }
}

export async function requireLibero() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'libero') redirect('/login')
  if (!user.email) redirect('/login')

  const libero = await prisma.liberoProfessionista.findFirst({
    where: { email: user.email },
  })
  if (!libero) redirect('/libero/configura')

  return { user, libero }
}

export async function requireSuperAdmin() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get('_qdr_admin')
  const adminEmail = process.env.SUPERADMIN_EMAIL
  const adminPassword = process.env.SUPERADMIN_PASSWORD
  if (!adminCookie || !adminEmail || !adminPassword) redirect('/pannello')
  const { createHash } = await import('crypto')
  const expected = createHash('sha256').update(`${adminEmail}:${adminPassword}`).digest('hex')
  if (adminCookie.value !== expected) redirect('/pannello')
  return { email: adminEmail }
}

// Permette sia impresa che ufficio — per Server Actions condivise
export async function requireImpresaOUfficio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || (role !== 'impresa' && role !== 'ufficio')) redirect('/login')
  return user
}
