'use client'

// TODO LEGALE — Art. 4 L. 300/1970 + GDPR:
// La geolocalizzazione GPS NON è raccolta in questa schermata.
// Prima di attivarla in qualsiasi versione futura, è obbligatorio:
//   1. Informativa specifica ai lavoratori (art. 13 GDPR)
//   2. Accordo sindacale O autorizzazione dell'Ispettorato del Lavoro (art. 4 L. 300/1970)
//   3. DPIA (art. 35 GDPR) se trattamento ad alto rischio
// NON rimuovere questo commento senza aver completato la verifica legale.

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { inviaGiornata } from '../actions'
import { enqueue, fileToBase64, getPending, dequeue, base64ToFile } from '@/lib/offline-queue'
import { euroToCents, centsToInput } from '@/lib/format'

type Commessa = { id: string; nome: string; indirizzoCantiere?: string | null }
type Mezzo = { id: string; nome: string; targa?: string | null }
type Materiale = { id: string; descrizione: string; codice?: string | null; prezzo: number; unita?: string | null }
type ChecklistItem = { id: string; domanda: string }

interface Props {
  operaioId: string
  commesse: Commessa[]
  mezzi: Mezzo[]
  materiali: Materiale[]
  checklist: ChecklistItem[]
}

interface MaterialeRiga {
  materialeId: string
  descrizione: string
  quantita: number
  prezzoUnitario: number
}

const STEPS = ['Cantiere', 'Mezzo', 'Lavoro svolto', 'Ore', 'Materiali', 'Checklist', 'Foto', 'Riepilogo']

export function WizardGiornata({ operaioId, commesse, mezzi, materiali, checklist }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [queuedOffline, setQueuedOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dati del wizard
  const [commessaId, setCommessaId] = useState('')
  const [mezzoId, setMezzoId] = useState('')
  const [lavoroSvolto, setLavoroSvolto] = useState('')
  const [note, setNote] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [oreOrdinarie, setOreOrdinarie] = useState(8)
  const [oreStraordinarie, setOreStraordinarie] = useState(0)
  const [materialiRighe, setMaterialiRighe] = useState<MaterialeRiga[]>([])
  const [checklistRisposte, setChecklistRisposte] = useState<Record<string, boolean>>({})
  const [fotoFiles, setFotoFiles] = useState<File[]>([])
  const [fotos, setFotos] = useState<string[]>([]) // preview URLs
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const commessaSel = commesse.find(c => c.id === commessaId)

  function aggiungiMateriale() {
    setMaterialiRighe(r => [...r, { materialeId: '', descrizione: '', quantita: 1, prezzoUnitario: 0 }])
  }
  function rimuoviMateriale(i: number) {
    setMaterialiRighe(r => r.filter((_, idx) => idx !== i))
  }
  function aggiornaMateriale<K extends keyof MaterialeRiga>(i: number, field: K, value: MaterialeRiga[K]) {
    setMaterialiRighe(r => r.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }
  function selezionaMateriale(i: number, matId: string) {
    const mat = materiali.find(m => m.id === matId)
    if (mat) {
      aggiornaMateriale(i, 'materialeId', mat.id)
      aggiornaMateriale(i, 'descrizione', mat.descrizione)
      aggiornaMateriale(i, 'prezzoUnitario', mat.prezzo)
    }
  }

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setFotoFiles(prev => [...prev, ...files])
    const urls = files.map(f => URL.createObjectURL(f))
    setFotos(prev => [...prev, ...urls])
  }
  function rimuoviFoto(i: number) {
    URL.revokeObjectURL(fotos[i])
    setFotoFiles(f => f.filter((_, idx) => idx !== i))
    setFotos(f => f.filter((_, idx) => idx !== i))
  }

  function canProceed(): boolean {
    if (step === 0) return commessaId !== ''
    if (step === 6) return fotoFiles.length > 0
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const chRisposte = checklist.map(c => ({
        templateId: c.id,
        risposta: checklistRisposte[c.id] ?? false,
      }))

      if (!navigator.onLine) {
        // Salva offline in IndexedDB
        const fotoBase64 = await Promise.all(
          fotoFiles.map(async f => ({ name: f.name, type: f.type, data: await fileToBase64(f) }))
        )
        await enqueue({
          commessaId, operaioId, data, mezzoId: mezzoId || null,
          lavoroSvolto, note, oreOrdinarie, oreStraordinarie,
          materiali: materialiRighe.map(m => ({
            materialeId: m.materialeId || undefined,
            descrizione: m.descrizione,
            quantita: m.quantita,
            prezzoUnitario: m.prezzoUnitario,
          })),
          checklist: chRisposte,
          fotoBase64,
        })
        setQueuedOffline(true)
        return
      }

      // Upload foto su Supabase Storage
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const fotoUploaded = await Promise.all(
        fotoFiles.map(async file => {
          const path = `giornate/${commessaId}/${Date.now()}-${file.name}`
          const { error } = await supabase.storage.from('foto-cantiere').upload(path, file)
          if (error) throw new Error(`Upload foto: ${error.message}`)
          const { data: urlData } = supabase.storage.from('foto-cantiere').getPublicUrl(path)
          return { url: urlData.publicUrl, path }
        })
      )

      // Invia al server
      const result = await inviaGiornata({
        commessaId, data, mezzoId: mezzoId || undefined,
        lavoroSvolto, note, oreOrdinarie, oreStraordinarie,
        materiali: materialiRighe.map(m => ({
          materialeId: m.materialeId || undefined,
          descrizione: m.descrizione,
          quantita: m.quantita,
          prezzoUnitario: m.prezzoUnitario,
        })),
        checklist: chRisposte,
        foto: fotoUploaded,
      })

      // Tenta anche di sincronizzare eventuali giornate offline pendenti
      syncPending(supabase).catch(() => {})

      setSuccessId(result.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante il salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  async function syncPending(supabase: ReturnType<typeof createBrowserClient>) {
    const pending = await getPending()
    for (const item of pending) {
      try {
        const fotoUploaded = await Promise.all(
          item.fotoBase64.map(async fb => {
            const file = base64ToFile(fb.data, fb.name, fb.type)
            const path = `giornate/${item.commessaId}/${Date.now()}-${fb.name}`
            const { error } = await supabase.storage.from('foto-cantiere').upload(path, file)
            if (error) throw error
            const { data: urlData } = supabase.storage.from('foto-cantiere').getPublicUrl(path)
            return { url: urlData.publicUrl, path }
          })
        )
        await inviaGiornata({
          commessaId: item.commessaId,
          data: item.data,
          mezzoId: item.mezzoId || undefined,
          lavoroSvolto: item.lavoroSvolto,
          note: item.note,
          oreOrdinarie: item.oreOrdinarie,
          oreStraordinarie: item.oreStraordinarie,
          materiali: item.materiali,
          checklist: item.checklist,
          foto: fotoUploaded,
        })
        await dequeue(item.localId!)
      } catch { /* riprova al prossimo online */ }
    }
  }

  // Schermata successo
  if (successId || queuedOffline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">{queuedOffline ? '📥' : '✅'}</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {queuedOffline ? 'Giornata salvata offline' : 'Giornata inviata!'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {queuedOffline
            ? 'La giornata verrà sincronizzata automaticamente quando torni online.'
            : 'Costi di manodopera e materiali aggiornati sulla commessa.'}
        </p>
        <button onClick={() => router.push('/operaio/dashboard')}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold">
          Torna ai cantieri
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-gray-900">Nuova giornata</h1>
          <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200">
          <div className="h-1.5 rounded-full bg-emerald-500 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="mt-1 text-sm font-medium text-gray-600">{STEPS[step]}</p>
      </div>

      {/* Step 0: Cantiere */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona cantiere *</label>
            {commesse.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Nessun cantiere assegnato. Contatta la tua impresa.
              </div>
            ) : (
              <div className="space-y-2">
                {commesse.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => setCommessaId(c.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      commessaId === c.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <p className="font-semibold text-gray-900">{c.nome}</p>
                    {c.indirizzoCantiere && (
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                        <Image src="/immagini/icona-posizione.png" width={12} height={12} alt="" className="shrink-0 opacity-60" />
                        {c.indirizzoCantiere}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Mezzo */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Seleziona il mezzo aziendale usato oggi (opzionale)</p>
          <button type="button" onClick={() => setMezzoId('')}
            className={`w-full rounded-xl border-2 p-4 text-left ${!mezzoId ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
            <p className="font-medium text-gray-700">Nessun mezzo</p>
          </button>
          {mezzi.map(m => (
            <button key={m.id} type="button" onClick={() => setMezzoId(m.id)}
              className={`w-full rounded-xl border-2 p-4 text-left ${mezzoId === m.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold text-gray-900">{m.nome}</p>
              {m.targa && <p className="text-sm text-gray-500">Targa: {m.targa}</p>}
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Lavoro svolto */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione lavoro svolto *</label>
            <textarea value={lavoroSvolto} onChange={e => setLavoroSvolto(e.target.value)}
              rows={5} placeholder="Es. Posa cavi in traccia, installazione quadro di distribuzione..."
              className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note aggiuntive</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={3} placeholder="Problemi riscontrati, richieste cliente, ecc."
              className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      )}

      {/* Step 3: Ore */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ore ordinarie</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setOreOrdinarie(h => Math.max(0, h - 0.5))}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-emerald-500">−</button>
              <span className="text-3xl font-bold text-gray-900 w-16 text-center">{oreOrdinarie}</span>
              <button type="button" onClick={() => setOreOrdinarie(h => h + 0.5)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-emerald-500">+</button>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ore straordinarie</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setOreStraordinarie(h => Math.max(0, h - 0.5))}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-emerald-500">−</button>
              <span className="text-3xl font-bold text-gray-900 w-16 text-center">{oreStraordinarie}</span>
              <button type="button" onClick={() => setOreStraordinarie(h => h + 0.5)}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 text-xl font-bold text-gray-600 hover:border-emerald-500">+</button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            Totale: {oreOrdinarie + oreStraordinarie} ore
          </p>
        </div>
      )}

      {/* Step 4: Materiali */}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Aggiungi i materiali installati (opzionale)</p>
          {materialiRighe.map((m, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Materiale {i + 1}</p>
                <button type="button" onClick={() => rimuoviMateriale(i)}
                  className="text-red-500 text-sm hover:text-red-700">✕ Rimuovi</button>
              </div>
              <select onChange={e => selezionaMateriale(i, e.target.value)} defaultValue=""
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                <option value="">— Dal listino (opzionale) —</option>
                {materiali.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {mat.codice ? `[${mat.codice}] ` : ''}{mat.descrizione}
                  </option>
                ))}
              </select>
              <input placeholder="Descrizione *" value={m.descrizione}
                onChange={e => aggiornaMateriale(i, 'descrizione', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Quantità</label>
                  <input type="number" step="0.01" min="0" value={m.quantita}
                    onChange={e => aggiornaMateriale(i, 'quantita', parseFloat(e.target.value) || 0)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prezzo unitario (€)</label>
                  <input type="number" step="0.01" min="0"
                    defaultValue={centsToInput(m.prezzoUnitario)}
                    onChange={e => aggiornaMateriale(i, 'prezzoUnitario', euroToCents(e.target.value))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={aggiungiMateriale}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
            + Aggiungi materiale
          </button>
        </div>
      )}

      {/* Step 5: Checklist */}
      {step === 5 && (
        <div className="space-y-3">
          {checklist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              Nessuna domanda di checklist configurata.<br />
              <span className="text-xs">L&apos;impresa può aggiungerne da: Checklist cantiere</span>
            </div>
          ) : (
            checklist.map(item => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-800 mb-3">{item.domanda}</p>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setChecklistRisposte(r => ({ ...r, [item.id]: true }))}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border-2 transition-all ${
                      checklistRisposte[item.id] === true
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    ✓ Sì
                  </button>
                  <button type="button"
                    onClick={() => setChecklistRisposte(r => ({ ...r, [item.id]: false }))}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border-2 transition-all ${
                      checklistRisposte[item.id] === false
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    ✗ No
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Step 6: Foto */}
      {step === 6 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Scatta almeno una foto del lavoro svolto oggi. Sono obbligatorie. *
          </p>
          <button type="button" onClick={() => fotoInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-10 text-gray-500 hover:border-emerald-400 hover:text-emerald-600">
            <span className="text-4xl">📷</span>
            <span className="text-sm font-medium">Aggiungi foto</span>
            <span className="text-xs text-gray-400">Puoi selezionare più foto</span>
          </button>
          <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment"
            className="hidden" onChange={onFotoChange} />

          {fotos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {fotos.map((url, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`}
                    className="h-36 w-full rounded-xl object-cover" />
                  <button type="button" onClick={() => rimuoviFoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white text-xs leading-none">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 7: Riepilogo */}
      {step === 7 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            <Row label="Cantiere" value={commessaSel?.nome ?? '—'} />
            <Row label="Data" value={data} />
            <Row label="Mezzo" value={mezzi.find(m => m.id === mezzoId)?.nome ?? 'Nessuno'} />
            <Row label="Lavoro svolto" value={lavoroSvolto || '—'} />
            <Row label="Ore ordinarie" value={`${oreOrdinarie} h`} />
            <Row label="Ore straordinarie" value={`${oreStraordinarie} h`} />
            <Row label="Materiali" value={materialiRighe.length > 0 ? `${materialiRighe.length} voci` : 'Nessuno'} />
            <Row label="Checklist" value={`${Object.keys(checklistRisposte).length}/${checklist.length} risposte`} />
            <Row label="Foto" value={`${fotoFiles.length} foto`} />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? 'Invio in corso…' : '✓ Invia giornata'}
          </button>
        </div>
      )}

      {/* Navigazione */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            ← Indietro
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            Avanti →
          </button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}
