import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import CommesseUfficioList from './CommesseUfficioList'

export default async function UfficioCommessePage() {
  await requireUfficio()

  const commesse = await prisma.commessa.findMany({
    where: { archiviata: false },
    select: {
      id: true,
      nome: true,
      stato: true,
      preventivato: true,
      fatturato: true,
      costiMateriali: true,
      costiManodopera: true,
      cliente: { select: { nome: true } },
      _count: { select: { giornate: true, fattureAttive: true } },
    },
    orderBy: [{ stato: 'asc' }, { nome: 'asc' }],
  })

  const aperte = commesse.filter(c => c.stato === 'aperta').length
  const finite = commesse.filter(c => c.stato === 'finita').length

  return (
    <div>
      <PageHeader
        title="Commesse"
        subtitle={`${aperte} aperte · ${finite} finite`}
      />

      {commesse.length === 0 ? (
        <EmptyState
          title="Nessuna commessa"
          description="Le commesse create da preventivi appariranno qui."
        />
      ) : (
        <CommesseUfficioList commesse={commesse} />
      )}
    </div>
  )
}
