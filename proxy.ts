import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/types'

const ROLE_HOME: Record<UserRole, string> = {
  impresa: '/impresa/dashboard',
  operaio: '/operaio/dashboard',
  cliente: '/cliente/dashboard',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: non rimuovere — refresha la sessione e non fare chiamate DB aggiuntive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublic =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/auth/')

  if (!user) {
    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Utente autenticato
  const role = user.user_metadata?.role as UserRole | undefined

  // Reindirizza dalla root o da rotte pubbliche alla propria dashboard
  if (pathname === '/' || isPublic) {
    const dest = role ? ROLE_HOME[role] : '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Impedisce di accedere all'area di un altro ruolo
  if (role) {
    const inWrongArea =
      (pathname.startsWith('/impresa/') && role !== 'impresa') ||
      (pathname.startsWith('/operaio/') && role !== 'operaio') ||
      (pathname.startsWith('/cliente/') && role !== 'cliente')

    if (inWrongArea) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
