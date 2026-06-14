import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/** Verifica che l'utente corrente sia un'impresa. Da chiamare all'inizio di ogni server action sensibile. */
export async function requireImpresa() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'impresa') {
    redirect('/login')
  }
  return user
}
