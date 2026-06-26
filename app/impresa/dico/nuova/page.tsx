import Link from 'next/link';
﻿import { requireImpresa } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import NuovaDiCoForm from './NuovaDiCoForm'

export default async function NuovaDiCoPage() {
  await requireImpresa()

  const commesse = await prisma.commessa.findMany({
    include: {
      cliente: { select: { nome: true, indirizzo: true, codiceFiscale: true } },
    },
    orderBy: { nome: 'asc' },
  })

  const impresaDefault = {
    ragioneSociale: process.env.IMPRESA_RAGIONE_SOCIALE ?? '',
    partitaIva: process.env.IMPRESA_PARTITA_IVA ?? '',
    indirizzo: process.env.IMPRESA_INDIRIZZO ?? '',
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/impresa/dico" className="text-blue-600 hover:text-blue-800 text-sm">‹ DiCo</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuova Dichiarazione di Conformità</h1>
      </div>
      <p className="text-xs text-gray-500 mb-4">DM 37/2008 — art. 7. Seleziona una commessa per precompilare i dati.</p>
      <NuovaDiCoForm commesse={commesse} impresaDefault={impresaDefault} />
    </div>
  )
}
