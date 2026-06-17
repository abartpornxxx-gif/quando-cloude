import { requireCliente } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import VetrinaClient from './VetrinaClient'

export default async function ServizioClientePage() {
  const { cliente } = await requireCliente()

  const [offerte, commesse] = await Promise.all([
    prisma.offertaCatalogo.findMany({
      where: { attiva: true },
      orderBy: [{ ordine: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, titolo: true, categoria: true, descrizione: true, fotoUrl: true, prezzoDa: true },
    }),
    prisma.commessa.findMany({
      where: { clienteId: cliente.id, stato: 'aperta' },
      select: { id: true, nome: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Servizi aggiuntivi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scopri i servizi disponibili e richiedi un preventivo gratuito
        </p>
      </div>
      <VetrinaClient offerte={offerte} commesse={commesse} />
    </div>
  )
}
