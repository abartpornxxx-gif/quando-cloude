'use client'

import { useState, useEffect, useRef } from 'react'
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
  Upload,
  Camera,
  Trash2,
  Eye,
  Check,
  MessageCircle,
} from 'lucide-react'
import { MASCOTTE } from '@/lib/mascotte'
import { createClient } from '@/lib/supabase/client'
import { getImpresaProfilo, salvaImpresaProfilo, ripristinaDefaultProfilo } from './actions'

const PALETTE = [
  { name: 'Teal (Default)', hex: '#0f766e' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Slate', hex: '#4b5563' },
]

export default function PersonalizzazionePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'stile'>('info')

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
  const [servizi, setServizi] = useState('Impianti Civili, Manutenzioni, Impianti Industriali')
  const [mostraCertificazioni, setMostraCertificazioni] = useState(true)
  const [certificazioni, setCertificazioni] = useState('ISO 9001, FGAS, FER')
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
        setMostraSitoWeb(p.mostraSitoWeb ?? true)
        setMostraServizi(p.mostraServizi ?? true)
        setServizi(p.servizi || 'Impianti Civili, Manutenzioni, Impianti Industriali')
        setMostraCertificazioni(p.mostraCertificazioni ?? true)
        setCertificazioni(p.certificazioni || 'ISO 9001, FGAS, FER')
        setMostraDescrizione(p.mostraDescrizione ?? true)
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
        servizi,
        mostraCertificazioni,
        certificazioni,
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')
    try {
      const supabase = createClient()
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `impresa-avatars/${fileName}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setMascotteAvatar(publicUrl)
      setMessage('✅ Immagine caricata correttamente!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      console.error('Errore dettagliato caricamento:', err)
      setMessage(`❌ Errore durante il caricamento: ${err.message || err}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveCustomAvatar() {
    setMascotteAvatar('leone')
    setMessage('✅ Avatar personalizzato rimosso.')
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const isCustomAvatar = mascotteAvatar.startsWith('http') || mascotteAvatar.startsWith('/')
  const selectedMascotte = MASCOTTE.find(m => m.id === mascotteAvatar) || MASCOTTE[0]

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header Banner - MATCHING THEME FORMAT */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-slate-700 px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-3 relative z-10 w-full">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Impostazioni &gt; Brand Identity</p>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" size={28} />
            Identità Aziendale
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Configura il volto professionale della tua azienda. Questi dettagli saranno visibili a dipendenti, clienti e partner su tutta la piattaforma QUADRO.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1 (Left): Anteprima Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Eye size={14} className="text-emerald-600" />
            Anteprima Brand Real-Time
          </h2>
          
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden transition-all duration-300">
            {/* Card Content */}
            <div className="p-6 space-y-5">
              {/* Mascot & Brand Header */}
              <div className="flex items-center gap-4">
                {mostraMascotte && (
                  <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-2xl border-2 overflow-hidden bg-slate-50 shrink-0 shadow-sm" style={{ borderColor: colorePrimario }}>
                    <Image
                      src={isCustomAvatar ? mascotteAvatar : selectedMascotte.file}
                      alt={isCustomAvatar ? "Logo Azienda" : selectedMascotte.nome}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {mostraNome && (
                    <h3 className="text-lg font-black text-slate-900 leading-tight truncate" style={{ color: stileCard === 'Minimal' ? '#1e293b' : colorePrimario }}>
                      {nomeImpresa}
                    </h3>
                  )}
                  {mostraSettore && (
                    <p className="text-xs font-bold text-emerald-600 mt-1 uppercase tracking-wide">{settore}</p>
                  )}
                </div>
              </div>

              {/* Descrizione */}
              {mostraDescrizione && descrizione && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {descrizione}
                  </p>
                </div>
              )}

              {/* Informazioni di Contatto */}
              <div className="space-y-3 text-xs text-gray-600 border-t border-gray-100 pt-4">
                {mostraIndirizzo && indirizzo && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <MapPin size={13} style={{ color: colorePrimario }} />
                    </div>
                    <span className="truncate">{indirizzo}</span>
                  </div>
                )}
                {mostraTelefono && telefono && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Phone size={13} style={{ color: colorePrimario }} />
                    </div>
                    <span>{telefono}</span>
                  </div>
                )}
                {mostraEmail && email && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Mail size={13} style={{ color: colorePrimario }} />
                    </div>
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {mostraSitoWeb && sitoWeb && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <Globe size={13} style={{ color: colorePrimario }} />
                    </div>
                    <span className="truncate">{sitoWeb}</span>
                  </div>
                )}
              </div>

              {/* Servizi & Certificazioni (Only in Classico style) */}
              {stileCard === 'Classico' && (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-[11px]">
                  {mostraServizi && (
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <p className="font-bold text-gray-800 mb-1">Servizi principali</p>
                      <ul className="space-y-1 text-gray-500 font-medium">
                        {servizi.split(',').map((s, i) => (
                          <li key={i} className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> {s.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {mostraCertificazioni && (
                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <p className="font-bold text-gray-800 mb-1">Certificazioni</p>
                      <ul className="space-y-1 text-gray-500 font-medium">
                        {certificazioni.split(',').map((c, i) => (
                          <li key={i} className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> {c.trim()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Mascot Details / Motto */}
              {mostraMascotte && mottoTeam && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <MessageCircle size={22} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800">{isCustomAvatar ? "Il nostro team" : selectedMascotte.nome}</p>
                    <p className="text-xs italic text-slate-500 mt-1 font-medium leading-relaxed">&quot;{mottoTeam}&quot;</p>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest font-extrabold">
              Stile Card: {stileCard}
            </div>
          </div>
        </div>

        {/* Column 2 & 3: Avatar Chooser & Form Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Avatar Caricamento & Selezione */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Volto Aziendale (Avatar)</h3>
                <p className="text-xs text-gray-500 mt-1">Carica un logo reale o seleziona uno dei nostri avatar professionali iper-realistici.</p>
              </div>
            </div>

            {/* UPLOAD FOTO SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="md:col-span-4 flex justify-center">
                <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-md shrink-0 flex items-center justify-center">
                  <Image
                    src={isCustomAvatar ? mascotteAvatar : selectedMascotte.file}
                    alt="Corrente"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="md:col-span-8 space-y-3 text-center md:text-left">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Foto Personalizzata (Fotocamera / Galleria)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Carica un logo aziendale o una foto reale per sostituire la mascotte. Puoi scattare direttamente dal cellulare o scegliere un file.
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Upload size={13} />
                    {uploading ? 'Caricamento...' : 'Seleziona Foto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.setAttribute('capture', 'environment')
                      fileInputRef.current?.click()
                    }}
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Camera size={13} />
                    Scatta Foto
                  </button>
                  {isCustomAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomAvatar}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MASCOTTE PICKER */}
            {!isCustomAvatar && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Scegli un Avatar Premium</h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  {MASCOTTE.map(m => {
                    const isSelected = m.id === mascotteAvatar
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMascotteAvatar(m.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden bg-white border transition-all p-1.5 flex items-center justify-center hover:scale-105 ${
                          isSelected ? 'border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-100'
                        }`}
                        title={m.nome}
                      >
                        <div className="relative w-full h-full">
                          <Image
                            src={m.file}
                            alt={m.nome}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        </div>
                        {isSelected && (
                          <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
                            <Check size={8} className="text-white font-bold" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs">
                  <p className="font-bold text-slate-800">{selectedMascotte.nome}</p>
                  <p className="text-slate-500 mt-1 leading-relaxed">{selectedMascotte.descrizione}</p>
                </div>
              </div>
            )}
          </div>

          {/* Form Tabs */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex border-b border-gray-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'info'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                1. Informazioni Profilo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stile')}
                className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'stile'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                2. Layout & Toggles
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'info' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nome Impresa</label>
                      <input
                        type="text"
                        value={nomeImpresa}
                        onChange={e => setNomeImpresa(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Settore di Attività</label>
                      <input
                        type="text"
                        value={settore}
                        onChange={e => setSettore(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Telefono</label>
                      <input
                        type="text"
                        value={telefono}
                        onChange={e => setTelefono(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Indirizzo Sede</label>
                      <input
                        type="text"
                        value={indirizzo}
                        onChange={e => setIndirizzo(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Sito Web</label>
                      <input
                        type="text"
                        value={sitoWeb}
                        onChange={e => setSitoWeb(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Motto del Team / Slogan</label>
                    <input
                      type="text"
                      value={mottoTeam}
                      onChange={e => setMottoTeam(e.target.value)}
                      placeholder="Costruiamo oggi, per un domani migliore..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Servizi Principali (separati da virgola)</label>
                    <input
                      type="text"
                      value={servizi}
                      onChange={e => setServizi(e.target.value)}
                      placeholder="es. Impianti Civili, Manutenzioni..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Certificazioni (separate da virgola)</label>
                    <input
                      type="text"
                      value={certificazioni}
                      onChange={e => setCertificazioni(e.target.value)}
                      placeholder="es. ISO 9001, FGAS..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Descrizione Aziendale</label>
                    <textarea
                      value={descrizione}
                      onChange={e => setDescrizione(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50 focus:bg-white transition-all font-semibold resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Informazioni da mostrare (Toggles) */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Informazioni Visibili su Card</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
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
                        { label: 'Mascotte / Avatar', val: mostraMascotte, set: setMostraMascotte },
                      ].map(t => (
                        <label key={t.label} className="flex items-center justify-between text-xs text-gray-700 font-medium py-1.5 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors">
                          <span>{t.label}</span>
                          <input
                            type="checkbox"
                            checked={t.val}
                            onChange={e => t.set(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Colori e stile */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Colore Primario</h4>
                    <div className="flex flex-wrap gap-3 items-center">
                      {PALETTE.map(p => (
                        <button
                          key={p.hex}
                          type="button"
                          onClick={() => setColorePrimario(p.hex)}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                            colorePrimario === p.hex ? 'border-slate-800 scale-105 shadow-md' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: p.hex }}
                          title={p.name}
                        >
                          {colorePrimario === p.hex && (
                            <Check size={14} className="text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stile card */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Stile Grafico Card</h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {['Classico', 'Compatto', 'Minimal'].map(styleName => (
                        <button
                          key={styleName}
                          type="button"
                          onClick={() => setStileCard(styleName)}
                          className={`py-3 rounded-xl border font-bold transition-all text-center ${
                            stileCard === styleName
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-slate-50'
                          }`}
                        >
                          {styleName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error or Saving feedback message */}
            {message && (
              <div className="mx-6 mb-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-center text-slate-700">
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-gray-100 justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active-press disabled:opacity-50"
              >
                <Undo2 size={13} />
                Ripristina Default
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active-press disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

