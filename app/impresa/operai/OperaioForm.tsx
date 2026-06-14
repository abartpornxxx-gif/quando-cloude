'use client'

import { useState } from 'react'
import Link from 'next/link'
import { centsToInput } from '@/lib/format'

type Skill = { nome: string; nota: string }

interface Props {
  action: (formData: FormData) => Promise<void>
  defaultValues?: {
    id?: string; nome?: string; ruolo?: string; costoOrario?: number
    zona?: string; skills?: Skill[]; note?: string
  }
}

export function OperaioForm({ action, defaultValues }: Props) {
  const [skills, setSkills] = useState<Skill[]>(defaultValues?.skills ?? [])

  function aggiungiSkill() {
    setSkills(s => [...s, { nome: '', nota: '' }])
  }
  function rimuoviSkill(i: number) {
    setSkills(s => s.filter((_, idx) => idx !== i))
  }
  function aggiornaSkill(i: number, field: keyof Skill, value: string) {
    setSkills(s => s.map((sk, idx) => idx === i ? { ...sk, [field]: value } : sk))
  }

  return (
    <form action={action} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome completo *" name="nome" required defaultValue={defaultValues?.nome} />
        <Field label="Ruolo (es. Elettricista)" name="ruolo" defaultValue={defaultValues?.ruolo} />
        <Field label="Costo orario (€)" name="costoOrario" type="number" step="0.01" min="0"
          defaultValue={defaultValues?.costoOrario !== undefined ? centsToInput(defaultValues.costoOrario) : '0.00'} />
        <Field label="Zona operativa" name="zona" defaultValue={defaultValues?.zona} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Competenze / Skills</label>
          <button type="button" onClick={aggiungiSkill}
            className="text-sm font-medium text-blue-600 hover:text-blue-800">
            + Aggiungi skill
          </button>
        </div>
        {skills.length === 0 && (
          <p className="text-sm text-gray-400">Nessuna skill aggiunta.</p>
        )}
        <div className="space-y-2">
          {skills.map((sk, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Skill (es. Quadri elettrici)" value={sk.nome}
                onChange={e => aggiornaSkill(i, 'nome', e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              <input placeholder="Nota/esempio (opzionale)" value={sk.nota}
                onChange={e => aggiornaSkill(i, 'nota', e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              <button type="button" onClick={() => rimuoviSkill(i)}
                className="text-sm text-red-500 hover:text-red-700 px-2">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Note</label>
        <textarea name="note" rows={3} defaultValue={defaultValues?.note}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Salva
        </button>
        <Link href="/impresa/operai" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}

function Field({ label, name, type = 'text', required, defaultValue, step, min }: {
  label: string; name: string; type?: string; required?: boolean
  defaultValue?: string; step?: string; min?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} required={required} defaultValue={defaultValue} step={step} min={min}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  )
}
