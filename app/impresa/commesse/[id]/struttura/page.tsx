import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { requireImpresaOUfficio } from '@/lib/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { StrutturaTree } from './StrutturaTree'

type NodoFlat = {
  id: string
  tipo: string
  nome: string
  codice: string | null
  piano: string | null
  interno: string | null
  attivo: boolean
  ordinamento: number
  parentId: string | null
}

type NodoTree = NodoFlat & { children: NodoTree[] }

function buildTree(nodi: NodoFlat[]): NodoTree[] {
  const map = new Map<string, NodoTree>()
  for (const n of nodi) map.set(n.id, { ...n, children: [] })
  const roots: NodoTree[] = []
  for (const n of nodi) {
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(map.get(n.id)!)
    } else {
      roots.push(map.get(n.id)!)
    }
  }
  return roots
}

export default async function StrutturaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireImpresaOUfficio()
  const { id } = await params

  const commessa = await prisma.commessa.findUnique({
    where: { id },
    select: { id: true, nome: true },
  })
  if (!commessa) notFound()

  const nodiFlat = await prisma.cantiereStrutturaNodo.findMany({
    where: { commessaId: id },
    orderBy: [{ ordinamento: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      tipo: true,
      nome: true,
      codice: true,
      piano: true,
      interno: true,
      attivo: true,
      ordinamento: true,
      parentId: true,
    },
  })

  const nodi = buildTree(nodiFlat.map(n => ({ ...n, tipo: n.tipo as string })))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        backHref={`/impresa/commesse/${id}`}
        backLabel={commessa.nome}
        title="Struttura cantiere"
        subtitle={`${nodiFlat.length} zona${nodiFlat.length !== 1 ? 'e' : ''}`}
      />

      <StrutturaTree commessaId={id} nodi={nodi} />
    </div>
  )
}
