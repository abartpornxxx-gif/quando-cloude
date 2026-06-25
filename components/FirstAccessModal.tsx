'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MASCOTTE, generaBioMascotte } from '@/lib/mascotte'
import { completaPrimoAccesso, getMascotteOccupate } from '@/app/actions/first-access'
import { ShieldCheck, Sparkles, Smile, KeyRound, Award, Paintbrush, ArrowRight, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  userRole: 'operaio' | 'magazziniere' | 'ufficio'
  userEmail: string
  userName: string
}

export function FirstAccessModal({ userRole, userEmail, userName }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  
  // Step 1: Password Change
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passError, setPassError] = useState<string | null>(null)

  // Step 2: Profile (All roles)
  const [note, setNote] = useState('')
  
  // Step 2: Mascot (Operaio only)
  const [selectedMascot, setSelectedMascot] = useState('leone')
  const [selectedColor, setSelectedColor] = useState('giallo')
  const [descrizione, setDescrizione] = useState('')
  const [fraseDivertente, setFraseDivertente] = useState('')
  const [hobbies, setHobbies] = useState('')

  // Occupied combinations state (format: "mascotId_color")
  const [occupiedMascots, setOccupiedMascots] = useState<string[]>([])

  useEffect(() => {
    // Carica le combinazioni occupate dal DB
    if (userRole === 'operaio') {
      getMascotteOccupate().then(res => {
        setOccupiedMascots(res)
      }).catch(err => {
        console.error('Errore nel caricamento delle mascotte occupate:', err)
      })
    }
  }, [userRole])

  const colors = [
    { id: 'giallo', label: 'Giallo', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
    { id: 'verde', label: 'Verde', bg: 'bg-green-500', ring: 'ring-green-500' },
    { id: 'blu', label: 'Blu', bg: 'bg-blue-600', ring: 'ring-blue-600' },
    { id: 'rosso', label: 'Rosso', bg: 'bg-red-500', ring: 'ring-red-500' }
  ]

  // Rileva se una combinazione è in uso
  const checkInUso = (mascot: string, color: string) => {
    return occupiedMascots.includes(`${mascot}_${color}`)
  }

  // Genera bio divertente
  function handleGenerateBio() {
    const funnyBio = generaBioMascotte(userName, selectedMascot, selectedColor)
    setDescrizione(funnyBio)
  }

  // Gestione step 1: validazione e cambio password
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPassError(null)

    if (password.length < 6) {
      setPassError('La password deve essere di almeno 6 caratteri.')
      return
    }

    if (password !== confirmPassword) {
      setPassError('Le password non coincidono.')
      return
    }

    // Se l'utente è operaio o magazziniere/ufficio, passiamo allo step 2
    setStep(2)
  }

  // Gestione step 2: invio dati finali e aggiornamento db
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPassError(null)

    // Se operaio, controlliamo che la combinazione non sia occupata
    if (userRole === 'operaio') {
      if (checkInUso(selectedMascot, selectedColor)) {
        setPassError('La combinazione di mascotte e colore è già in uso. Scegli un\'altra o cambia colore!')
        return
      }
    }

    startTransition(async () => {
      try {
        // 1. Aggiorna Supabase Auth password
        const supabase = createClient()
        const { error: authError } = await supabase.auth.updateUser({
          password: password
        })

        if (authError) {
          throw new Error(`Errore aggiornamento password auth: ${authError.message}`)
        }

        // 2. Salva profilo in QUADRO e disattiva primoAccesso
        const res = await completaPrimoAccesso({
          role: userRole,
          email: userEmail,
          note: userRole !== 'operaio' ? note.trim() : undefined,
          avatarMascotte: userRole === 'operaio' ? selectedMascot : undefined,
          coloreMascotte: userRole === 'operaio' ? selectedColor : undefined,
          descrizione: userRole === 'operaio' ? descrizione.trim() : undefined,
          fraseDivertente: userRole === 'operaio' ? fraseDivertente.trim() : undefined,
          hobbies: userRole === 'operaio' ? hobbies.trim() : undefined,
        })

        if (res.success) {
          router.refresh()
        }
      } catch (err: any) {
        console.error(err)
        setPassError(err.message || 'Si è verificato un errore durante l\'attivazione.')
      }
    })
  }

  // Definizione dei colori del tema in base al ruolo
  const theme = {
    operaio: {
      accent: 'emerald',
      bgGradient: 'from-emerald-950 to-slate-950',
      btn: 'bg-emerald-600 hover:bg-emerald-500 ring-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-950 text-emerald-300'
    },
    magazziniere: {
      accent: 'amber',
      bgGradient: 'from-amber-950 to-slate-950',
      btn: 'bg-amber-600 hover:bg-amber-500 ring-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      badge: 'bg-amber-950 text-amber-300'
    },
    ufficio: {
      accent: 'blue',
      bgGradient: 'from-blue-950 to-slate-950',
      btn: 'bg-blue-600 hover:bg-blue-500 ring-blue-500',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      badge: 'bg-blue-950 text-blue-300'
    }
  }[userRole]

  const activeMascotObj = MASCOTTE.find(m => m.id === selectedMascot) || MASCOTTE[0]

  return (
    <div className="fixed inset-0 z-99 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-2xl bg-gradient-to-b ${theme.bgGradient} border ${theme.border} rounded-3xl overflow-hidden shadow-2xl transition-all duration-300`}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-lg font-black text-white leading-tight tracking-tight">Benvenuto su QUADRO</h2>
              <p className="text-xs text-white/50">Configura la tua area personale per iniziare a lavorare</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${theme.badge}`}>
            {userRole}
          </span>
        </div>

        {/* Corpo Modal */}
        <div className="p-6">
          {passError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <XCircle size={16} className="shrink-0 text-red-400" />
              <span>{passError}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="text-center space-y-1.5 py-2">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border ${theme.border} text-white/80`}>
                  <KeyRound size={22} />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Imposta la tua Password Personale</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  La password provvisoria fornita dall&apos;amministratore deve essere cambiata obbligatoriamente al primo accesso.
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">Nuova Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">Conferma Nuova Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className={`w-full max-w-xs mx-auto rounded-xl ${theme.btn} text-white font-bold py-3 text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-black/20`}
                >
                  Procedi al Profilo
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalSubmit} className="space-y-5">
              <div className="text-center space-y-1.5 py-1">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/5 border ${theme.border} text-white/80`}>
                  {userRole === 'operaio' ? <Paintbrush size={20} /> : <ShieldCheck size={20} />}
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Completa la tua Scheda Profilo</h3>
                <p className="text-xs text-white/50">
                  {userRole === 'operaio' 
                    ? 'Scegli la tua mascotte e colore per personalizzare il tuo avatar ed essere unico!'
                    : 'Aggiungi alcune note o informazioni personali se desideri.'}
                </p>
              </div>

              {userRole === 'operaio' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Anteprima scheda */}
                  <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`relative h-12 w-12 rounded-xl overflow-hidden bg-white/10 border border-white/20 shrink-0`}>
                        <Image
                          src={activeMascotObj.file}
                          alt={activeMascotObj.nome}
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{userName}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>Operaio</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-white/70 font-semibold bg-white/5 px-2 py-1 rounded-lg">
                      <span>Casco:</span>
                      <span className="capitalize">{selectedColor}</span>
                    </div>

                    {descrizione && (
                      <p className="text-[10px] text-white/60 italic leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                        &ldquo;{descrizione}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Scelta Mascotte */}
                  <div className="md:col-span-8 space-y-4">
                    {/* Griglia Mascotte */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/50 uppercase mb-1.5">Mascotte/Avatar</label>
                      <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-black/20 border border-white/5 rounded-xl">
                        {MASCOTTE.map(m => {
                          const isSel = m.id === selectedMascot
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedMascot(m.id)}
                              className={`relative aspect-square rounded-lg p-1 transition-all ${
                                isSel ? 'bg-white/10 border border-white/30 scale-105' : 'bg-transparent border border-transparent opacity-65 hover:opacity-100'
                              }`}
                              title={m.nome}
                            >
                              <div className="relative w-full h-full">
                                <Image src={m.file} alt={m.nome} fill sizes="30px" className="object-contain" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Scelta Colore Casco con vincolo di unicità */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/50 uppercase mb-1.5">Colore del Casco (Unico per Mascotte)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {colors.map(col => {
                          const inUso = checkInUso(selectedMascot, col.id)
                          const isSelectedColor = col.id === selectedColor
                          return (
                            <button
                              key={col.id}
                              type="button"
                              disabled={inUso}
                              onClick={() => setSelectedColor(col.id)}
                              className={`relative flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                                inUso 
                                  ? 'border-white/5 bg-white/5 text-white/30 cursor-not-allowed'
                                  : isSelectedColor
                                    ? `border-white/40 bg-white/10 text-white`
                                    : 'border-white/10 bg-transparent text-white/70 hover:bg-white/5'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${col.bg}`}></span>
                                {col.label}
                              </span>
                              {inUso && <span className="text-[8px] bg-red-950 border border-red-500/20 text-red-400 px-1 py-0.5 rounded uppercase">Uso</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Bio suggestions and text */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <label className="block text-[10px] font-bold text-white/50 uppercase">Descrizione / Bio divertente</label>
                        <button
                          type="button"
                          onClick={handleGenerateBio}
                          className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${theme.text} hover:opacity-85`}
                        >
                          <Sparkles size={10} />
                          Genera Bio Divertente
                        </button>
                      </div>
                      <textarea
                        value={descrizione}
                        onChange={e => setDescrizione(e.target.value)}
                        placeholder="Usa il generatore magico o scrivi una descrizione divertente..."
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Hobbies / Passioni</label>
                        <input
                          type="text"
                          value={hobbies}
                          onChange={e => setHobbies(e.target.value)}
                          placeholder="es. Calcio, Pesca, Gaming"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Frase Simpatica / Motto</label>
                        <input
                          type="text"
                          value={fraseDivertente}
                          onChange={e => setFraseDivertente(e.target.value)}
                          placeholder="es. Non si molla mai! 💪"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">Note personali / Informazioni</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Note, preferenze o altre informazioni..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-white/10 hover:bg-white/5 text-white/80 px-4 py-2.5 text-xs font-semibold"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={`flex-1 sm:flex-none rounded-xl ${theme.btn} text-white font-bold px-6 py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-black/20 disabled:opacity-50`}
                >
                  {pending ? 'Salvataggio...' : 'Completa Registrazione'}
                  <CheckCircle size={14} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
