import { createClient } from '@/lib/supabase/server'

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nome = user?.user_metadata?.full_name ?? user?.email ?? 'Cliente'

  const sezioni = [
    { titolo: 'I miei lavori', descrizione: 'Avanzamento dei cantieri in corso', icon: '🏗️' },
    { titolo: 'Pagamenti', descrizione: 'Stato fatture e importi', icon: '💳' },
    { titolo: 'Documenti', descrizione: 'Contratti, DiCo e certificati', icon: '📄' },
    { titolo: 'Richiedi lavori', descrizione: 'Catalogo servizi aggiuntivi', icon: '➕' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Ciao, {nome.split(' ')[0]}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Il tuo portale personale — i contenuti saranno disponibili con la Fase 3.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sezioni.map(s => (
          <div
            key={s.titolo}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm opacity-60"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{s.titolo}</h3>
              <p className="mt-0.5 text-sm text-gray-500">{s.descrizione}</p>
              <p className="mt-2 text-xs font-medium text-violet-600">In arrivo</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
