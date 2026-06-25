'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Settings,
  ShieldCheck,
  CheckCircle,
  Undo2,
  Save,
  Sparkles,
} from 'lucide-react'
import { MASCOTTE } from '@/lib/mascotte'
import { getImpresaProfilo, salvaImpresaProfilo, ripristinaDefaultProfilo } from './actions'

const PALETTE = [
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Gray', hex: '#4b5563' },
]

export default function PersonalizzazionePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile State
  const [nomeImpresa, setNomeImpresa] = useState('CreCas Impianti S.r.l.')
  const [settore, setSettore] = useState('Termoidraulica ed Elettrica')
  const [descrizione, setDescrizione] = useState('Da anni leader nel settore dell\'impiantistica civile ed industriale.')
  const [telefono, setTelefono] = useState('+39 06 1234567')
  const [email, setEmail] = useState('info@crecasimpianti.it')
  const [sitoWeb, setSitoWeb] = useState('www.crecasimpianti.it')
  const [indirizzo, setIndirizzo] = useState('Via Roma, 10 - 00100 Roma (RM)')
  const [mascotteAvatar, setMascotteAvatar] = useState('leone')
  const [colorePrimario, setColorePrimario] = useState('#0f766e')
  const [stileCard, setStileCard] = useState('Classico')
  const [mottoTeam, setMottoTeam] = useState('Costruiamo oggi, per un domani migliore.')

  // Visibility Toggles State
  const [mostraNome, setMostraNome] = useState(true)
  const [mostraSettore, setMostraSettore] = useState(true)
  const [mostraIndirizzo, setMostraIndirizzo] = useState(true)
  const [mostraTelefono, setMostraTelefono] = useState(true)
  const [mostraEmail, setMostraEmail] = useState(true)
  const [mostraSitoWeb, setMostraSitoWeb] = useState(true)
  const [mostraServizi, setMostraServizi] = useState(true)
  const [mostraCertificazioni, setMostraCertificazioni] = useState(true)
  const [mostraDescrizione, setMostraDescrizione] = useState(true)
  const [mostraValori, setMostraValori] = useState(true)
  const [mostraMascotte, setMostraMascotte] = useState(true)

  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const p = await getImpresaProfilo()
        setNomeImpresa(p.nomeImpresa)
        setSettore(p.settore)
        setDescrizione(p.descrizione)
        setTelefono(p.telefono)
        setEmail(p.email)
        setSitoWeb(p.sitoWeb)
        setIndirizzo(p.indirizzo)
        setMascotteAvatar(p.mascotteAvatar)
        setColorePrimario(p.colorePrimario)
        setStileCard(p.stileCard)
        setMottoTeam(p.mottoTeam)
        setMostraNome(p.mostraNome)
        setMostraSettore(p.mostraSettore)
        setMostraIndirizzo(p.mostraIndirizzo)
        setMostraTelefono(p.mostraTelefono)
        setMostraEmail(p.mostraEmail)
        setMostraSitoWeb(p.mostraSitoWeb)
        setMostraServizi(p.mostraServizi)
        setMostraCertificazioni(p.mostraCertificazioni)
        setMostraDescrizione(p.mostraDescrizione)
        setMostraValori(p.mostraValori)
        setMostraMascotte(p.mostraMascotte)
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      await salvaImpresaProfilo({
        nomeImpresa,
        settore,
        descrizione,
        telefono,
        email,
        sitoWeb,
        indirizzo,
        mascotteAvatar,
        colorePrimario,
        stileCard,
        mottoTeam,
        mostraNome,
        mostraSettore,
        mostraIndirizzo,
        mostraTelefono,
        mostraEmail,
        mostraSitoWeb,
        mostraServizi,
        mostraCertificazioni,
        mostraDescrizione,
        mostraValori,
        mostraMascotte,
      })
      setMessage('✅ Impostazioni salvate correttamente!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setMessage('❌ Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Ripristinare le impostazioni predefinite?')) return
    setSaving(true)
    try {
      await ripristinaDefaultProfilo()
      window.location.reload()
    } catch (err) {
      console.error(err)
      setMessage('❌ Errore durante il ripristino.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const selectedMascotte = MASCOTTE.find(m => m.id === mascotteAvatar) || MASCOTTE[0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span>Impostazioni</span>
        <span>&gt;</span>
        <span>Profilo impresa</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-medium">Personalizza il profilo impresa</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Sparkles className="text-amber-500" size={24} />
            Personalizza il profilo impresa
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configura l&apos;aspetto e le informazioni che vuoi mostrare ai tuoi clienti, partner e collaboratori.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button type="button" className="px-4 py-2 text-sm font-semibold border-b-2 border-emerald-600 text-emerald-700">
          Profilo pubblico
        </button>
        <button type="button" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          Impostazioni interne
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Anteprima */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Anteprima profilo impresa</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300">
            {/* Card Content */}
            <div className="p-5 space-y-4">
              {/* Mascot & Brand Header */}
              <div className="flex items-center gap-4">
                {mostraMascotte && (
                  <div className="relative h-20 w-20 rounded-full border-4 overflow-hidden bg-slate-50 shrink-0" style={{ borderColor: colorePrimario }}>
                    <Image
                      src={selectedMascotte.file}
                      alt={selectedMascotte.nome}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  {mostraNome && (
                    <h3 className="text-lg font-black text-slate-800 leading-tight" style={{ color: stileCard === 'Minimal' ? '#1e293b' : colorePrimario }}>
                      {nomeImpresa}
                    </h3>
                  )}
                  {mostraSettore && (
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">{settore}</p>
                  )}
                </div>
              </div>

              {/* Descrizione */}
              {mostraDescrizione && descrizione && (
                <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                  {descrizione}
                </p>
              )}

              {/* Informazioni di Contatto */}
              <div className="space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                {mostraIndirizzo && indirizzo && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} style={{ color: colorePrimario }} className="shrink-0" />
                    <span className="truncate">{indirizzo}</span>
                  </div>
                )}
                {mostraTelefono && telefono && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} style={{ color: colorePrimario }} className="shrink-0" />
                    <span>{telefono}</span>
                  </div>
                )}
                {mostraEmail && email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} style={{ color: colorePrimario }} className="shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {mostraSitoWeb && sitoWeb && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} style={{ color: colorePrimario }} className="shrink-0" />
                    <span>{sitoWeb}</span>
                  </div>
                )}
              </div>

              {/* Servizi & Certificazioni (Only in Classico style) */}
              {stileCard === 'Classico' && (
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-[11px]">
                  {mostraServizi && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">Servizi principali</p>
                      <ul className="space-y-1 text-gray-500">
                        <li className="flex items-center gap-1">✔ Impianti Civili</li>
                        <li className="flex items-center gap-1">✔ Manutenzioni</li>
                      </ul>
                    </div>
                  )}
                  {mostraCertificazioni && (
                    <div>
                      <p className="font-bold text-gray-700 mb-1">Certificazioni</p>
                      <ul className="space-y-1 text-gray-500">
                        <li className="flex items-center gap-1">✔ ISO 9001</li>
                        <li className="flex items-center gap-1">✔ FGAS</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Mascot Details / Motto */}
              {mostraMascotte && mottoTeam && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2.5 mt-2">
                  <div className="text-base shrink-0">💬</div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-700">{selectedMascotte.nome}</p>
                    <p className="text-[11px] italic text-slate-500 mt-0.5">&quot;{mottoTeam}&quot;</p>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer for visual style review */}
            <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-wider font-bold">
              Stile Card: {stileCard}
            </div>
          </div>
        </div>

        {/* Column 2: Mascotte Chooser */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Scegli la mascotte del profilo</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-md max-h-[560px] overflow-y-auto space-y-3">
            <p className="text-xs text-gray-400">La mascotte rappresenterà la tua impresa nelle intestazioni, nei documenti e nel portale clienti.</p>
            
            <div className="grid grid-cols-4 gap-2">
              {MASCOTTE.map(m => {
                const isSelected = m.id === mascotteAvatar
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMascotteAvatar(m.id)}
                    className={`relative aspect-square rounded-xl overflow-hidden bg-slate-50 border-2 transition-all p-1 flex items-center justify-center hover:scale-105 ${
                      isSelected ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-100'
                    }`}
                    title={m.nome}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={m.file}
                        alt={m.nome}
                        fill
                        sizes="60px"
                        className="object-contain"
                      />
                    </div>
                    {isSelected && (
                      <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle size={8} className="fill-white text-emerald-500" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
              <p className="font-bold text-slate-700">{selectedMascotte.nome}</p>
              <p className="text-slate-500 mt-1">{selectedMascotte.descrizione}</p>
            </div>
          </div>
        </div>

        {/* Column 3: Personalizzazione controlli */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Personalizza la tua card</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-md space-y-5">
            
            {/* Informazioni da mostrare (Toggles) */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informazioni da mostrare</p>
              
              <div className="space-y-2">
                {[
                  { label: 'Nome impresa', val: mostraNome, set: setMostraNome },
                  { label: 'Settore di attività', val: mostraSettore, set: setMostraSettore },
                  { label: 'Indirizzo', val: mostraIndirizzo, set: setMostraIndirizzo },
                  { label: 'Telefono', val: mostraTelefono, set: setMostraTelefono },
                  { label: 'Email', val: mostraEmail, set: setMostraEmail },
                  { label: 'Sito web', val: mostraSitoWeb, set: setMostraSitoWeb },
                  { label: 'Servizi principali', val: mostraServizi, set: setMostraServizi },
                  { label: 'Certificazioni', val: mostraCertificazioni, set: setMostraCertificazioni },
                  { label: 'Descrizione aziendale', val: mostraDescrizione, set: setMostraDescrizione },
                  { label: 'Mascotte e Motto', val: mostraMascotte, set: setMostraMascotte },
                ].map(t => (
                  <label key={t.label} className="flex items-center justify-between text-xs text-gray-700 font-medium py-0.5 cursor-pointer">
                    <span>{t.label}</span>
                    <input
                      type="checkbox"
                      checked={t.val}
                      onChange={e => t.set(e.target.checked)}
                      className="h-4 w-8 rounded-full border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Inputs editable values */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dati testuali</p>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-500 mb-1">Motto del team</label>
                  <input
                    type="text"
                    value={mottoTeam}
                    onChange={e => setMottoTeam(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">Descrizione</label>
                  <textarea
                    value={descrizione}
                    onChange={e => setDescrizione(e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Colori e stile */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Colori e stile</p>
              
              {/* Palette */}
              <div className="flex gap-2 items-center">
                {PALETTE.map(p => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setColorePrimario(p.hex)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorePrimario === p.hex ? 'border-black' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>

              {/* Stile card */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                {['Classico', 'Compatto', 'Minimal'].map(styleName => (
                  <button
                    key={styleName}
                    type="button"
                    onClick={() => setStileCard(styleName)}
                    className={`py-1.5 rounded-lg border-2 text-center font-bold transition-all ${
                      stileCard === styleName
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {styleName}
                  </button>
                ))}
              </div>
            </div>

            {/* Saving feedback message */}
            {message && <p className="text-xs font-bold text-center mt-2">{message}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <Undo2 size={12} />
                Ripristina default
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md disabled:opacity-50"
              >
                <Save size={12} />
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
