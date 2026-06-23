import { requireUfficio } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import PreventiviUfficioList from './PreventiviUfficioList'

export default async function UfficioPreventiviPage() {
  await requireUfficio()
  const preventivi = await prisma.preventivo.findMany({
    orderBy: { data: 'desc' },
    include: {
      cliente: { select: { nome: true } },
      righe: true,
      commessa: { select: { id: true, nome: true } },
    },
  })

  const bozze = preventivi.filter(p => p.stato === 'bozza').length
  const inviati = preventivi.filter(p => p.stato === 'inviato').length
  const accettati = preventivi.filter(p => p.stato === 'accettato').length

  return (
    <div>
      <PageHeader
        title="Preventivi"
        subtitle={`${accettati} accettati · ${inviati} inviati · ${bozze} bozze`}
        action={<Link href="/ufficio/preventivi/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo</Link>}
      />

      {preventivi.length === 0 ? (
        <EmptyState title="Nessun preventivo" description="Crea il primo preventivo per un cliente."
          action={<Link href="/ufficio/preventivi/nuovo" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">+ Nuovo preventivo</Link>} />
      ) : (
        <PreventiviUfficioList preventivi={preventivi} />
      )}
    </div>
  )
}
