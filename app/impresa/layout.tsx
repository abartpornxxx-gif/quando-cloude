import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ImpresaNav } from '@/components/ImpresaNav'

export default async function ImpresaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'impresa') {
    redirect('/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-full">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500">
                <span className="text-xs font-bold">Q</span>
              </div>
              <span className="text-base font-bold tracking-tight">QUADRO</span>
              <span className="hidden rounded-full bg-blue-500/60 px-2 py-0.5 text-xs font-semibold sm:inline-block">
                Impresa
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-blue-200 sm:block">
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-100 hover:bg-blue-600"
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
