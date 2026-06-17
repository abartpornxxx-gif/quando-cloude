import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OfflineBanner } from '@/components/OfflineBanner'

export default async function OperaioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'operaio') redirect('/login')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-full">
      <nav className="bg-emerald-700 text-white shadow-md">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-bold text-sm">Q</div>
              <span className="font-bold">QUADRO</span>
              <span className="hidden rounded-full bg-emerald-500/60 px-2 py-0.5 text-xs font-semibold sm:inline">Cantiere</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-emerald-200 sm:block truncate max-w-[150px]">
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <form action={signOut}>
                <button type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-600">
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <OfflineBanner />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:px-6">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white safe-area-pb">
        <div className="mx-auto grid max-w-2xl grid-cols-2">
          <a href="/operaio/dashboard"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-600 hover:text-emerald-700">
            <span className="text-xl">🏗️</span>
            <span>Cantieri</span>
          </a>
          <a href="/operaio/giornata/nuova"
            className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-emerald-700">
            <span className="text-xl">➕</span>
            <span>Nuova giornata</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
