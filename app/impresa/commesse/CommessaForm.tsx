'use client'

import Link from 'next/link'
import { centsToInput, formatEuro, euroToCents } from '@/lib/format'
import { calcolaMargine, percentualeAvanzamento } from '@/lib/calcoli'
import { useMemo, useState } from 'react'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type Cliente    = { id: string; nome: string }
type TipoLavoro = { id: string; nome: string }

interface Importi {
  preventivato: number
  costiMateriali: number
  costiManodopera: number
  costiMezzi: number
  fatturato: number
}

interface Props {
  action: (fd: FormData) => Promise<void>
  clienti: Cliente[]
  tipiLavoro?: TipoLavoro[]
  defaultValues?: {
    id?: string; nome?: string; clienteId?: string; indirizzoCantiere?: string
    stato?: string; note?: string; tipoLavoroId?: string
    istruzioniCantiere?: string; attrezzatureNecessarie?: string
    avanzamentoPercentuale?: number; tipoStruttura?: string; categoriaLavoro?: string
  } & Partial<Importi>
}

// ─── Costanti UI ──────────────────────────────────────────────────────────────

const CATEGORIE = [
  { value: 'civile',                label: 'Civile',                icon: '🏠' },
  { value: 'industriale',           label: 'Industriale',           icon: '🏭' },
  { value: 'fotovoltaico',          label: 'Fotovoltaico',          icon: '☀️' },
  { value: 'domotica',              label: 'Domotica',              icon: '🤖' },
  { value: 'videosorveglianza',     label: 'Videosorveglianza',     icon: '📷' },
  { value: 'allarme',               label: 'Allarme',               icon: '🚨' },
  { value: 'automazione_cancelli',  label: 'Cancelli',              icon: '🚗' },
  { value: 'manutenzione',          label: 'Manutenzione',          icon: '🔧' },
  { value: 'altro',                 label: 'Altro',                 icon: '⚡' },
]

const ORGANIZZAZIONI = [
  { value: 'commessa_semplice',     icon: '🏠', title: 'Commessa semplice',          desc: 'Per lavori senza divisione in zone.' },
  { value: 'singolo_appartamento',  icon: '🚪', title: 'Singolo appartamento',        desc: 'Per una sola abitazione o interno.' },
  { value: 'condominio_parco',      icon: '🏢', title: 'Parco / Condominio',          desc: 'Per scale, appartamenti, box, esterni e aree comuni.' },
  { value: 'cantiere_strutturato',  icon: '🏗️', title: 'Cantiere strutturato',        desc: 'Per cantieri divisi in più zone operative.' },
  { value: 'capannone_industriale', icon: '🏭', title: 'Capannone / Industriale',     desc: 'Per reparti, quadri, locali tecnici e aree esterne.' },
  { value: 'solo_esterni',          icon: '🌿', title: 'Solo esterni / aree comuni',  desc: 'Per cancelli, cortili, illuminazione e vani comuni.' },
  { value: 'fotovoltaico_zone',     icon: '☀️', title: 'Fotovoltaico con zone',       desc: 'Per tetto, inverter, batterie, quadro e area moduli.' },
  { value: 'manutenzione_zone',     icon: '🔧', title: 'Manutenzione su più zone',    desc: 'Per interventi ricorrenti su diverse aree.' },
  { value: 'altro_personalizzato',  icon: '✏️', title: 'Altro personalizzato',        desc: 'Struttura libera da definire manualmente.' },
]

const AREE_COMUNI_OPT = ['Androne', 'Vano scala', 'Vano contatori', 'Locale tecnico', 'Garage', 'Cortile', 'Copertura']

const ZONE_ESTERNO_OPT = ['Cortile', 'Cancello', 'Illuminazione esterna', 'Citofonia', 'Vano contatori', 'Area parcheggio']

const ZONE_FOTOV_OPT = ['Copertura tetto', 'Inverter', 'Batterie', 'Quadro AC/DC', 'Locale tecnico', 'Linea contatore', 'Area moduli']

const TIPI_ZONA_OPT = [
  { value: 'SCALA',           label: 'Scala' },
  { value: 'APPARTAMENTO',    label: 'Appartamento' },
  { value: 'BOX',             label: 'Box' },
  { value: 'ESTERNO',         label: 'Esterno' },
  { value: 'AREA_COMUNE',     label: 'Area comune' },
  { value: 'LOCALE_TECNICO',  label: 'Locale tecnico' },
  { value: 'QUADRO_ELETTRICO',label: 'Quadro elettrico' },
  { value: 'GARAGE',          label: 'Garage' },
  { value: 'CORTILE',         label: 'Cortile' },
  { value: 'COPERTURA',       label: 'Copertura' },
  { value: 'ALTRO',           label: 'Altro' },
]

const NODO_ICON: Record<string, string> = {
  SCALA: '🏢', APPARTAMENTO: '🏠', BOX: '📦', ESTERNO: '🌿', AREA_COMUNE: '🤝',
  LOCALE_TECNICO: '⚙️', QUADRO_ELETTRICO: '⚡', GARAGE: '🚗', CORTILE: '🌳',
  COPERTURA: '🏛️', ALTRO: '●',
}

// ─── Calcolo anteprima nodi ───────────────────────────────────────────────────

type NodoAnteprima = { tipo: string; nome: string; livello: number }

function calcAnteprima(
  org: string,
  s: { // Builder states
    bApp: { nome: string; piano: string; conBox: boolean; conEsterno: boolean }
    scale: string[]; apx: number; nBox: number; conEsterno: boolean; areeComuni: string[]
    zonePersonalizzate: { tipo: string; nome: string }[]
    reparti: string[]; nQuadri: number; nLocali: number; areaEsterna: boolean; nUffici: number; magazzino: boolean
    zoneCheck: string[]
    zoneManutenzione: string[]
  }
): NodoAnteprima[] {
  switch (org) {
    case 'commessa_semplice': return []

    case 'singolo_appartamento': {
      const n: NodoAnteprima[] = [{ tipo: 'APPARTAMENTO', nome: s.bApp.nome || 'Appartamento', livello: 0 }]
      if (s.bApp.conBox)     n.push({ tipo: 'BOX',     nome: 'Box',     livello: 0 })
      if (s.bApp.conEsterno) n.push({ tipo: 'ESTERNO', nome: 'Esterno', livello: 0 })
      return n
    }

    case 'condominio_parco': {
      const n: NodoAnteprima[] = []
      for (const scalaNome of s.scale) {
        const nm = scalaNome.trim() || '?'
        n.push({ tipo: 'SCALA', nome: nm, livello: 0 })
        const pref = nm.replace(/^Scala\s*/i, '')
        for (let a = 1; a <= Math.min(s.apx, 20); a++) {
          n.push({ tipo: 'APPARTAMENTO', nome: `Appartamento ${pref}${a}`, livello: 1 })
        }
      }
      const nb = Math.min(s.nBox, 50)
      for (let b = 1; b <= nb; b++) n.push({ tipo: 'BOX', nome: nb === 1 ? 'Box' : `Box ${b}`, livello: 0 })
      if (s.conEsterno) n.push({ tipo: 'ESTERNO', nome: 'Esterno', livello: 0 })
      for (const a of s.areeComuni) n.push({ tipo: 'AREA_COMUNE', nome: a, livello: 0 })
      return n
    }

    case 'cantiere_strutturato':
    case 'altro_personalizzato':
      return s.zonePersonalizzate.map(z => ({ tipo: z.tipo || 'ALTRO', nome: z.nome || 'Zona', livello: 0 }))

    case 'capannone_industriale': {
      const n: NodoAnteprima[] = []
      for (const r of s.reparti) n.push({ tipo: 'ALTRO', nome: r || 'Reparto', livello: 0 })
      for (let q = 1; q <= Math.min(s.nQuadri, 20); q++) n.push({ tipo: 'QUADRO_ELETTRICO', nome: s.nQuadri === 1 ? 'Quadro elettrico' : `Quadro elettrico ${q}`, livello: 0 })
      for (let l = 1; l <= Math.min(s.nLocali, 10); l++) n.push({ tipo: 'LOCALE_TECNICO', nome: s.nLocali === 1 ? 'Locale tecnico' : `Locale tecnico ${l}`, livello: 0 })
      if (s.areaEsterna) n.push({ tipo: 'ESTERNO', nome: 'Area esterna', livello: 0 })
      for (let u = 1; u <= Math.min(s.nUffici, 20); u++) n.push({ tipo: 'ALTRO', nome: s.nUffici === 1 ? 'Uffici' : `Ufficio ${u}`, livello: 0 })
      if (s.magazzino) n.push({ tipo: 'ALTRO', nome: 'Magazzino', livello: 0 })
      return n
    }

    case 'solo_esterni':
    case 'fotovoltaico_zone':
      return s.zoneCheck.map(z => ({ tipo: 'ALTRO', nome: z, livello: 0 }))

    case 'manutenzione_zone':
      return s.zoneManutenzione.filter(Boolean).map(z => ({ tipo: 'ALTRO', nome: z, livello: 0 }))

    default: return []
  }
}

// ─── Componente principale ────────────────────────────────────────────────────

export function CommessaForm({ action, clienti, tipiLavoro = [], defaultValues }: Props) {
  const isNuova = !defaultValues?.id

  // Dati principali
  const [importi, setImporti] = useState<Importi>({
    preventivato:    defaultValues?.preventivato    ?? 0,
    costiMateriali:  defaultValues?.costiMateriali  ?? 0,
    costiManodopera: defaultValues?.costiManodopera ?? 0,
    costiMezzi:      defaultValues?.costiMezzi      ?? 0,
    fatturato:       defaultValues?.fatturato       ?? 0,
  })

  // Categoria e organizzazione
  const [categoria,      setCategoria]      = useState(defaultValues?.categoriaLavoro ?? 'civile')
  const [organizzazione, setOrganizzazione] = useState(defaultValues?.tipoStruttura    ?? 'commessa_semplice')

  // ── Builder: singolo appartamento ──────────────────────────────────────────
  const [bApp, setBApp] = useState({ nome: '', piano: '', conBox: false, conEsterno: false })

  // ── Builder: condominio ───────────────────────────────────────────────────
  const [scale,       setScale]       = useState<string[]>(['Scala A'])
  const [apx,         setApx]         = useState(4)
  const [nBox,        setNBox]        = useState(0)
  const [conEsterno,  setConEsterno]  = useState(false)
  const [areeComuni,  setAreeComuni]  = useState<string[]>([])

  // ── Builder: zone personalizzate (cantiere / altro) ───────────────────────
  const [zonePersonalizzate, setZonePersonalizzate] = useState<{ tipo: string; nome: string }[]>([
    { tipo: 'ALTRO', nome: '' }
  ])

  // ── Builder: capannone ────────────────────────────────────────────────────
  const [reparti,     setReparti]     = useState<string[]>(['Reparto 1'])
  const [nQuadri,     setNQuadri]     = useState(1)
  const [nLocali,     setNLocali]     = useState(1)
  const [areaEsterna, setAreaEsterna] = useState(false)
  const [nUffici,     setNUffici]     = useState(0)
  const [magazzino,   setMagazzino]   = useState(false)

  // ── Builder: zone a checkbox (esterno / fotovoltaico) ─────────────────────
  const defaultZoneFotov = ['Copertura tetto', 'Inverter', 'Quadro AC/DC']
  const [zoneCheck, setZoneCheck] = useState<string[]>(
    organizzazione === 'fotovoltaico_zone' ? defaultZoneFotov : []
  )

  // ── Builder: manutenzione zone libere ─────────────────────────────────────
  const [zoneManutenzione, setZoneManutenzione] = useState<string[]>(['Zona 1'])

  const builderStates = { bApp, scale, apx, nBox, conEsterno, areeComuni, zonePersonalizzate, reparti, nQuadri, nLocali, areaEsterna, nUffici, magazzino, zoneCheck, zoneManutenzione }
  const anteprima = useMemo(() => calcAnteprima(organizzazione, builderStates), [organizzazione, bApp, scale, apx, nBox, conEsterno, areeComuni, zonePersonalizzate, reparti, nQuadri, nLocali, areaEsterna, nUffici, magazzino, zoneCheck, zoneManutenzione])

  const strutturaNecessaria = isNuova && organizzazione !== 'commessa_semplice'

  const margine    = calcolaMargine(importi)
  const avanzamento = percentualeAvanzamento(importi)

  // Helpers condominio
  function addScala() { if (scale.length < 10) setScale(p => [...p, `Scala ${String.fromCharCode(65 + p.length)}`]) }
  function removeScala(i: number) { setScale(p => p.filter((_, j) => j !== i)) }
  function updateScala(i: number, v: string) { setScale(p => p.map((s, j) => j === i ? v : s)) }
  function toggleAreaComune(a: string) { setAreeComuni(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]) }

  // Helpers zone personalizzate
  function addZona() { setZonePersonalizzate(p => [...p, { tipo: 'ALTRO', nome: '' }]) }
  function removeZona(i: number) { setZonePersonalizzate(p => p.filter((_, j) => j !== i)) }
  function updateZona(i: number, field: 'tipo' | 'nome', v: string) {
    setZonePersonalizzate(p => p.map((z, j) => j === i ? { ...z, [field]: v } : z))
  }

  // Helpers capannone
  function addReparto()           { setReparti(p => [...p, `Reparto ${p.length + 1}`]) }
  function removeReparto(i: number) { setReparti(p => p.filter((_, j) => j !== i)) }
  function updateReparto(i: number, v: string) { setReparti(p => p.map((r, j) => j === i ? v : r)) }

  // Helpers manutenzione
  function addZonaManutenzione()    { setZoneManutenzione(p => [...p, '']) }
  function removeZonaManutenzione(i: number) { setZoneManutenzione(p => p.filter((_, j) => j !== i)) }
  function updateZonaManutenzione(i: number, v: string) { setZoneManutenzione(p => p.map((z, j) => j === i ? v : z)) }

  function toggleZoneCheck(z: string) { setZoneCheck(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z]) }

  function handleImporto(field: keyof Importi, value: string) {
    setImporti(prev => ({ ...prev, [field]: euroToCents(value) }))
  }

  function handleOrganizzazione(value: string) {
    setOrganizzazione(value)
    // Reset zone check default per fotovoltaico
    if (value === 'fotovoltaico_zone') setZoneCheck(defaultZoneFotov)
    else if (value === 'solo_esterni')  setZoneCheck([])
  }

  // ── Serializza config struttura per il server action ──────────────────────
  const strutturaConfig = useMemo(() => {
    if (!strutturaNecessaria) return null
    switch (organizzazione) {
      case 'singolo_appartamento': return { tipo: 'singolo_appartamento', ...bApp }
      case 'condominio_parco':     return { tipo: 'condominio_parco', scale, appartamentiPerScala: apx, nBox, conEsterno, areeComuni }
      case 'cantiere_strutturato': return { tipo: 'cantiere_strutturato', zone: zonePersonalizzate }
      case 'capannone_industriale': return { tipo: 'capannone_industriale', reparti, nQuadriElettrici: nQuadri, nLocaliTecnici: nLocali, areaEsterna, nUffici, magazzino }
      case 'solo_esterni':         return { tipo: 'solo_esterni', zone: zoneCheck }
      case 'fotovoltaico_zone':    return { tipo: 'fotovoltaico_zone', zone: zoneCheck }
      case 'manutenzione_zone':    return { tipo: 'manutenzione_zone', zone: zoneManutenzione.filter(Boolean) }
      case 'altro_personalizzato': return { tipo: 'altro_personalizzato', zone: zonePersonalizzate }
      default: return null
    }
  }, [strutturaNecessaria, organizzazione, bApp, scale, apx, nBox, conEsterno, areeComuni, zonePersonalizzate, reparti, nQuadri, nLocali, areaEsterna, nUffici, magazzino, zoneCheck, zoneManutenzione])

  return (
    <form action={action} className="space-y-6">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      {/* ══ 1. DATI PRINCIPALI ══════════════════════════════════════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Dati principali</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome commessa *</label>
            <input name="nome" required defaultValue={defaultValues?.nome}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <select name="clienteId" defaultValue={defaultValues?.clienteId ?? ''}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">— Nessun cliente —</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stato</label>
              <select name="stato" defaultValue={defaultValues?.stato ?? 'aperta'}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="aperta">Aperta</option>
                <option value="finita">Finita (lavori completati)</option>
                <option value="chiusa">Chiusa (saldata)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Indirizzo cantiere</label>
            <input name="indirizzoCantiere" defaultValue={defaultValues?.indirizzoCantiere}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
      </section>

      {/* ══ 2. CATEGORIA LAVORO ═════════════════════════════════════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Categoria lavoro</h2>
          <p className="text-xs text-gray-400 mt-0.5">Indica la natura tecnica della commessa.</p>
        </div>
        <div className="p-5">
          <input type="hidden" name="categoriaLavoro" value={categoria} />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CATEGORIE.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoria(c.value)}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all',
                  categoria === c.value
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="text-xl">{c.icon}</span>
                <span className={`text-xs font-medium leading-tight ${categoria === c.value ? 'text-blue-700' : 'text-gray-700'}`}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. ORGANIZZAZIONE COMMESSA ══════════════════════════════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Organizzazione commessa</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Indica come è diviso fisicamente il lavoro: appartamento, parco, scale, box, esterni, capannone o zone operative.
          </p>
        </div>
        <div className="p-5">
          <input type="hidden" name="tipoStruttura" value={organizzazione} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ORGANIZZAZIONI.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleOrganizzazione(o.value)}
                className={[
                  'text-left rounded-xl border-2 p-4 transition-all',
                  organizzazione === o.value
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="text-2xl mb-1.5">{o.icon}</div>
                <div className={`text-sm font-semibold ${organizzazione === o.value ? 'text-blue-800' : 'text-gray-900'}`}>
                  {o.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 leading-snug">{o.desc}</div>
              </button>
            ))}
          </div>
          {!isNuova && organizzazione !== 'commessa_semplice' && (
            <p className="mt-3 text-xs text-blue-600">
              Per modificare le zone del cantiere vai alla tab <strong>Struttura</strong>.
            </p>
          )}
        </div>
      </section>

      {/* ══ 4. STRUTTURA CANTIERE INIZIALE + ANTEPRIMA ══════════════════════ */}
      {strutturaNecessaria && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Builder (colonna sinistra) */}
          <section className="rounded-2xl border border-blue-200 bg-blue-50 shadow-sm overflow-hidden">
            <div className="border-b border-blue-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-blue-900">Struttura cantiere iniziale</h2>
              <p className="text-xs text-blue-700 mt-0.5">
                Configura le zone del cantiere. Potrai modificarle dopo la creazione.
              </p>
            </div>
            <div className="p-5 space-y-5">
              {strutturaConfig && (
                <input type="hidden" name="struttura_config" value={JSON.stringify(strutturaConfig)} />
              )}

              {/* ── SINGOLO APPARTAMENTO ── */}
              {organizzazione === 'singolo_appartamento' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Nome appartamento / interno</label>
                    <input
                      value={bApp.nome}
                      onChange={e => setBApp(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Es: Appartamento A1, Int. 3"
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Piano</label>
                    <input
                      value={bApp.piano}
                      onChange={e => setBApp(p => ({ ...p, piano: e.target.value }))}
                      placeholder="Es: Piano 2, Terra, Interrato"
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-1">
                    {[{ label: '📦 Box', key: 'conBox' as const }, { label: '🌿 Esterno', key: 'conEsterno' as const }].map(({ label, key }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={bApp[key]} onChange={e => setBApp(p => ({ ...p, [key]: e.target.checked }))} className="rounded accent-blue-600" />
                        <span className="text-sm text-blue-900">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CONDOMINIO / PARCO ── */}
              {organizzazione === 'condominio_parco' && (
                <div className="space-y-4">
                  {/* Scale */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Scale</label>
                    <div className="space-y-2">
                      {scale.map((nm, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={nm}
                            onChange={e => updateScala(i, e.target.value)}
                            placeholder={`Scala ${String.fromCharCode(65 + i)}`}
                            className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          {scale.length > 1 && (
                            <button type="button" onClick={() => removeScala(i)}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:border-red-200">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {scale.length < 10 && (
                      <button type="button" onClick={addScala} className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900">
                        + Aggiungi scala
                      </button>
                    )}
                  </div>

                  {/* Appartamenti per scala */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
                      Appartamenti per scala: <span className="text-blue-900 font-bold">{apx}</span>
                    </label>
                    <input type="range" min={1} max={20} value={apx} onChange={e => setApx(+e.target.value)} className="w-full accent-blue-600" />
                    <div className="flex justify-between text-xs text-blue-600 mt-0.5"><span>1</span><span>20</span></div>
                  </div>

                  {/* Box */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
                      Numero box: <span className="text-blue-900 font-bold">{nBox}</span>
                    </label>
                    <input type="range" min={0} max={20} value={nBox} onChange={e => setNBox(+e.target.value)} className="w-full accent-blue-600" />
                    <div className="flex justify-between text-xs text-blue-600 mt-0.5"><span>0</span><span>20</span></div>
                  </div>

                  {/* Esterno */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={conEsterno} onChange={e => setConEsterno(e.target.checked)} className="rounded accent-blue-600" />
                    <span className="text-sm text-blue-900">🌿 Esterno</span>
                  </label>

                  {/* Aree comuni */}
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Aree comuni</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AREE_COMUNI_OPT.map(a => (
                        <label key={a} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={areeComuni.includes(a)} onChange={() => toggleAreaComune(a)} className="rounded accent-blue-600 shrink-0" />
                          <span className="text-sm text-blue-900">{a}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CANTIERE STRUTTURATO / ALTRO PERSONALIZZATO ── */}
              {(organizzazione === 'cantiere_strutturato' || organizzazione === 'altro_personalizzato') && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Zone operative</label>
                  {zonePersonalizzate.map((z, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={z.tipo}
                        onChange={e => updateZona(i, 'tipo', e.target.value)}
                        className="w-36 shrink-0 rounded-xl border border-blue-200 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {TIPI_ZONA_OPT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input
                        value={z.nome}
                        onChange={e => updateZona(i, 'nome', e.target.value)}
                        placeholder={`Nome zona ${i + 1}`}
                        className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      {zonePersonalizzate.length > 1 && (
                        <button type="button" onClick={() => removeZona(i)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:border-red-200">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addZona} className="text-xs font-medium text-blue-700 hover:text-blue-900">
                    + Aggiungi zona
                  </button>
                </div>
              )}

              {/* ── CAPANNONE / AREA INDUSTRIALE ── */}
              {organizzazione === 'capannone_industriale' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Reparti</label>
                    <div className="space-y-2">
                      {reparti.map((r, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            value={r}
                            onChange={e => updateReparto(i, e.target.value)}
                            placeholder={`Reparto ${i + 1}`}
                            className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          {reparti.length > 1 && (
                            <button type="button" onClick={() => removeReparto(i)}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:border-red-200">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addReparto} className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900">
                      + Aggiungi reparto
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Quadri elettrici', value: nQuadri, set: setNQuadri, max: 20 },
                      { label: 'Locali tecnici',   value: nLocali, set: setNLocali, max: 10 },
                      { label: 'Uffici',           value: nUffici, set: setNUffici, max: 20 },
                    ].map(({ label, value, set, max }) => (
                      <div key={label}>
                        <label className="block text-xs font-medium text-blue-800 mb-1">{label}</label>
                        <input type="number" min={0} max={max} value={value}
                          onChange={e => set(Math.max(0, +e.target.value))}
                          className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-center focus:border-blue-500 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-5">
                    {[{ label: '🌿 Area esterna', checked: areaEsterna, set: setAreaEsterna }, { label: '📦 Magazzino', checked: magazzino, set: setMagazzino }].map(({ label, checked, set }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="rounded accent-blue-600" />
                        <span className="text-sm text-blue-900">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SOLO ESTERNI ── */}
              {organizzazione === 'solo_esterni' && (
                <div>
                  <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Aree da includere</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONE_ESTERNO_OPT.map(z => (
                      <label key={z} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={zoneCheck.includes(z)} onChange={() => toggleZoneCheck(z)} className="rounded accent-blue-600 shrink-0" />
                        <span className="text-sm text-blue-900">{z}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FOTOVOLTAICO CON ZONE ── */}
              {organizzazione === 'fotovoltaico_zone' && (
                <div>
                  <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Zone impianto</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONE_FOTOV_OPT.map(z => (
                      <label key={z} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={zoneCheck.includes(z)} onChange={() => toggleZoneCheck(z)} className="rounded accent-blue-600 shrink-0" />
                        <span className="text-sm text-blue-900">{z}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MANUTENZIONE SU PIÙ ZONE ── */}
              {organizzazione === 'manutenzione_zone' && (
                <div>
                  <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Zone di intervento</label>
                  <div className="space-y-2">
                    {zoneManutenzione.map((z, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={z}
                          onChange={e => updateZonaManutenzione(i, e.target.value)}
                          placeholder={`Es: Piano 1, Corridoio, Locale macchine…`}
                          className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {zoneManutenzione.length > 1 && (
                          <button type="button" onClick={() => removeZonaManutenzione(i)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:border-red-200">
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addZonaManutenzione} className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900">
                    + Aggiungi zona
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ── ANTEPRIMA (colonna destra) ── */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden self-start">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Anteprima struttura
                {anteprima.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">— {anteprima.length} zon{anteprima.length !== 1 ? 'e' : 'a'}</span>
                )}
              </h2>
            </div>
            <div className="p-5">
              {anteprima.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Nessuna struttura prevista per questa commessa.</p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {anteprima.map((n, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-sm ${n.livello === 1 ? 'pl-5 text-gray-500' : 'font-medium text-gray-800'}`}
                    >
                      <span className="shrink-0">{NODO_ICON[n.tipo] ?? '●'}</span>
                      <span>{n.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      )}

      {/* ══ 5. ISTRUZIONI OPERATIVE (visibili all'operaio) ══════════════════ */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden">
        <div className="border-b border-emerald-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-emerald-900">Istruzioni operative cantiere</h2>
          <p className="text-xs text-emerald-700 mt-0.5">Visibili all&apos;operaio durante tutta la giornata di lavoro.</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-emerald-900">Istruzioni fisse del cantiere</label>
            <textarea name="istruzioniCantiere" rows={3} defaultValue={defaultValues?.istruzioniCantiere}
              className="mt-1 block w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Es: il cliente apre alle 8, si entra dalla porta laterale, il quadro è nel locale tecnico…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-900">Attrezzature / materiale da portare sempre</label>
            <textarea name="attrezzatureNecessarie" rows={2} defaultValue={defaultValues?.attrezzatureNecessarie}
              className="mt-1 block w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="Es: tester digitale, cavo 4mm², fascette, DPI livello 2…" />
          </div>
        </div>
      </section>

      {/* ══ 6. NOTE INTERNE ═════════════════════════════════════════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Note interne</h2>
          <p className="text-xs text-gray-400 mt-0.5">Riservate all&apos;impresa, non visibili all&apos;operaio.</p>
        </div>
        <div className="p-5">
          <textarea name="note" rows={3} defaultValue={defaultValues?.note}
            className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Annotazioni interne, riferimenti, accordi con il cliente…" />
        </div>
      </section>

      {/* ══ 7. IMPORTI ══════════════════════════════════════════════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Importi <span className="text-xs font-normal text-gray-400">(€)</span></h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {[
            { label: 'Importo preventivato', name: 'preventivato',    key: 'preventivato'    as const },
            { label: 'Fatturato al cliente', name: 'fatturato',       key: 'fatturato'       as const },
            { label: 'Costi materiali',      name: 'costiMateriali',  key: 'costiMateriali'  as const },
            { label: 'Costi manodopera',     name: 'costiManodopera', key: 'costiManodopera' as const },
            { label: 'Costi mezzi',          name: 'costiMezzi',      key: 'costiMezzi'      as const },
          ].map(({ label, name, key }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">€</span>
                <input
                  type="number" step="0.01" min="0"
                  name={name}
                  defaultValue={centsToInput(importi[key])}
                  onChange={e => handleImporto(key, e.target.value)}
                  className="block w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Avanzamento */}
        <div className="border-t border-gray-100 px-5 py-4">
          <label className="block text-sm font-medium text-gray-700">Avanzamento lavori (visibile al cliente)</label>
          <div className="mt-2 flex items-center gap-4">
            <input type="range" name="avanzamentoPercentuale" min="0" max="100" step="5"
              defaultValue={defaultValues?.avanzamentoPercentuale ?? 0}
              onChange={e => { const el = document.getElementById('avanz-val'); if (el) el.innerText = `${e.target.value}%` }}
              className="flex-1 accent-blue-600" />
            <span id="avanz-val" className="text-lg font-bold text-blue-600 w-12 text-right">
              {defaultValues?.avanzamentoPercentuale ?? 0}%
            </span>
          </div>
        </div>

        {/* Margine */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Margine attuale</p>
              <p className={`mt-1 text-2xl font-bold ${margine >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatEuro(margine)}
                {importi.preventivato > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({margine >= 0 ? '+' : ''}{Math.round((margine / importi.preventivato) * 100)}%)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Avanzamento fatturato</p>
              <p className="mt-1 text-lg font-semibold text-gray-700">{avanzamento}%</p>
              <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${avanzamento}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Checklist adempimenti (solo modifica) */}
      {!isNuova && tipiLavoro.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Checklist adempimenti</h2>
            <p className="text-xs text-gray-400 mt-0.5">Collega un tipo di lavoro per applicare automaticamente la checklist.</p>
          </div>
          <div className="p-5">
            <select name="tipoLavoroId" defaultValue={defaultValues?.tipoLavoroId ?? ''}
              className="block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">— Nessun tipo di lavoro —</option>
              {tipiLavoro.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </section>
      )}

      {/* In nuova commessa: tipoLavoroId non mostrato (l'utente può impostarlo dopo da Note & Modifica) */}
      {isNuova && <input type="hidden" name="tipoLavoroId" value="" />}

      {/* ══ SUBMIT ══════════════════════════════════════════════════════════ */}
      <div className="flex gap-3">
        <button type="submit"
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm">
          {isNuova ? 'Crea commessa' : 'Salva modifiche'}
        </button>
        <Link href="/impresa/commesse"
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </Link>
      </div>
    </form>
  )
}
