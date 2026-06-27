import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguraLiberoForm } from './ConfiguraLiberoForm'

export default async function ConfiguraLiberoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'libero') redirect('/login')

  const nomeDefault = user.user_metadata?.full_name || ''
  const emailDefault = user.email || ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white">
            <span className="text-2xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configura il tuo profilo</h1>
          <p className="text-sm text-gray-500 mt-2">Inserisci i tuoi dati per iniziare ad usare QUADRO</p>
        </div>
        <ConfiguraLiberoForm nomeDefault={nomeDefault} emailDefault={emailDefault} authUserId={user.id} />
      </div>
    </div>
  )
}
