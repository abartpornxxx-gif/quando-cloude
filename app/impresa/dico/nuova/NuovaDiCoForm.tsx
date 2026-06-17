'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { creaDico } from '../actions'

type Commessa = { id: string; nome: string; indirizzoCantiere: string | null; cliente: { nome: string; indirizzo: string | null; codiceFiscale: string | null } | null }

const TIPI_IMPIANTO = [
  'Impianto elettrico civile',
  'Impianto elettrico industriale',
  'Impianto fotovoltaico',
  'Impianto di messa a terra',
  'Impianto di protezione dai fulmini',
  'Impianto di automazione',
  'Altro',
]

const TIPOLOGIE_LAVORI = [
  'Installazione nuovo impianto',
  'Modifica impianto esistente',
  'Ampliamento impianto',
  'Manutenzione straordinaria',
  'Messa a norma',
]

export default function NuovaDiCoForm({
  commesse,
  impresaDefault,
}: {
  commesse: Commessa[]
  impresaDefault: { ragioneSociale: string; partitaIva: string; indirizzo: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errore, setErrore] = useState('')

  const oggi = new Date().toISOString().slice(0, 10)
  const [commessaId, setCommessaId] = useState('')

  const [ragioneSociale, setRagioneSociale] = useState(impresaDefault.ragioneSociale)
  const [partitaIva, setPartitaIva] = useState(impresaDefault.partitaIva)
  const [indirizzoImpresa, setIndirizzoImpresa] = useState(impresaDefault.indirizzo)

  const [committenteNome, setCommittenteNome] = useState('')
  const [committenteIndirizzo, setCommittenteIndirizzo] = useState('')
  const [committenteCodiceFisc, setCommittenteCodiceFisc] = useState('')

  const [indirizzoImpianto, setIndirizzoImpianto] = useState('')
  const [tipoImpianto, setTipoImpianto] = useState(TIPI_IMPIANTO[0])
  const [descrizioneLavori, setDescrizioneLavori] = useState('')
  const [tipologiaLavori, setTipologiaLavori] = useState(TIPOLOGIE_LAVORI[0])
  const [normativa, setNormativa] = useState('CEI 64-8 / DM 37/2008')
  const [materialiComponenti, setMaterialiComponenti] = useState('')
  const [potenzaImpegnata, setPotenzaImpegnata] = useState('')

  const [tecnicoNome, setTecnicoNome] = useState('')
  const [tecnicoAbilitazione, setTecnicoAbilitazione] = useState('')
  const [data, setData] = useState(oggi)

  function autocompletaCommessa(id: string) {
    setCommessaId(id)
    const c = commesse.find(c => c.id === id)
    if (!c) return
    if (c.cliente?.nome) setCommittenteNome(c.cliente.nome)
    if (c.cliente?.indirizzo) setCommittenteIndirizzo(c.cliente.indirizzo)
    if (c.cliente?.codiceFiscale) setCommittenteCodiceFisc(c.cliente.codiceFiscale)
    if (c.indirizzoCantiere) setIndirizzoImpianto(c.indirizzoCantiere)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ragioneSociale.trim() || !committenteNome.trim() || !indirizzoImpianto.trim() || !descrizioneLavori.trim() || !tecnicoNome.trim()) {
      setErrore('Compila tutti i campi obbligatori (*)'); return
    }
    setErrore('')
    startTransition(async () => {
      try {
        const id = await creaDico({
          commessaId: commessaId || undefined,
          ragioneSociale,
          partitaIva: partitaIva || undefined,
          indirizzoImpresa: indirizzoImpresa || undefined,
          committenteNome,
          committenteIndirizzo: committenteIndirizzo || undefined,
          committenteCodiceFisc: committenteCodiceFisc || undefined,
          indirizzoImpianto,
          tipoImpianto,
          descrizioneLavori,
          tipologiaLavori: tipologiaLavori || undefined,
          normativa: normativa || undefined,
          materialiComponenti: materialiComponenti || undefined,
          potenzaImpegnata: potenzaImpegnata || undefined,
          tecnicoNome,
          tecnicoAbilitazione: tecnicoAbilitazione || undefined,
          data,
        })
        router.push(`/impresa/dico/${id}`)
      } catch (err: unknown) {
        setErrore(err instanceof Error ? err.message : 'Errore')
      }
    })
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Commessa collegata */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <label className="block text-sm font-medium mb-1">Commessa collegata (autocompleta i dati)</label>
        <select value={commessaId} onChange={e => autocompletaCommessa(e.target.value)} className={inputCls}>
          <option value="">— Nessuna —</option>
          {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Impresa */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Impresa installatrice</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ragione sociale *</label>
          <input type="text" value={ragioneSociale} onChange={e => setRagioneSociale(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Partita IVA</label>
            <input type="text" value={partitaIva} onChange={e => setPartitaIva(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Indirizzo</label>
            <input type="text" value={indirizzoImpresa} onChange={e => setIndirizzoImpresa(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Committente */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Committente</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nome / Ragione sociale *</label>
          <input type="text" value={committenteNome} onChange={e => setCommittenteNome(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Indirizzo committente</label>
            <input type="text" value={committenteIndirizzo} onChange={e => setCommittenteIndirizzo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Codice fiscale</label>
            <input type="text" value={committenteCodiceFisc} onChange={e => setCommittenteCodiceFisc(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Impianto */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Impianto e lavori</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Indirizzo impianto *</label>
          <input type="text" value={indirizzoImpianto} onChange={e => setIndirizzoImpianto(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo impianto *</label>
            <select value={tipoImpianto} onChange={e => setTipoImpianto(e.target.value)} className={inputCls}>
              {TIPI_IMPIANTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipologia lavori</label>
            <select value={tipologiaLavori} onChange={e => setTipologiaLavori(e.target.value)} className={inputCls}>
              {TIPOLOGIE_LAVORI.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Descrizione lavori eseguiti *</label>
          <textarea
            value={descrizioneLavori}
            onChange={e => setDescrizioneLavori(e.target.value)}
            rows={3}
            placeholder="Descrizione dettagliata dei lavori eseguiti..."
            className={inputCls}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Potenza impegnata (kW)</label>
            <input type="text" value={potenzaImpegnata} onChange={e => setPotenzaImpegnata(e.target.value)} className={inputCls} placeholder="es. 3.3 kW" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Normativa di riferimento</label>
            <input type="text" value={normativa} onChange={e => setNormativa(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Materiali e componenti principali</label>
          <textarea
            value={materialiComponenti}
            onChange={e => setMaterialiComponenti(e.target.value)}
            rows={2}
            placeholder="Elenco materiali, marchi, modelli usati..."
            className={inputCls}
          />
        </div>
      </div>

      {/* Tecnico */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Tecnico responsabile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome e cognome *</label>
            <input type="text" value={tecnicoNome} onChange={e => setTecnicoNome(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">N. abilitazione / iscrizione albo</label>
            <input type="text" value={tecnicoAbilitazione} onChange={e => setTecnicoAbilitazione(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data dichiarazione *</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" required />
        </div>
      </div>

      {errore && <p className="text-red-600 text-sm">{errore}</p>}

      <div className="flex gap-3">
        <a href="/impresa/dico" className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annulla
        </a>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Salvataggio…' : 'Crea DiCo'}
        </button>
      </div>
    </form>
  )
}
