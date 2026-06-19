import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/immagini/errore.png"
        width={140}
        height={140}
        alt=""
        className="mb-6 opacity-80 select-none"
        priority
      />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagina non trovata</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        La pagina che stai cercando non esiste o è stata spostata.
      </p>
      <Link
        href="/login"
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        Torna alla home
      </Link>
    </div>
  )
}
