import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'cliente') {
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
      <nav className="bg-violet-700 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
                <span className="text-sm font-bold">Q</span>
              </div>
              <span className="text-base font-bold tracking-tight">QUADRO</span>
              <span className="hidden rounded-full bg-violet-500/60 px-2.5 py-0.5 text-xs font-semibold sm:inline-block">
                Portale Cliente
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-violet-200 sm:block">
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-100 hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
