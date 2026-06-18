import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificheBell } from '@/components/NotificheBell'
import { alertMagazziniere } from '@/lib/notifiche'

export default async function MagazzinoLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'magazziniere') redirect('/login')

  const alertCount = await alertMagazziniere()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-yellow-600 text-white px-4 py-3 flex items-center gap-3">
        <span className="font-bold text-lg">📦 Magazzino</span>
        <a href="/magazziniere/dashboard" className="text-sm hover:underline">Dashboard</a>
        <a href="/magazziniere/richieste" className="text-sm hover:underline">Richieste</a>
        <a href="/magazziniere/magazzino" className="text-sm hover:underline">Giacenza</a>
        <div className="ml-auto flex items-center gap-2">
          <NotificheBell count={alertCount} href="/magazziniere/notifiche" colore="yellow" />
          <form action={signOut}>
            <button type="submit" className="text-sm text-yellow-100 hover:underline">Esci</button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  )
}
