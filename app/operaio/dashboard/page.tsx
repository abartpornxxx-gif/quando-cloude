import { createClient } from '@/lib/supabase/server'

export default async function OperaioDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const nome = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Operaio'

  const voci = [
    { titolo: 'Le mie commesse', descrizione: 'Cantieri assegnati a te', icon: '🏗️', color: 'bg-emerald-50 border-emerald-200' },
    { titolo: 'Ore lavorate', descrizione: 'Inserisci le ore di oggi', icon: '⏱️', color: 'bg-blue-50 border-blue-200' },
    { titolo: 'Materiale usato', descrizione: 'Registra i materiali installati', icon: '🔧', color: 'bg-orange-50 border-orange-200' },
    { titolo: 'Foto cantiere', descrizione: 'Foto di fine giornata', icon: '📷', color: 'bg-purple-50 border-purple-200' },
    { titolo: 'Checklist', descrizione: 'Verifiche e sicurezza (CEI 64-8)', icon: '✅', color: 'bg-green-50 border-green-200' },
    { titolo: 'Mezzo aziendale', descrizione: 'Registra uso veicolo', icon: '🚐', color: 'bg-gray-50 border-gray-200' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Ciao, {nome}!</h1>
        <p className="mt-1 text-sm text-gray-500">
          App cantiere — le funzioni si attivano con la Fase 2.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {voci.map(voce => (
          <button
            key={voce.titolo}
            disabled
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left ${voce.color} opacity-60`}
          >
            <span className="text-2xl">{voce.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{voce.titolo}</p>
              <p className="text-xs text-gray-500">{voce.descrizione}</p>
            </div>
          </button>
        ))}
      </div>

      {/* TODO GDPR + art. 4 L. 300/1970: geolocalizzazione disabilitata — attivarla solo con consenso informato esplicito */}
      <p className="mt-6 text-center text-xs text-gray-400">
        Geolocalizzazione: disabilitata (richiede consenso informato)
      </p>
    </div>
  )
}
