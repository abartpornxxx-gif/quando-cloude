'use client'

import { useState, useTransition } from 'react'
import { salvaConfigurazioneOrari } from './actions'

interface Props {
  config: {
    durataMattinaMinuti: number
    durataPausaMinuti: number
    durataPomeriggioMinuti: number
  }
}

export default function ConfigForm({ config }: Props) {
  const [mattina, setMattina] = useState(String(config.durataMattinaMinuti / 60))
  const [pausa, setPausa] = useState(String(config.durataPausaMinuti))
  const [pomeriggio, setPomeriggio] = useState(String(config.durataPomeriggioMinuti / 60))
  const [pending, startTransition] = useTransition()
  const [ok, setOk] = useState(false)
  const [errore, setErrore] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOk(false)
    setErrore('')
    startTransition(async () => {
      try {
        await salvaConfigurazioneOrari({
          durataMattinaMinuti: Math.round(parseFloat(mattina) * 60),
          durataPausaMinuti: parseInt(pausa),
          durataPomeriggioMinuti: Math.round(parseFloat(pomeriggio) * 60),
        })
        setOk(true)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
      <p className="text-sm text-gray-500">
        Imposta la durata delle sessioni di lavoro. I countdown degli operai si basano su questi valori.
      </p>

      <div>
        <label className="block text-sm font-semibold mb-1">Sessione mattutina (ore)</label>
        <input
          type="number"
          min="1"
          max="8"
          step="0.5"
          value={mattina}
          onChange={e => setMattina(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Default: 4 ore</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Durata pausa pranzo (minuti)</label>
        <input
          type="number"
          min="15"
          max="120"
          step="5"
          value={pausa}
          onChange={e => setPausa(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Default: 60 minuti</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1">Sessione pomeridiana (ore)</label>
        <input
          type="number"
          min="1"
          max="8"
          step="0.5"
          value={pomeriggio}
          onChange={e => setPomeriggio(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Default: 4 ore</p>
      </div>

      {ok && <p className="text-green-600 text-sm">✅ Configurazione salvata</p>}
      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {pending ? 'Salvataggio…' : 'Salva configurazione'}
      </button>
    </form>
  )
}
