'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, Save, CheckCircle, Smile } from 'lucide-react'
import { MASCOTTE } from '@/lib/mascotte'
import { salvaPersonalizzazioneOperaio } from '@/app/operaio/profilo/actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface Props {
  initialData: {
    avatarMascotte: string | null
    descrizione: string | null
    fraseDivertente: string | null
    hobbies: string | null
    nome: string
    ruolo: string | null
  }
}

export function PersonalizzazioneOperaioForm({ initialData }: Props) {
  const [avatarMascotte, setAvatarMascotte] = useState(initialData.avatarMascotte || 'leone')
  const [descrizione, setDescrizione] = useState(initialData.descrizione || '')
  const [fraseDivertente, setFraseDivertente] = useState(initialData.fraseDivertente || '')
  const [hobbies, setHobbies] = useState(initialData.hobbies || '')
  
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Push notifications PWA state
  const [pushPermission, setPushPermission] = useState<string>('default')
  const [subscribing, setSubscribing] = useState(false)
  const [pushMessage, setPushMessage] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushPermission('unsupported')
      } else {
        setPushPermission(Notification.permission)
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) {
              setPushMessage('✅ Notifiche attive su questo dispositivo')
            }
          })
        }).catch(err => {
          console.warn('Service worker not ready:', err)
        })
      }
    }
  }, [])

  async function handleSubscribe() {
    setSubscribing(true)
    setPushMessage('')
    try {
      if (pushPermission === 'unsupported') {
        setPushMessage('❌ Le notifiche non sono supportate da questo browser.')
        return
      }

      const permission = await Notification.requestPermission()
      setPushPermission(permission)

      if (permission !== 'granted') {
        setPushMessage('❌ Permesso di notifica negato.')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setPushMessage('❌ Errore: Chiave pubblica push non configurata.')
        return
      }

      const convertedKey = urlBase64ToUint8Array(vapidKey)
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      if (response.ok) {
        setPushMessage('✅ Notifiche attivate con successo sul dispositivo!')
      } else {
        setPushMessage('❌ Errore durante la registrazione delle notifiche.')
      }
    } catch (err) {
      console.error('Errore attivazione push:', err)
      setPushMessage('❌ Errore nel configurare le notifiche.')
    } finally {
      setSubscribing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await salvaPersonalizzazioneOperaio({
        avatarMascotte,
        descrizione: descrizione.trim() || null,
        fraseDivertente: fraseDivertente.trim() || null,
        hobbies: hobbies.trim() || null,
      })
      setMessage('✅ Profilo aggiornato con successo!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setMessage('❌ Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  const selectedMascotte = MASCOTTE.find(m => m.id === avatarMascotte) || MASCOTTE[0]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
      {/* Colonna 1: Preview & Form */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">La tua Scheda Professionale</h3>
        
        {/* Card Preview */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-white border-2 border-emerald-500 shadow-sm shrink-0">
              <Image
                src={selectedMascotte.file}
                alt={selectedMascotte.nome}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">{initialData.nome}</h4>
              <p className="text-xs text-emerald-600 font-medium">{initialData.ruolo || 'Operaio Specializzato'}</p>
            </div>
          </div>

          {descrizione && (
            <p className="text-xs text-slate-600 italic bg-white/60 p-2.5 rounded-xl border border-slate-100/50">
              &ldquo;{descrizione}&rdquo;
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
            {hobbies && (
              <div>
                <span className="font-bold text-slate-700 block">⚽ Hobbies & Passioni</span>
                <span>{hobbies}</span>
              </div>
            )}
            {fraseDivertente && (
              <div>
                <span className="font-bold text-slate-700 block">⚡ Frase Simpatica</span>
                <span>{fraseDivertente}</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Descriviti in breve (Bio)</label>
            <textarea
              value={descrizione}
              onChange={e => setDescrizione(e.target.value)}
              placeholder="Es: Tecnico elettro-meccanico appassionato di energie rinnovabili..."
              className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Hobbies / Passioni</label>
              <input
                type="text"
                value={hobbies}
                onChange={e => setHobbies(e.target.value)}
                placeholder="Es: Calcio, Pesca, Musica"
                className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Frase Simpatica / Motto</label>
              <input
                type="text"
                value={fraseDivertente}
                onChange={e => setFraseDivertente(e.target.value)}
                placeholder="Es: Sempre connesso! 🔌"
                className="w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {message && <p className="text-xs font-bold text-center text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? 'Salvataggio...' : 'Salva personalizzazione'}
          </button>
        </form>

        {/* Notifiche Push PWA */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            🔔 Notifiche Push PWA
          </h4>
          <p className="text-[11px] text-gray-500 leading-normal">
            Ricevi notifiche in tempo reale sul tuo dispositivo quando ti vengono assegnati nuovi cantieri o promemoria di lavoro.
          </p>
          
          {pushPermission === 'unsupported' ? (
            <p className="text-[11px] text-amber-600 font-semibold">
              ⚠️ Le notifiche non sono supportate da questo browser o dispositivo (assicurati di aver installato la PWA).
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Stato autorizzazione:</span>
                <span className={`font-bold uppercase ${
                  pushPermission === 'granted' ? 'text-emerald-600' : pushPermission === 'denied' ? 'text-red-500' : 'text-amber-500'
                }`}>
                  {pushPermission === 'granted' ? 'Attive' : pushPermission === 'denied' ? 'Bloccate' : 'Non richieste'}
                </span>
              </div>

              {pushMessage && (
                <p className="text-[11px] font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100/60">
                  {pushMessage}
                </p>
              )}

              {pushPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {subscribing ? 'Attivazione...' : 'Attiva Notifiche Push'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Colonna 2: Mascotte Chooser */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scegli il tuo Avatar Animale</h3>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs max-h-[390px] overflow-y-auto">
          <div className="grid grid-cols-5 gap-2">
            {MASCOTTE.map(m => {
              const isSelected = m.id === avatarMascotte
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAvatarMascotte(m.id)}
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
                      sizes="50px"
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
        </div>
      </div>
    </div>
  )
}
