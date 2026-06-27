import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/lib/types'

const ROLE_HOME: Record<UserRole, string> = {
  impresa: '/impresa/dashboard',
  operaio: '/operaio/dashboard',
  cliente: '/cliente/dashboard',
  magazziniere: '/magazziniere/dashboard',
  ufficio: '/ufficio/dashboard',
  libero: '/libero/dashboard',
}

async function sha256hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pannello admin segreto: sempre accessibile (login page + API auth)
  if (pathname.startsWith('/pannello') || pathname.startsWith('/api/pannello-auth')) {
    return NextResponse.next({ request })
  }

  // Area /admin/: verifica cookie proprio — completamente separata da Supabase
  if (pathname.startsWith('/admin/')) {
    const adminCookie = request.cookies.get('_qdr_admin')
    const adminEmail = process.env.SUPERADMIN_EMAIL
    const adminPassword = process.env.SUPERADMIN_PASSWORD
    if (!adminCookie || !adminEmail || !adminPassword) {
      return NextResponse.redirect(new URL('/pannello', request.url))
    }
    const expected = await sha256hex(`${adminEmail}:${adminPassword}`)
    if (adminCookie.value !== expected) {
      return NextResponse.redirect(new URL('/pannello', request.url))
    }
    return NextResponse.next({ request })
  }

  // Se le variabili Supabase non sono configurate, blocca tutto (fail-closed)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (pathname === '/login' || pathname.startsWith('/auth/')) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // Helper: crea un redirect portando con sé i cookie di sessione aggiornati.
    // Senza questo, se Supabase ha appena rinnovato il token e c'è contestualmente
    // un redirect, il browser non riceve il cookie aggiornato e la sessione scade.
    function redirectWithSession(dest: string) {
      const res = NextResponse.redirect(new URL(dest, request.url))
      supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value))
      return res
    }

    // Reindirizza dalla root o da rotte pubbliche alla propria dashboard
    if (pathname === '/' || isPublic) {
      const dest = role ? ROLE_HOME[role] : '/login'
      return redirectWithSession(dest)
    }

    // S2: Utente autenticato senza ruolo: gestisci il redirect al login
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Impedisce di accedere all'area di un altro ruolo
    const inWrongArea =
      (pathname.startsWith('/impresa/') && role !== 'impresa') ||
      (pathname.startsWith('/operaio/') && role !== 'operaio') ||
      (pathname.startsWith('/cliente/') && role !== 'cliente') ||
      (pathname.startsWith('/magazziniere/') && role !== 'magazziniere') ||
      (pathname.startsWith('/ufficio/') && role !== 'ufficio') ||
      (pathname.startsWith('/libero/') && role !== 'libero')

    if (inWrongArea) {
      return redirectWithSession(ROLE_HOME[role])
    }

    return supabaseResponse
  } catch (error) {
    // S1: Modifica il catch vuoto e fallo reindirizzare a /login
    const { pathname: p } = request.nextUrl
    const isPublic = p === '/login' || p === '/register' || p.startsWith('/auth/')
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
