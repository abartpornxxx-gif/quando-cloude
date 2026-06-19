import Link from 'next/link'
import { salvaMagazziniere } from '../actions'

export default function NuovoMagazzinierePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/impresa/magazzinieri" className="text-sm text-gray-500 hover:text-gray-700">
          ← Magazzinieri
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Nuovo magazziniere</h1>
      </div>

      <form action={salvaMagazziniere} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome *</label>
          <input
            type="text"
            name="nome"
            required
            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">Necessaria per creare l&apos;accesso all&apos;app.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <textarea
            name="note"
            rows={3}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Crea magazziniere
          </button>
          <Link
            href="/impresa/magazzinieri"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
