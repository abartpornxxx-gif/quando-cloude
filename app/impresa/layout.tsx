import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImpresaNav } from '@/components/ImpresaNav'
import { NotificheBell } from '@/components/NotificheBell'
import { alertImpresa } from '@/lib/notifiche'

export default async function ImpresaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'impresa') {
    redirect('/login')
  }

  const alert = await alertImpresa()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const userName = user.user_metadata?.full_name ?? user.email ?? ''

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white text-sm font-bold select-none">
                Q
              </div>
              <span className="text-base font-bold text-gray-900 hidden sm:block">QUADRO</span>
              <span className="hidden md:inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Impresa
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {userName && (
                <span className="hidden lg:block text-sm text-gray-500 truncate max-w-48">
                  {userName.split(' ')[0]}
                </span>
              )}
              <NotificheBell count={alert.totale} href="/impresa/notifiche" colore="blue" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
        <ImpresaNav />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
