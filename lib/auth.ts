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
