import { PannelloForm } from './PannelloForm'
import { Shield } from 'lucide-react'

export default function PannelloPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">Accesso riservato</h1>
          <p className="text-gray-500 text-sm mt-1">Pannello di controllo piattaforma</p>
        </div>
        <PannelloForm />
      </div>
    </div>
  )
}
