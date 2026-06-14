import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/types'

const ROLE_HOME: Record<UserRole, string> = {
  impresa: '/impresa/dashboard',
  operaio: '/operaio/dashboard',
  cliente: '/cliente/dashboard',
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const role = data.user.user_metadata?.role as UserRole | undefined
      const dest = role ? ROLE_HOME[role] : '/login'
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=conferma_fallita`)
}
