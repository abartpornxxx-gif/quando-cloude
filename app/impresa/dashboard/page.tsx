import { createClient } from '@/lib/supabase/server'

export default async function ImpresaDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nomeUtente = user?.user_metadata?.full_name ?? user?.email ?? ''

  const cards = [
    { titolo: 'Preventivi', descrizione: 'Crea e gestisci preventivi per i clienti', icon: '📋', fase: 'Fase 1' },
    { titolo: 'Commesse', descrizione: 'Tutti i cantieri aperti e il loro avanzamento', icon: '🏗️', fase: 'Fase 1' },
    { titolo: 'Clienti', descrizione: 'Anagrafica clienti e storico lavori', icon: '👥', fase: 'Fase 1' },
    { titolo: 'Margini', descrizione: 'Budget previsto vs costi reali in tempo reale', icon: '📊', fase: 'Fase 2' },
    { titolo: 'Operai', descrizione: 'Gestione squadre, ore e assegnazioni', icon: '👷', fase: 'Fase 2' },
    { titolo: 'Magazzino', descrizione: 'Materiali, movimenti e inventario', icon: '📦', fase: 'Fase 3' },
    { titolo: 'Documenti', descrizione: 'DiCo, fatture, contratti (DM 37/2008)', icon: '📄', fase: 'Fase 3' },
    { titolo: 'Pianificazione', descrizione: 'Calendario cantieri e risorse', icon: '📅', fase: 'Fase 4' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Benvenuto{nomeUtente ? `, ${nomeUtente.split(' ')[0]}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Pannello di controllo impresa — le funzionalità si attiveranno fase per fase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div
            key={card.titolo}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                {card.fase}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{card.titolo}</h3>
              <p className="mt-0.5 text-sm text-gray-500">{card.descrizione}</p>
            </div>
            <div className="mt-auto">
              <div className="h-1.5 w-full rounded-full bg-gray-100" />
              <p className="mt-1 text-xs text-gray-400">In arrivo</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
