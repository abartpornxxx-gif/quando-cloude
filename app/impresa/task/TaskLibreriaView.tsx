'use client'

import { useState, useTransition, useRef } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { creaTask, eliminaTask } from './actions'

type Task = { id: string; titolo: string; ordine: number }

export function TaskLibreriaView({ iniziali }: { iniziali: Task[] }) {
  const [tasks, setTasks] = useState(iniziali)
  const [titolo, setTitolo] = useState('')
  const [errore, setErrore] = useState('')
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAggiungi(e: React.FormEvent) {
    e.preventDefault()
    const t = titolo.trim()
    if (!t) { setErrore('Inserisci un titolo.'); return }
    setErrore('')
    startTransition(async () => {
      try {
        await creaTask(t)
        setTasks(prev => [...prev, { id: `tmp-${Date.now()}`, titolo: t, ordine: 0 }])
        setTitolo('')
        inputRef.current?.focus()
      } catch (err) {
        setErrore(err instanceof Error ? err.message : 'Errore imprevisto.')
      }
    })
  }

  function handleElimina(task: Task) {
    if (!window.confirm(`Eliminare la task "${task.titolo}"?`)) return
    startTransition(async () => {
      try {
        setTasks(prev => prev.filter(t => t.id !== task.id))
        await eliminaTask(task.id)
      } catch (err) {
        setErrore(err instanceof Error ? err.message : 'Errore durante l\'eliminazione.')
        setTasks(iniziali)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Form aggiungi */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Aggiungi task
        </p>
        <form onSubmit={handleAggiungi} className="flex gap-3">
          <input
            ref={inputRef}
            value={titolo}
            onChange={e => { setTitolo(e.target.value); setErrore('') }}
            placeholder="Es. Montaggio quadro elettrico…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !titolo.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </button>
        </form>
        {errore && (
          <p className="mt-2 text-sm text-red-600 font-medium">{errore}</p>
        )}
      </div>

      {/* Lista task */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm font-medium text-gray-500">Nessuna task in libreria.</p>
          <p className="mt-1 text-xs text-gray-400">
            Aggiungi le attività standard che usi spesso (es. "Montaggio quadro", "Stesura cavi").
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
            >
              <span className="flex-1 text-sm font-medium text-gray-900">{task.titolo}</span>
              <button
                onClick={() => handleElimina(task)}
                disabled={pending || task.id.startsWith('tmp-')}
                title="Elimina"
                className="text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {tasks.length} task in libreria
      </p>
    </div>
  )
}
